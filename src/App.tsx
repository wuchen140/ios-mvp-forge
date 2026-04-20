import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './App.css'

type ViewKey = 'deconstruct' | 'brief' | 'agents' | 'review'
type RunState = 'idle' | 'running' | 'done'
type Language = 'zh' | 'en'
type FileKind = 'ipa' | 'store' | 'video' | 'supporting'
type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'qwen'
  | 'openrouter'
  | 'custom'
type ProviderMode = 'openai-compatible' | 'anthropic' | 'gemini'

type UploadedFile = {
  id: string
  name: string
  kind: FileKind
  size: string
  file?: File
}

type ProviderConfig = {
  label: string
  endpoint: string
  model: string
  mode: ProviderMode
}

type AnalysisResult = {
  loop?: string[]
  modules?: [string, string, string][]
  economyRows?: string[][]
  opportunities?: string[]
  briefStatement?: string
  status?: string
}

const assetBase = import.meta.env.BASE_URL
const productImage = `${assetBase}competitor-workstation.jpg`
const phoneImage = `${assetBase}mobile-analysis.jpg`

const initialFiles: UploadedFile[] = [
  {
    id: 'ipa',
    name: 'competitor_build.ipa',
    kind: 'ipa',
    size: '1.8 GB',
  },
  {
    id: 'tf',
    name: 'TestFlight invite or App Store ID',
    kind: 'store',
    size: 'Linked',
  },
  {
    id: 'video',
    name: 'iPhone playtest recording',
    kind: 'video',
    size: '428 MB',
  },
]

const providerDefaults: Record<ProviderId, ProviderConfig> = {
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    mode: 'openai-compatible',
  },
  anthropic: {
    label: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-latest',
    mode: 'anthropic',
  },
  gemini: {
    label: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.5-flash',
    mode: 'gemini',
  },
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    mode: 'openai-compatible',
  },
  qwen: {
    label: 'Qwen / DashScope',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
    mode: 'openai-compatible',
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
    mode: 'openai-compatible',
  },
  custom: {
    label: 'Custom API',
    endpoint: 'https://your-domain.example/v1/chat/completions',
    model: 'your-model',
    mode: 'openai-compatible',
  },
}

const copy = {
  en: {
    brand: 'MVP Forge',
    lab: 'iOS Game Lab',
    nav: {
      deconstruct: '00 Competitor Lab',
      brief: '01 MVP Brief',
      agents: '02 Agent Board',
      review: '03 Review Room',
    },
    pipelineLabel: 'Current pipeline',
    pipeline: 'Package first, innovation second.',
    language: '中文',
    fileKinds: {
      ipa: 'iOS installation package',
      store: 'Store metadata',
      video: '12 min capture',
      supporting: 'Supporting material',
    },
    deconstruct: {
      eyebrow: 'Competitor Deconstruction',
      title: 'iOS mobile game package lab',
      lede:
        'Upload a competitor IPA, TestFlight link, store page, or iPhone recording. The app turns those inputs into system maps, economy notes, numeric clues, and innovation space.',
      actionIdle: 'Start analysis',
      actionRunning: 'Running analysis',
      uploadTitle: 'Feed the competitor',
      uploadCopy:
        'Primary input is the iOS installation package. Supporting inputs improve confidence but do not replace the package.',
      dropStrong: 'Drop .ipa or supporting files',
      dropHint: 'or click to choose files from this machine',
      mapTitle: 'Extracted system map',
      mapCopy:
        'Package Agent groups the visible economy, feature gates, and session structure before any new design is invented.',
      loop: ['First day', 'Combat', 'Growth', 'Live ops'],
      modules: [
        ['System Entrances', 'Battle, hero growth, draw, event, shop', 'blue'],
        ['Economy Chain', 'Gold, stamina, shards, premium currency', 'orange'],
        ['Session Loop', '6-9 min first run, 90 sec pressure window', 'green'],
        ['Monetization Pressure', 'Chapter 3 gold gap, 80-pull safety net', 'red'],
      ],
      economyRows: [
        ['Stamina', '1 point / 6 min', 'Controls session frequency'],
        ['Gold', 'Chapter 3 shortage', 'Creates upgrade bottleneck'],
        ['Draw ticket', '7 day event path', 'Pushes return cadence'],
        ['Hero shard', 'Duplicate conversion', 'Long-term collection pressure'],
      ],
      innovationTitle: 'Innovation space',
      innovationCopy:
        'The system separates competitor facts from new-game bets so the team can innovate without blindly cloning.',
      opportunities: [
        'Shorten first-day system exposure and keep only the battle loop visible.',
        'Replace hard pay pressure with clearer strategy goals and softer resource gates.',
        'Keep the 3-minute combat payoff, but delay heavy growth systems until retention is proven.',
        'Use a light 7-day test event before investing in a full live-ops calendar.',
      ],
      opportunityLabel: 'Opportunity',
      phoneAlt: 'Phone app analysis desk',
    },
    brief: {
      eyebrow: 'MVP Brief',
      title: 'Turn the deconstruction into a testable bet',
      lede:
        'The brief keeps the first prototype small: one core loop, one retention question, and no full live-ops machinery.',
      export: 'Export brief',
      strategyTitle: 'Strategic hypothesis',
      statement:
        "Keep the competitor's short-session combat payoff, reduce early system load, and validate whether a lighter resource loop can create a second-session pull.",
      cards: [
        ['Competitor pain', 'Resource gaps and system stacking appear before players trust the battle loop.'],
        ['Innovation direction', 'Move complexity later and make every first-day upgrade visibly affect combat.'],
        ['MVP must validate', 'Players understand battle and growth goals within five minutes.'],
        ['Do not build yet', 'Full draw pool, guild, heavy events, large roster, polished store.'],
      ],
      scopeTitle: 'Prototype scope',
      checklist: [
        '1 hero, 3 enemies, 1 upgrade path',
        'One soft currency and one stamina-like gate',
        'Three short missions with visible reward change',
        'One retention prompt after the first loss or win',
      ],
    },
    agents: {
      eyebrow: 'Agent Orchestration',
      title: 'Run the work as handoffs, not meetings',
      lede:
        'Each Agent receives a bounded input and returns a reviewable artifact before the next Agent starts.',
      reset: 'Reset board',
      selected: 'Selected Agent',
      imageAlt: 'Gaming competitor analysis workstation',
      requiredInput: 'Required input',
      requiredCopy:
        'Package summary, system entrance map, economy rows, and innovation constraints.',
      expectedOutput: 'Expected output',
      expectedCopy:
        'A structured artifact that the Producer Agent can accept or send back for another run.',
      list: [
        ['Package Agent', 'Extract bundle structure, visible systems, store metadata, and asset hints.', 'Running', 'blue'],
        ['Market Agent', 'Read store page, reviews, ratings, complaints, and monetization signals.', 'Queued', 'orange'],
        ['Core Loop Agent', 'Convert the deconstruction into 10 sec, 30 sec, and 5 min loops.', 'Ready', 'green'],
        ['MVP Scope Agent', 'Split Must, Should, Later, and Never for the first playable build.', 'Ready', 'green'],
        ['Tech Agent', 'Estimate implementation cost and flag package-analysis blind spots.', 'Waiting', 'red'],
        ['Prototype Agent', 'Turn the approved scope into a playable prototype task list.', 'Waiting', 'gray'],
      ],
    },
    review: {
      eyebrow: 'MVP Review',
      title: 'Decide whether this prototype deserves more spend',
      lede:
        'Review Agents merge playtest notes, package-derived risks, and early metrics into one go, adjust, or stop decision.',
      action: 'Create next iteration',
      recommendationLabel: 'Current recommendation',
      recommendation: 'Adjust and retest',
      recommendationCopy:
        'Combat feedback is promising, but early growth clarity must improve before the team expands content or monetization.',
      metricOne: 'Want another run',
      metricTwo: 'Time to understand goal',
      findingsTitle: 'Review findings',
      findings: [
        ['Playable signal', 'Players understand the battle feedback quickly and ask for another run.', 'green'],
        ['Main friction', 'The growth screen appears too early and hides the real tactical promise.', 'orange'],
        ['Scope warning', 'Building draw pools and live events now would mask the core validation risk.', 'red'],
      ],
      decisions: ['Continue', 'Adjust and retest', 'Stop project'],
      next:
        'Next iteration: fix first-day target clarity, resource pacing, and battle-to-upgrade feedback only.',
    },
    exportPayload: {
      product: 'iOS Competitor Deconstruction MVP Brief',
      hypothesis:
        'Keep the short-session combat payoff, reduce early system load, and validate retention with a lighter resource loop.',
      mustValidate: [
        'Players understand the first battle and growth goal within five minutes.',
        'A second run feels motivated without relying on heavy draw or event systems.',
        'The resource loop creates strategy, not frustration.',
      ],
      notInMvp: ['Full draw pool', 'Guild systems', 'Deep live-ops calendar', 'Large hero roster'],
    },
  },
  zh: {
    brand: 'MVP Forge',
    lab: 'iOS 手游实验室',
    nav: {
      deconstruct: '00 竞品拆解',
      brief: '01 MVP 立项',
      agents: '02 Agent 看板',
      review: '03 评审决策',
    },
    pipelineLabel: '当前流程',
    pipeline: '先拆安装包，再做创新。',
    language: 'EN',
    fileKinds: {
      ipa: 'iOS 安装包',
      store: '商店元数据',
      video: '12 分钟录屏',
      supporting: '辅助材料',
    },
    deconstruct: {
      eyebrow: '竞品拆解',
      title: 'iOS 手游竞品包体实验室',
      lede:
        '上传竞品 IPA、TestFlight 链接、商店页或 iPhone 录屏，系统会先拆系统入口、经济链路、数值线索和可创新空间。',
      actionIdle: '开始拆解',
      actionRunning: '拆解中',
      uploadTitle: '投喂竞品材料',
      uploadCopy:
        '主输入是 iOS 手游安装包；录屏、商店页和评论可以提高判断可信度，但不能替代包体。',
      dropStrong: '拖入 .ipa 或辅助文件',
      dropHint: '也可以点击从本机选择文件',
      mapTitle: '系统拆解地图',
      mapCopy:
        'Package Agent 会先归纳可见经济、功能入口、付费卡点和局内外节奏，再进入创新设计。',
      loop: ['首日目标', '战斗循环', '局外养成', '活动节奏'],
      modules: [
        ['系统入口', '战斗、英雄养成、抽卡、活动、商店', 'blue'],
        ['经济链路', '金币、体力、碎片、高级货币', 'orange'],
        ['局内节奏', '首局 6-9 分钟，高压段 90 秒', 'green'],
        ['付费压力', '第 3 章金币缺口，80 抽保底', 'red'],
      ],
      economyRows: [
        ['体力', '6 分钟 / 1 点', '控制游玩频率'],
        ['金币', '第 3 章短缺', '制造升级瓶颈'],
        ['抽卡券', '7 日活动路径', '推动回访节奏'],
        ['英雄碎片', '重复转化', '长期收集压力'],
      ],
      innovationTitle: '可创新空间',
      innovationCopy:
        '系统会把竞品事实和新游戏假设分开，团队可以基于拆解结果创新，而不是盲目复刻。',
      opportunities: [
        '缩短首日系统曝光，只保留最核心的战斗循环。',
        '把硬付费压力换成更清晰的策略目标和更柔和的资源门槛。',
        '保留 3 分钟战斗爽点，把重养成延后到留存验证之后。',
        '先用轻量 7 日活动验证节奏，再投入完整运营日历。',
      ],
      opportunityLabel: '机会',
      phoneAlt: '手机应用分析工作台',
    },
    brief: {
      eyebrow: 'MVP 立项',
      title: '把竞品拆解转成可验证假设',
      lede:
        '第一版原型只保留一个核心循环、一个留存问题，不急着做完整抽卡和重运营。',
      export: '导出 Brief',
      strategyTitle: '策略假设',
      statement:
        '保留竞品短局战斗反馈，降低首日系统负担，并验证更轻的资源循环能否带来第二局动力。',
      cards: [
        ['竞品痛点', '玩家还没信任战斗循环时，资源缺口和系统堆叠已经出现。'],
        ['创新方向', '把复杂度后移，让首日每次升级都能明显影响战斗。'],
        ['MVP 必须验证', '玩家能否在 5 分钟内理解战斗和成长目标。'],
        ['暂不开发', '完整抽卡池、公会、重活动、大量角色、精装修商城。'],
      ],
      scopeTitle: '原型范围',
      checklist: [
        '1 个英雄，3 个敌人，1 条升级线',
        '1 个软货币和 1 个类体力门槛',
        '3 个短任务，每个奖励变化可见',
        '首胜或首败后出现一次留存提示',
      ],
    },
    agents: {
      eyebrow: 'Agent 编排',
      title: '让工作以交接流转，而不是靠会议推进',
      lede:
        '每个 Agent 只接收边界清晰的输入，并在下一个 Agent 开始前交付可审查工件。',
      reset: '重置看板',
      selected: '当前 Agent',
      imageAlt: '游戏竞品分析工作台',
      requiredInput: '必要输入',
      requiredCopy: '包体摘要、系统入口图、经济表和创新约束。',
      expectedOutput: '预期输出',
      expectedCopy: 'Producer Agent 可以接受或退回重跑的结构化工件。',
      list: [
        ['Package Agent', '抽取包体结构、可见系统、商店元数据和资产线索。', '运行中', 'blue'],
        ['Market Agent', '读取商店页、评论、评分、差评和付费信号。', '排队中', 'orange'],
        ['Core Loop Agent', '把拆解结果转成 10 秒、30 秒、5 分钟循环。', '就绪', 'green'],
        ['MVP Scope Agent', '拆分第一版可玩原型的必须、有用、以后、不做。', '就绪', 'green'],
        ['Tech Agent', '估算实现成本，并标记包体分析盲区。', '等待', 'red'],
        ['Prototype Agent', '把已批准范围转成可玩原型任务清单。', '等待', 'gray'],
      ],
    },
    review: {
      eyebrow: 'MVP 评审',
      title: '判断这个原型是否值得继续投入',
      lede:
        '评审 Agent 会把试玩观察、包体风险和早期指标合并成继续、调整或停止的决策。',
      action: '生成下一轮',
      recommendationLabel: '当前建议',
      recommendation: '调整后再测',
      recommendationCopy:
        '战斗反馈有潜力，但局外成长目标还不够清晰，暂时不应扩内容或商业化。',
      metricOne: '愿意再玩一局',
      metricTwo: '理解目标用时',
      findingsTitle: '评审发现',
      findings: [
        ['可玩信号', '玩家能很快理解战斗反馈，并主动要求再来一局。', 'green'],
        ['主要摩擦', '成长界面出现太早，遮住了真正有潜力的策略体验。', 'orange'],
        ['范围风险', '现在做抽卡池和运营活动会掩盖核心验证风险。', 'red'],
      ],
      decisions: ['继续推进', '调整后再测', '停止项目'],
      next: '下一轮只修首日目标清晰度、资源节奏和战斗到升级的反馈。',
    },
    exportPayload: {
      product: 'iOS 竞品手游拆解 MVP Brief',
      hypothesis: '保留短局战斗反馈，降低首日系统负担，并用更轻的资源循环验证留存。',
      mustValidate: [
        '玩家能在五分钟内理解第一场战斗和成长目标。',
        '不依赖重抽卡和重活动，也能产生第二局动力。',
        '资源循环创造策略，而不是制造挫败。',
      ],
      notInMvp: ['完整抽卡池', '公会系统', '重运营日历', '大量角色'],
    },
  },
} as const

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function safeJsonParse(text: string): Partial<AnalysisResult> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const source = fenced ?? text
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return {
      status: text.slice(0, 320),
    }
  }

  try {
    return JSON.parse(source.slice(start, end + 1)) as Partial<AnalysisResult>
  } catch {
    return {
      status: text.slice(0, 320),
    }
  }
}

function normalizeAnalysis(raw: Partial<AnalysisResult>): AnalysisResult {
  return {
    loop: Array.isArray(raw.loop) ? raw.loop.slice(0, 4) : undefined,
    modules: Array.isArray(raw.modules)
      ? raw.modules
          .slice(0, 4)
          .map((item) => [String(item[0] ?? ''), String(item[1] ?? ''), String(item[2] ?? 'blue')])
      : undefined,
    economyRows: Array.isArray(raw.economyRows)
      ? raw.economyRows
          .slice(0, 5)
          .map((row) => row.slice(0, 3).map((cell) => String(cell)))
      : undefined,
    opportunities: Array.isArray(raw.opportunities)
      ? raw.opportunities.slice(0, 4).map((item) => String(item))
      : undefined,
    briefStatement: raw.briefStatement ? String(raw.briefStatement) : undefined,
    status: raw.status ? String(raw.status) : undefined,
  }
}

function buildAnalysisPrompt(
  language: Language,
  files: UploadedFile[],
  notes: string,
  extractedText: string,
) {
  const outputLanguage = language === 'zh' ? '中文' : 'English'
  const fileSummary = files
    .map((file) => `- ${file.name} | ${file.kind} | ${file.size}`)
    .join('\n')

  return `You are a senior mobile game product analyst. Deconstruct an iOS competitor mobile game package and supporting materials for MVP innovation planning.

Output language: ${outputLanguage}

Available inputs:
${fileSummary}

User notes / store links / playtest notes:
${notes || '(none)'}

Extracted readable file text:
${extractedText || '(none)'}

Important constraints:
- If the IPA binary itself was provided, infer only from filename, package metadata, and user-supplied notes unless readable text is included.
- Separate competitor facts from innovation assumptions.
- Focus on iOS mobile game systems: first-day flow, battle/core loop, meta growth, economy, monetization pressure, live-ops cadence, retention risk.
- Return only valid JSON. No markdown.

JSON schema:
{
  "loop": ["four short loop stages"],
  "modules": [["module title", "module finding", "blue|orange|green|red|gray"]],
  "economyRows": [["resource/system", "observed clue", "design implication"]],
  "opportunities": ["four innovation opportunities"],
  "briefStatement": "one concise MVP strategic hypothesis",
  "status": "short analysis status note"
}`
}

async function extractReadableText(files: UploadedFile[]) {
  const readableFiles = files.filter((item) => {
    const name = item.name.toLowerCase()
    return (
      item.file &&
      item.file.size <= 140_000 &&
      !name.endsWith('.ipa') &&
      !name.endsWith('.mp4') &&
      !name.endsWith('.mov') &&
      !name.endsWith('.zip')
    )
  })

  const chunks = await Promise.all(
    readableFiles.slice(0, 5).map(async (item) => {
      try {
        const text = await item.file!.text()
        return `--- ${item.name} ---\n${text.slice(0, 16_000)}`
      } catch {
        return `--- ${item.name} ---\n(unreadable in browser)`
      }
    }),
  )

  return chunks.join('\n\n').slice(0, 48_000)
}

async function callAiProvider(
  provider: ProviderId,
  config: ProviderConfig,
  apiKey: string,
  prompt: string,
) {
  if (!apiKey.trim()) {
    throw new Error('Missing API key')
  }

  if (config.mode === 'gemini') {
    const endpoint = `${config.endpoint.replace(/\/$/, '')}/${config.model}:generateContent?key=${encodeURIComponent(apiKey)}`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`${config.label} ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).join('\n') ?? ''
  }

  if (config.mode === 'anthropic') {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`${config.label} ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    return data.content?.map((part: { text?: string }) => part.text).join('\n') ?? ''
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = 'MVP Forge'
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You return compact valid JSON for mobile game competitor deconstruction.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    throw new Error(`${config.label} ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

function App() {
  const [activeView, setActiveView] = useState<ViewKey>('deconstruct')
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'zh'
    return window.localStorage.getItem('mvp-forge-language') === 'en' ? 'en' : 'zh'
  })
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles)
  const [runState, setRunState] = useState<RunState>('idle')
  const [selectedAgent, setSelectedAgent] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>(() => {
    if (typeof window === 'undefined') return 'openai'
    return (window.localStorage.getItem('mvp-forge-provider') as ProviderId) || 'openai'
  })
  const [providerConfigs, setProviderConfigs] = useState<Record<ProviderId, ProviderConfig>>(
    () => {
      if (typeof window === 'undefined') return providerDefaults
      const saved = window.localStorage.getItem('mvp-forge-provider-configs')
      return saved
        ? { ...providerDefaults, ...(JSON.parse(saved) as Partial<Record<ProviderId, ProviderConfig>>) }
        : providerDefaults
    },
  )
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {}
    const saved = window.localStorage.getItem('mvp-forge-api-keys')
    return saved ? (JSON.parse(saved) as Record<string, string>) : {}
  })
  const [analysisNotes, setAnalysisNotes] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState('')

  const t = copy[language]
  const nextLanguage: Language = language === 'zh' ? 'en' : 'zh'

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-language', language)
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  }, [language])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-provider', selectedProvider)
  }, [selectedProvider])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-provider-configs', JSON.stringify(providerConfigs))
  }, [providerConfigs])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-api-keys', JSON.stringify(apiKeys))
  }, [apiKeys])

  const progress = useMemo(() => {
    if (runState === 'idle') return 0
    if (runState === 'running') return 71
    return 100
  }, [runState])

  function addFiles(fileList: FileList | null) {
    if (!fileList) return

    const nextFiles = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      kind: file.name.endsWith('.ipa') ? 'ipa' : ('supporting' as FileKind),
      size: formatSize(file.size),
      file,
    }))

    setFiles((current) => [...nextFiles, ...current])
    setRunState('idle')
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    addFiles(event.dataTransfer.files)
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  async function startRun() {
    setRunState('running')
    setAnalysisError('')

    try {
      const extractedText = await extractReadableText(files)
      const prompt = buildAnalysisPrompt(language, files, analysisNotes, extractedText)
      const config = providerConfigs[selectedProvider]
      const text = await callAiProvider(selectedProvider, config, apiKeys[selectedProvider] ?? '', prompt)
      const parsed = normalizeAnalysis(safeJsonParse(text))
      setAnalysisResult(parsed)
      setRunState('done')
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : String(error))
      setRunState('idle')
    }
  }

  function exportBrief() {
    const payload = {
      language,
      product: t.exportPayload.product,
      files: files.map((file) => file.name),
      hypothesis: t.exportPayload.hypothesis,
      mustValidate: t.exportPayload.mustValidate,
      notInMvp: t.exportPayload.notInMvp,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = language === 'zh' ? 'ios-mvp-brief.zh.json' : 'ios-mvp-brief.en.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const activeAgent = t.agents.list[selectedAgent]
  const providerConfig = providerConfigs[selectedProvider]
  const displayLoop = analysisResult?.loop?.length === 4 ? analysisResult.loop : t.deconstruct.loop
  const displayModules =
    analysisResult?.modules && analysisResult.modules.length > 0
      ? analysisResult.modules
      : t.deconstruct.modules
  const displayEconomyRows =
    analysisResult?.economyRows && analysisResult.economyRows.length > 0
      ? analysisResult.economyRows
      : t.deconstruct.economyRows
  const displayOpportunities =
    analysisResult?.opportunities && analysisResult.opportunities.length > 0
      ? analysisResult.opportunities
      : t.deconstruct.opportunities
  const briefStatement = analysisResult?.briefStatement ?? t.brief.statement

  const languageButton = (
    <button
      className="language-toggle"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={language === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <span>{language === 'zh' ? '中文' : 'EN'}</span>
      <strong>{t.language}</strong>
    </button>
  )

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Product navigation">
        <div className="brand">
          <span className="brand-mark">MF</span>
          <div>
            <strong>{t.brand}</strong>
            <small>{t.lab}</small>
          </div>
        </div>

        <nav className="nav-list">
          {[
            ['deconstruct', t.nav.deconstruct],
            ['brief', t.nav.brief],
            ['agents', t.nav.agents],
            ['review', t.nav.review],
          ].map(([key, label]) => (
            <button
              className={activeView === key ? 'nav-item active' : 'nav-item'}
              key={key}
              onClick={() => setActiveView(key as ViewKey)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <small>{t.pipelineLabel}</small>
          <strong>{t.pipeline}</strong>
        </div>
      </aside>

      <section className="workspace">
        {activeView === 'deconstruct' && (
          <section className="screen deconstruct-screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{t.deconstruct.eyebrow}</p>
                <h1>{t.deconstruct.title}</h1>
                <p className="lede">{t.deconstruct.lede}</p>
              </div>
              <div className="screen-actions">
                {languageButton}
                <button className="primary-action" onClick={startRun}>
                  {runState === 'running'
                    ? t.deconstruct.actionRunning
                    : t.deconstruct.actionIdle}
                </button>
              </div>
            </header>

            <div className="deconstruct-grid">
              <section className="panel upload-panel">
                <h2>{t.deconstruct.uploadTitle}</h2>
                <p>{t.deconstruct.uploadCopy}</p>

                <label
                  className="drop-zone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileInput}
                    aria-label={t.deconstruct.dropStrong}
                  />
                  <strong>{t.deconstruct.dropStrong}</strong>
                  <span>{t.deconstruct.dropHint}</span>
                </label>

                <div className="ai-config">
                  <div className="field-group">
                    <label>{language === 'zh' ? 'AI 平台' : 'AI provider'}</label>
                    <select
                      value={selectedProvider}
                      onChange={(event) => setSelectedProvider(event.target.value as ProviderId)}
                    >
                      {Object.entries(providerDefaults).map(([id, provider]) => (
                        <option value={id} key={id}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label>{language === 'zh' ? 'API Key' : 'API key'}</label>
                    <input
                      type="password"
                      value={apiKeys[selectedProvider] ?? ''}
                      onChange={(event) =>
                        setApiKeys((current) => ({
                          ...current,
                          [selectedProvider]: event.target.value,
                        }))
                      }
                      placeholder={language === 'zh' ? '只保存在本地浏览器' : 'Stored only in this browser'}
                    />
                  </div>

                  <div className="field-group">
                    <label>{language === 'zh' ? '模型' : 'Model'}</label>
                    <input
                      value={providerConfig.model}
                      onChange={(event) =>
                        setProviderConfigs((current) => ({
                          ...current,
                          [selectedProvider]: {
                            ...current[selectedProvider],
                            model: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>{language === 'zh' ? 'Endpoint' : 'Endpoint'}</label>
                    <input
                      value={providerConfig.endpoint}
                      onChange={(event) =>
                        setProviderConfigs((current) => ({
                          ...current,
                          [selectedProvider]: {
                            ...current[selectedProvider],
                            endpoint: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>{language === 'zh' ? '补充材料' : 'Extra context'}</label>
                    <textarea
                      value={analysisNotes}
                      onChange={(event) => setAnalysisNotes(event.target.value)}
                      placeholder={
                        language === 'zh'
                          ? '粘贴商店链接、玩法观察、付费截图文字、活动规则等'
                          : 'Paste store links, playtest notes, monetization copy, event rules, etc.'
                      }
                    />
                  </div>

                  <p className="api-note">
                    {language === 'zh'
                      ? '浏览器直连可能受平台 CORS 限制；自定义平台建议使用 OpenAI-compatible 接口。'
                      : 'Direct browser calls can be limited by provider CORS; custom APIs should be OpenAI-compatible.'}
                  </p>
                </div>

                <div className="file-stack">
                  {files.map((file) => (
                    <article className="file-row" key={file.id}>
                      <div>
                        <strong>{file.name}</strong>
                        <span>{t.fileKinds[file.kind]}</span>
                      </div>
                      <small>{file.size}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel system-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{t.deconstruct.mapTitle}</h2>
                    <p>{t.deconstruct.mapCopy}</p>
                  </div>
                  <div className="progress-meter">
                    <span>{progress}%</span>
                    <div>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="loop-strip">
                  {displayLoop.map((step) => (
                    <div className="loop-step" key={step}>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="module-grid">
                  {displayModules.map(([title, value, tone]) => (
                    <article className={`module-card ${tone}`} key={title}>
                      <span>{title}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>

                <div className="economy-table" role="table" aria-label={t.deconstruct.mapTitle}>
                  {displayEconomyRows.map((row) => (
                    <div className="economy-row" role="row" key={row[0]}>
                      {row.map((cell) => (
                        <span role="cell" key={cell}>
                          {cell}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              <section className="inspector">
                <img src={phoneImage} alt={t.deconstruct.phoneAlt} className="inspector-image" />
                <h2>{t.deconstruct.innovationTitle}</h2>
                <p>{t.deconstruct.innovationCopy}</p>
                {(analysisResult?.status || analysisError) && (
                  <p className={analysisError ? 'analysis-status error' : 'analysis-status'}>
                    {analysisError || analysisResult?.status}
                  </p>
                )}
                <div className="opportunity-stack">
                  {displayOpportunities.map((opportunity, index) => (
                    <article key={opportunity}>
                      <small>
                        {t.deconstruct.opportunityLabel} {index + 1}
                      </small>
                      <strong>{opportunity}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeView === 'brief' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{t.brief.eyebrow}</p>
                <h1>{t.brief.title}</h1>
                <p className="lede">{t.brief.lede}</p>
              </div>
              <div className="screen-actions">
                {languageButton}
                <button className="primary-action" onClick={exportBrief}>
                  {t.brief.export}
                </button>
              </div>
            </header>

            <div className="brief-layout">
              <section className="panel brief-main">
                <h2>{t.brief.strategyTitle}</h2>
                <p className="brief-statement">{briefStatement}</p>

                <div className="brief-grid">
                  {t.brief.cards.map(([label, value]) => (
                    <article key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="panel mvp-checklist">
                <h2>{t.brief.scopeTitle}</h2>
                {t.brief.checklist.map((item) => (
                  <label key={item}>
                    <input type="checkbox" defaultChecked />
                    <span>{item}</span>
                  </label>
                ))}
              </aside>
            </div>
          </section>
        )}

        {activeView === 'agents' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{t.agents.eyebrow}</p>
                <h1>{t.agents.title}</h1>
                <p className="lede">{t.agents.lede}</p>
              </div>
              <div className="screen-actions">
                {languageButton}
                <button className="secondary-action" onClick={() => setSelectedAgent(0)}>
                  {t.agents.reset}
                </button>
              </div>
            </header>

            <div className="agent-layout">
              <section className="agent-board">
                {t.agents.list.map(([name, job, status, tone], index) => (
                  <button
                    className={
                      selectedAgent === index
                        ? `agent-card selected ${tone}`
                        : `agent-card ${tone}`
                    }
                    key={name}
                    onClick={() => setSelectedAgent(index)}
                  >
                    <span>{status}</span>
                    <strong>{name}</strong>
                    <small>{job}</small>
                  </button>
                ))}
              </section>

              <aside className="agent-inspector">
                <img src={productImage} alt={t.agents.imageAlt} className="agent-image" />
                <p className="eyebrow">{t.agents.selected}</p>
                <h2>{activeAgent[0]}</h2>
                <p>{activeAgent[1]}</p>
                <div className="handoff-box">
                  <span>{t.agents.requiredInput}</span>
                  <strong>{t.agents.requiredCopy}</strong>
                </div>
                <div className="handoff-box">
                  <span>{t.agents.expectedOutput}</span>
                  <strong>{t.agents.expectedCopy}</strong>
                </div>
              </aside>
            </div>
          </section>
        )}

        {activeView === 'review' && (
          <section className="screen">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{t.review.eyebrow}</p>
                <h1>{t.review.title}</h1>
                <p className="lede">{t.review.lede}</p>
              </div>
              <div className="screen-actions">
                {languageButton}
                <button className="primary-action" onClick={exportBrief}>
                  {t.review.action}
                </button>
              </div>
            </header>

            <div className="review-layout">
              <section className="decision-panel">
                <span>{t.review.recommendationLabel}</span>
                <strong>{t.review.recommendation}</strong>
                <p>{t.review.recommendationCopy}</p>
              </section>

              <section className="metric-panel">
                <article>
                  <strong>72%</strong>
                  <span>{t.review.metricOne}</span>
                </article>
                <article>
                  <strong>04:40</strong>
                  <span>{t.review.metricTwo}</span>
                </article>
              </section>

              <section className="panel findings-panel">
                <h2>{t.review.findingsTitle}</h2>
                {t.review.findings.map(([label, value, tone]) => (
                  <article className={`finding ${tone}`} key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </section>

              <aside className="decision-actions">
                {t.review.decisions.map((decision, index) => (
                  <button className={index === 1 ? 'recommended' : undefined} key={decision}>
                    {decision}
                  </button>
                ))}
                <p>{t.review.next}</p>
              </aside>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
