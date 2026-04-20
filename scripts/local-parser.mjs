import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import bplist from 'bplist-parser'
import multer from 'multer'
import plist from 'plist'
import yauzl from 'yauzl'

const port = Number(process.env.PORT || 8787)
const upload = multer({
  dest: path.join(os.tmpdir(), 'mvp-forge-ipa-uploads'),
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024,
  },
})

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'mvp-forge-local-parser',
    accepts: ['.ipa'],
  })
})

app.post('/parse-ipa', upload.single('file'), async (request, response) => {
  const file = request.file

  if (!file) {
    response.status(400).json({ error: 'Missing file field named "file".' })
    return
  }

  try {
    const result = await parseIpa(file.path, file.originalname, file.size)
    response.json(result)
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await fs.rm(file.path, { force: true })
  }
})

app.listen(port, '127.0.0.1', () => {
  console.log(`MVP Forge local parser listening on http://127.0.0.1:${port}`)
})

function openZip(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) reject(error ?? new Error('Unable to open IPA zip.'))
      else resolve(zip)
    })
  })
}

function readEntry(zip, entry, maxBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    if (entry.uncompressedSize > maxBytes) {
      resolve(Buffer.alloc(0))
      return
    }

    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error(`Unable to read ${entry.fileName}`))
        return
      }

      const chunks = []
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  })
}

function parsePlistBuffer(buffer) {
  if (!buffer.length) return null

  const textStart = buffer.toString('utf8', 0, Math.min(buffer.length, 32))
  if (textStart.includes('<?xml') || textStart.includes('<plist')) {
    return plist.parse(buffer.toString('utf8'))
  }

  const parsed = bplist.parseBuffer(buffer)
  return parsed?.[0] ?? null
}

function extractProvisionProfile(buffer) {
  const text = buffer.toString('utf8')
  const start = text.indexOf('<?xml')
  const end = text.indexOf('</plist>')
  if (start === -1 || end === -1) return null

  try {
    return plist.parse(text.slice(start, end + '</plist>'.length))
  } catch {
    return null
  }
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function topEntries(map, limit = 16) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

function collectInfoPlistFacts(info) {
  if (!info || typeof info !== 'object') return {}

  const urlTypes = Array.isArray(info.CFBundleURLTypes) ? info.CFBundleURLTypes : []
  const schemes = urlTypes.flatMap((item) =>
    Array.isArray(item?.CFBundleURLSchemes) ? item.CFBundleURLSchemes : [],
  )

  const permissions = Object.entries(info)
    .filter(([key]) => key.endsWith('UsageDescription'))
    .map(([key, value]) => ({ key, value: String(value) }))

  const skAdNetworkItems = Array.isArray(info.SKAdNetworkItems)
    ? info.SKAdNetworkItems.length
    : 0

  return {
    displayName:
      info.CFBundleDisplayName || info.CFBundleName || info.CFBundleExecutable || null,
    bundleId: info.CFBundleIdentifier || null,
    version: info.CFBundleShortVersionString || null,
    build: info.CFBundleVersion || null,
    minimumOS: info.MinimumOSVersion || null,
    executable: info.CFBundleExecutable || null,
    deviceFamilies: info.UIDeviceFamily || [],
    supportedOrientations: info.UISupportedInterfaceOrientations || [],
    urlSchemes: schemes,
    permissions,
    skAdNetworkItems,
    ats: info.NSAppTransportSecurity || null,
  }
}

function detectEngine({ entries, frameworks, dylibs }) {
  const names = entries.join('\n').toLowerCase()
  const joinedFrameworks = frameworks.join('\n').toLowerCase()
  const joinedDylibs = dylibs.join('\n').toLowerCase()

  if (
    joinedFrameworks.includes('unityframework') ||
    names.includes('/data/managed/') ||
    names.includes('globalgamemanagers')
  ) {
    return 'Unity'
  }

  if (names.includes('cocos') || joinedDylibs.includes('cocos')) {
    return 'Cocos'
  }

  if (names.includes('ue4') || joinedFrameworks.includes('unreal')) {
    return 'Unreal'
  }

  if (joinedFrameworks.includes('flutter') || names.includes('app.framework/flutter')) {
    return 'Flutter'
  }

  if (joinedFrameworks.includes('react') || names.includes('main.jsbundle')) {
    return 'React Native'
  }

  return 'Unknown'
}

async function parseIpa(filePath, originalName, size) {
  const zip = await openZip(filePath)
  const extensions = new Map()
  const directories = new Map()
  const entries = []
  const frameworks = new Set()
  const dylibs = new Set()
  const interestingFiles = []
  const localizations = new Set()
  let entryCount = 0
  let uncompressedBytes = 0
  let appRoot = ''
  let infoPlist = null
  let provision = null

  return new Promise((resolve, reject) => {
    zip.readEntry()

    zip.on('entry', async (entry) => {
      try {
        entryCount += 1
        uncompressedBytes += entry.uncompressedSize || 0
        const name = entry.fileName
        entries.push(name)

        if (!appRoot) {
          const match = name.match(/^(Payload\/[^/]+\.app\/)/)
          if (match) appRoot = match[1]
        }

        if (name.endsWith('/')) {
          zip.readEntry()
          return
        }

        const ext = path.extname(name).toLowerCase() || '(none)'
        increment(extensions, ext)

        const relative = appRoot && name.startsWith(appRoot) ? name.slice(appRoot.length) : name
        const firstDir = relative.split('/')[0]
        if (firstDir && firstDir !== relative) increment(directories, firstDir)

        const framework = name.match(/Frameworks\/([^/]+\.framework)\//)?.[1]
        if (framework) frameworks.add(framework)

        if (name.endsWith('.dylib')) dylibs.add(path.basename(name))

        const lproj = name.match(/([^/]+\.lproj)\//)?.[1]
        if (lproj) localizations.add(lproj)

        if (/Info\.plist$/.test(name) && /Payload\/[^/]+\.app\/Info\.plist$/.test(name)) {
          infoPlist = parsePlistBuffer(await readEntry(zip, entry))
        }

        if (name.endsWith('embedded.mobileprovision')) {
          provision = extractProvisionProfile(await readEntry(zip, entry, 4_000_000))
        }

        if (
          interestingFiles.length < 200 &&
          /\.(json|plist|strings|txt|xml|csv|db|sqlite|lua|jsbundle)$/i.test(name)
        ) {
          interestingFiles.push(name)
        }

        zip.readEntry()
      } catch (error) {
        reject(error)
      }
    })

    zip.on('end', () => {
      const info = collectInfoPlistFacts(infoPlist)
      const frameworkList = [...frameworks].sort()
      const dylibList = [...dylibs].sort()
      const engine = detectEngine({
        entries,
        frameworks: frameworkList,
        dylibs: dylibList,
      })

      resolve({
        file: {
          name: originalName,
          size,
          sizeMB: Number((size / (1024 * 1024)).toFixed(2)),
        },
        package: info,
        signing: provision
          ? {
              appIdName: provision.AppIDName || null,
              teamName: provision.TeamName || null,
              creationDate: provision.CreationDate || null,
              expirationDate: provision.ExpirationDate || null,
              entitlements: provision.Entitlements || {},
            }
          : null,
        structure: {
          appRoot,
          entryCount,
          uncompressedMB: Number((uncompressedBytes / (1024 * 1024)).toFixed(2)),
          engine,
          topExtensions: topEntries(extensions),
          topDirectories: topEntries(directories),
          frameworks: frameworkList.slice(0, 80),
          dylibs: dylibList.slice(0, 80),
          localizations: [...localizations].sort(),
          interestingFiles,
        },
        analysisHints: buildHints({ info, engine, frameworkList, interestingFiles }),
      })
    })

    zip.on('error', reject)
  })
}

function buildHints({ info, engine, frameworkList, interestingFiles }) {
  const hints = []

  if (engine !== 'Unknown') hints.push(`Likely engine: ${engine}.`)
  if (info.permissions?.length) {
    hints.push(`Permission prompts: ${info.permissions.map((item) => item.key).join(', ')}.`)
  }
  if (info.skAdNetworkItems) {
    hints.push(`Contains ${info.skAdNetworkItems} SKAdNetwork items, suggesting paid UA attribution.`)
  }
  if (frameworkList.some((name) => /firebase|adjust|appsflyer|bugly|facebook/i.test(name))) {
    hints.push('Marketing, analytics, crash, or attribution SDKs are visible in frameworks.')
  }
  if (interestingFiles.some((name) => /shop|store|iap|pay|product/i.test(name))) {
    hints.push('Readable file names suggest shop, IAP, or monetization configuration.')
  }
  if (interestingFiles.some((name) => /level|stage|battle|enemy|hero|skill/i.test(name))) {
    hints.push('Readable file names suggest gameplay configuration tables.')
  }

  return hints
}
