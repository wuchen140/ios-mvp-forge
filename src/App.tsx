import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import './App.css'

type ViewKey = 'deconstruct' | 'brief' | 'agents' | 'review'
type RunState = 'idle' | 'running' | 'done' | 'error'
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
  packageSummary?: string
  mustValidate?: string[]
  notInMvp?: string[]
  risks?: string[]
  nextTasks?: string[]
  recommendation?: string
  recommendationReason?: string
  status?: string
}

type ParserPackageSummary = {
  displayName?: string | null
  bundleId?: string | null
  version?: string | null
  minimumOS?: string | null
}

type ParserStructureSummary = {
  engine?: string | null
  frameworks?: string[]
  interestingFiles?: string[]
  topDirectories?: { name: string; count: number }[]
}

type ParserResult = {
  file?: {
    name?: string
    sizeMB?: number
  }
  package?: ParserPackageSummary
  structure?: ParserStructureSummary
  analysisHints?: string[]
}

type StageKey = 'input' | 'parser' | 'prompt' | 'analysis' | 'brief'
type StageState = 'pending' | 'active' | 'done' | 'error'

type PipelineStage = {
  key: StageKey
  label: string
  state: StageState
  detail: string
}

type ParserConnection = {
  status: 'disabled' | 'checking' | 'ready' | 'offline'
  message: string
}

type MarketMetadata = {
  appId: string
  name: string
  developer: string
  genre: string
  averageRating: number | null
  ratingCount: number | null
  description: string
  storeUrl: string
  artworkUrl: string
}

type MarketReview = {
  author: string
  rating: number
  title: string
  content: string
  version: string
  updated: string
}

type MarketTheme = {
  label: string
  mentions: number
  tone: 'positive' | 'negative' | 'mixed'
}

type MarketIntel = {
  appId: string
  country: string
  fetchedAt: string
  metadata: MarketMetadata | null
  reviews: MarketReview[]
  reviewThemes: MarketTheme[]
}

type SavedProject = {
  id: string
  projectName: string
  createdAt: string
  language: Language
  selectedProvider: ProviderId
  files: Array<Pick<UploadedFile, 'id' | 'name' | 'kind' | 'size'>>
  primaryFileId: string | null
  marketAppId: string
  marketUrl: string
  marketCountry: string
  marketIntel: MarketIntel | null
  analysisNotes: string
  analysisResult: AnalysisResult | null
  parserResult: ParserResult | null
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

function sanitizeList(value: unknown, limit = 4) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, limit)
    : []
}

function getStageLabel(language: Language, key: StageKey) {
  const labels: Record<Language, Record<StageKey, string>> = {
    zh: {
      input: '输入检查',
      parser: 'IPA 解析',
      prompt: '构建提示',
      analysis: 'AI 拆解',
      brief: '生成 Brief',
    },
    en: {
      input: 'Input check',
      parser: 'IPA parse',
      prompt: 'Prompt build',
      analysis: 'AI analysis',
      brief: 'Brief output',
    },
  }

  return labels[language][key]
}

function buildPipelineStages(language: Language, previous?: PipelineStage[]) {
  const defaultDetail = language === 'zh' ? '等待开始' : 'Waiting'
  const order: StageKey[] = ['input', 'parser', 'prompt', 'analysis', 'brief']

  return order.map((key) => {
    const existing = previous?.find((item) => item.key === key)
    return {
      key,
      label: getStageLabel(language, key),
      state: existing?.state ?? 'pending',
      detail: existing?.detail ?? defaultDetail,
    }
  })
}

function formatTimestamp(iso: string, language: Language) {
  try {
    return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function parseAppStoreId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/id(\d{5,})/i) ?? trimmed.match(/\b(\d{5,})\b/)
  return match?.[1] ?? ''
}

function buildReviewThemes(reviews: MarketReview[], language: Language): MarketTheme[] {
  const buckets = [
    {
      label: language === 'zh' ? '性能稳定性' : 'Performance',
      keywords: ['crash', 'bug', 'freeze', 'slow', 'lag', 'loading', 'stuck', '卡', '崩', '闪退', '慢'],
    },
    {
      label: language === 'zh' ? '定价付费' : 'Pricing',
      keywords: ['price', 'subscription', 'pay', 'paid', 'expensive', 'billing', '收费', '订阅', '贵'],
    },
    {
      label: language === 'zh' ? '上手体验' : 'Onboarding',
      keywords: ['easy', 'confusing', 'learn', 'tutorial', 'guide', 'beginner', '理解', '上手', '教程'],
    },
    {
      label: language === 'zh' ? '内容质量' : 'Output quality',
      keywords: ['accurate', 'wrong', 'helpful', 'useless', 'quality', 'answer', '结果', '质量', '回答'],
    },
    {
      label: language === 'zh' ? '留存动力' : 'Retention pull',
      keywords: ['fun', 'boring', 'return', 'daily', 'engaging', 'addictive', '好玩', '无聊', '回访'],
    },
  ]

  const results = buckets
    .map((bucket) => {
      const matched = reviews.filter((review) => {
        const text = `${review.title} ${review.content}`.toLowerCase()
        return bucket.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
      })

      if (!matched.length) return null

      const avgRating =
        matched.reduce((sum, review) => sum + review.rating, 0) / matched.length
      const tone: MarketTheme['tone'] =
        avgRating >= 4 ? 'positive' : avgRating <= 2.6 ? 'negative' : 'mixed'

      return {
        label: bucket.label,
        mentions: matched.length,
        tone,
      }
    })
    .filter((item): item is MarketTheme => Boolean(item))
    .sort((a, b) => b.mentions - a.mentions)

  return results.slice(0, 4)
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
    packageSummary: raw.packageSummary ? String(raw.packageSummary) : undefined,
    mustValidate: sanitizeList(raw.mustValidate, 4),
    notInMvp: sanitizeList(raw.notInMvp, 6),
    risks: sanitizeList(raw.risks, 4),
    nextTasks: sanitizeList(raw.nextTasks, 5),
    recommendation: raw.recommendation ? String(raw.recommendation) : undefined,
    recommendationReason: raw.recommendationReason ? String(raw.recommendationReason) : undefined,
    status: raw.status ? String(raw.status) : undefined,
  }
}

function summarizeParserResult(parserResult: ParserResult | null, language: Language) {
  if (!parserResult) return language === 'zh' ? '未使用结构化 IPA 事实。' : 'No structured IPA facts yet.'

  const packageInfo = parserResult.package
  const structure = parserResult.structure
  const hints = parserResult.analysisHints ?? []
  const lines = [
    packageInfo?.displayName ? `${language === 'zh' ? '应用名' : 'App'}: ${packageInfo.displayName}` : '',
    packageInfo?.bundleId ? `Bundle ID: ${packageInfo.bundleId}` : '',
    structure?.engine ? `${language === 'zh' ? '引擎' : 'Engine'}: ${structure.engine}` : '',
    structure?.frameworks?.length
      ? `${language === 'zh' ? '关键框架' : 'Frameworks'}: ${structure.frameworks.slice(0, 4).join(', ')}`
      : '',
    hints.length
      ? `${language === 'zh' ? '线索' : 'Hints'}: ${hints.slice(0, 2).join(' ')}`
      : '',
  ].filter(Boolean)

  return lines.join('\n')
}

function summarizeMarketIntel(marketIntel: MarketIntel | null, language: Language) {
  if (!marketIntel?.metadata) {
    return language === 'zh' ? '暂无 App Store 市场事实。' : 'No App Store market facts yet.'
  }

  const { metadata, reviews, reviewThemes } = marketIntel
  const ratingText =
    metadata.averageRating !== null && metadata.ratingCount !== null
      ? `${metadata.averageRating.toFixed(1)} / 5 (${metadata.ratingCount})`
      : language === 'zh'
        ? '无评分'
        : 'No ratings'
  const reviewSnippet = reviews[0]
    ? `${language === 'zh' ? '最新评论' : 'Latest review'}: ${reviews[0].title} (${reviews[0].rating}/5)`
    : ''
  const themeSnippet = reviewThemes.length
    ? `${language === 'zh' ? '评论主题' : 'Review themes'}: ${reviewThemes
        .map((theme) => `${theme.label} x${theme.mentions}`)
        .join(', ')}`
    : ''

  return [
    `${language === 'zh' ? '应用' : 'App'}: ${metadata.name}`,
    `${language === 'zh' ? '开发者' : 'Developer'}: ${metadata.developer}`,
    `${language === 'zh' ? '分类' : 'Genre'}: ${metadata.genre}`,
    `${language === 'zh' ? '评分' : 'Rating'}: ${ratingText}`,
    themeSnippet,
    reviewSnippet,
  ]
    .filter(Boolean)
    .join('\n')
}

function hydrateAnalysis(
  raw: AnalysisResult,
  parserResult: ParserResult | null,
  language: Language,
): AnalysisResult {
  const opportunities = raw.opportunities?.length
    ? raw.opportunities
    : language === 'zh'
      ? ['缩短首日系统暴露，优先验证最核心的战斗循环。']
      : ['Reduce first-day system load and validate the core combat loop first.']

  const risks = raw.risks?.length ? raw.risks : parserResult?.analysisHints?.slice(0, 3) ?? []
  const notInMvp = raw.notInMvp?.length
    ? raw.notInMvp
    : language === 'zh'
      ? ['完整抽卡池', '公会系统', '重运营活动']
      : ['Full gacha pool', 'Guild systems', 'Heavy live ops']
  const mustValidate = raw.mustValidate?.length
    ? raw.mustValidate
    : language === 'zh'
      ? ['玩家能在五分钟内理解目标并愿意再开一局。']
      : ['Players understand the goal within five minutes and want another run.']
  const nextTasks = raw.nextTasks?.length ? raw.nextTasks : opportunities.map((item) => item)
  const recommendation =
    raw.recommendation ??
    (risks.length >= 2
      ? language === 'zh'
        ? '调整后再测'
        : 'Adjust and retest'
      : language === 'zh'
        ? '继续推进'
        : 'Continue')

  return {
    ...raw,
    packageSummary:
      raw.packageSummary ??
      (parserResult
        ? language === 'zh'
          ? `已从 IPA 中提取结构化事实。${summarizeParserResult(parserResult, language).split('\n')[0] ?? ''}`
          : `Structured IPA facts extracted. ${summarizeParserResult(parserResult, language).split('\n')[0] ?? ''}`
        : undefined),
    mustValidate,
    notInMvp,
    risks,
    nextTasks,
    recommendation,
    recommendationReason:
      raw.recommendationReason ??
      (language === 'zh'
        ? '先确认首局理解、战斗爽点和资源节奏，再决定是否扩范围。'
        : 'Validate first-session clarity, combat payoff, and pacing before expanding scope.'),
    status:
      raw.status ??
      (parserResult
        ? language === 'zh'
          ? '已结合本地 IPA 结构化事实完成拆解。'
          : 'Analysis completed with local IPA facts.'
        : language === 'zh'
          ? '已用文本和备注完成拆解。'
          : 'Analysis completed from text inputs and notes.'),
  }
}

function buildAnalysisPrompt(
  language: Language,
  files: UploadedFile[],
  notes: string,
  extractedText: string,
  parserResult: ParserResult | null,
  marketIntel: MarketIntel | null,
) {
  const outputLanguage = language === 'zh' ? '中文' : 'English'
  const fileSummary = files
    .map((file) => `- ${file.name} | ${file.kind} | ${file.size}`)
    .join('\n')
  const parserFacts = parserResult ? summarizeParserResult(parserResult, language) : '(none)'
  const marketFacts = marketIntel ? summarizeMarketIntel(marketIntel, language) : '(none)'

  return `You are a senior mobile game product analyst. Deconstruct an iOS competitor mobile game package and supporting materials for MVP innovation planning.

Output language: ${outputLanguage}

Available inputs:
${fileSummary}

User notes / store links / playtest notes:
${notes || '(none)'}

Structured IPA facts:
${parserFacts}

App Store market facts:
${marketFacts}

Extracted readable file text:
${extractedText || '(none)'}

Important constraints:
- Treat structured IPA facts as hard evidence.
- Separate competitor facts from innovation assumptions.
- Focus on iOS mobile game systems: first-day flow, battle/core loop, meta growth, economy, monetization pressure, live-ops cadence, retention risk.
- Return only valid JSON. No markdown.

JSON schema:
{
  "loop": ["four short loop stages"],
  "modules": [["module title", "module finding", "blue|orange|green|red|gray"]],
  "economyRows": [["resource/system", "observed clue", "design implication"]],
  "opportunities": ["four innovation opportunities"],
  "packageSummary": "one concise summary of the package facts that matter for MVP planning",
  "briefStatement": "one concise MVP strategic hypothesis",
  "mustValidate": ["up to four validation questions"],
  "notInMvp": ["up to six items to exclude from the first build"],
  "risks": ["up to four core product or tech risks"],
  "nextTasks": ["up to five next iteration tasks"],
  "recommendation": "Continue | Adjust and retest | Stop project",
  "recommendationReason": "one short reason for the recommendation",
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

async function probeLocalParser() {
  const response = await fetch('http://127.0.0.1:8787/health')
  if (!response.ok) {
    throw new Error(`Parser ${response.status}`)
  }

  return (await response.json()) as { ok?: boolean }
}

async function callLocalParser(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('http://127.0.0.1:8787/parse-ipa', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return (await response.json()) as ParserResult
}

async function fetchMarketIntel(appId: string, country: string, language: Language) {
  const normalizedCountry = country.trim().toLowerCase() || 'us'
  const [lookupResponse, reviewsResponse] = await Promise.all([
    fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(normalizedCountry)}`),
    fetch(
      `https://itunes.apple.com/${encodeURIComponent(normalizedCountry)}/rss/customerreviews/id=${encodeURIComponent(appId)}/sortBy=mostRecent/json?l=en&cc=${encodeURIComponent(normalizedCountry)}`,
    ),
  ])

  if (!lookupResponse.ok) {
    throw new Error(`App Store lookup ${lookupResponse.status}`)
  }

  const lookupData = (await lookupResponse.json()) as {
    resultCount?: number
    results?: Array<Record<string, unknown>>
  }
  const record = lookupData.results?.[0]

  if (!record) {
    throw new Error('App Store app not found')
  }

  let reviews: MarketReview[] = []
  if (reviewsResponse.ok) {
    const reviewsData = (await reviewsResponse.json()) as {
      feed?: { entry?: Array<Record<string, unknown>> }
    }
    reviews = (reviewsData.feed?.entry ?? [])
      .filter((entry) => typeof entry['im:rating'] === 'object')
      .slice(0, 8)
      .map((entry) => ({
        author: String((entry.author as { name?: { label?: string } })?.name?.label ?? ''),
        rating: Number((entry['im:rating'] as { label?: string })?.label ?? 0),
        title: String((entry.title as { label?: string })?.label ?? ''),
        content: String((entry.content as { label?: string })?.label ?? ''),
        version: String((entry['im:version'] as { label?: string })?.label ?? ''),
        updated: String((entry.updated as { label?: string })?.label ?? ''),
      }))
  }

  return {
    appId,
    country: normalizedCountry,
    fetchedAt: new Date().toISOString(),
    metadata: {
      appId,
      name: String(record.trackName ?? ''),
      developer: String(record.artistName ?? ''),
      genre: String(record.primaryGenreName ?? ''),
      averageRating:
        typeof record.averageUserRating === 'number' ? record.averageUserRating : null,
      ratingCount:
        typeof record.userRatingCount === 'number' ? record.userRatingCount : null,
      description: String(record.description ?? ''),
      storeUrl: String(record.trackViewUrl ?? ''),
      artworkUrl: String(record.artworkUrl100 ?? record.artworkUrl60 ?? ''),
    },
    reviews,
    reviewThemes: buildReviewThemes(reviews, language),
  } satisfies MarketIntel
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
  const defaultLanguage =
    typeof window === 'undefined' || window.localStorage.getItem('mvp-forge-language') !== 'en'
      ? 'zh'
      : 'en'
  const [activeView, setActiveView] = useState<ViewKey>('deconstruct')
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'zh'
    return window.localStorage.getItem('mvp-forge-language') === 'en' ? 'en' : 'zh'
  })
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles)
  const [primaryFileId, setPrimaryFileId] = useState<string | null>(() => initialFiles[0]?.id ?? null)
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
  const [projectName, setProjectName] = useState(() => {
    if (typeof window === 'undefined') return defaultLanguage === 'zh' ? '未命名项目' : 'Untitled project'
    return (
      window.localStorage.getItem('mvp-forge-project-name') ??
      (defaultLanguage === 'zh' ? '未命名项目' : 'Untitled project')
    )
  })
  const [useLocalParser, setUseLocalParser] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('mvp-forge-use-local-parser') !== 'false'
  })
  const [parserConnection, setParserConnection] = useState<ParserConnection>(() => ({
    status: 'checking',
    message: defaultLanguage === 'zh' ? '检查本地解析器中' : 'Checking local parser',
  }))
  const [parserResult, setParserResult] = useState<ParserResult | null>(null)
  const [marketUrl, setMarketUrl] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('mvp-forge-market-url') ?? ''
  })
  const [marketAppId, setMarketAppId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('mvp-forge-market-app-id') ?? ''
  })
  const [marketCountry, setMarketCountry] = useState(() => {
    if (typeof window === 'undefined') return 'us'
    return window.localStorage.getItem('mvp-forge-market-country') ?? 'us'
  })
  const [marketIntel, setMarketIntel] = useState<MarketIntel | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = window.localStorage.getItem('mvp-forge-market-intel')
    return saved ? (JSON.parse(saved) as MarketIntel) : null
  })
  const [marketStatus, setMarketStatus] = useState('')
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = window.localStorage.getItem('mvp-forge-project-history')
    return saved ? (JSON.parse(saved) as SavedProject[]) : []
  })
  const [analysisNotes, setAnalysisNotes] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(() =>
    buildPipelineStages(defaultLanguage),
  )

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

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-project-name', projectName)
  }, [projectName])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-use-local-parser', String(useLocalParser))
  }, [useLocalParser])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-market-url', marketUrl)
  }, [marketUrl])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-market-app-id', marketAppId)
  }, [marketAppId])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-market-country', marketCountry)
  }, [marketCountry])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-market-intel', JSON.stringify(marketIntel))
  }, [marketIntel])

  useEffect(() => {
    window.localStorage.setItem('mvp-forge-project-history', JSON.stringify(savedProjects))
  }, [savedProjects])

  useEffect(() => {
    if (!useLocalParser) {
      return
    }

    let cancelled = false

    probeLocalParser()
      .then(() => {
        if (cancelled) return
        setParserConnection({
          status: 'ready',
          message:
            language === 'zh'
              ? '本地解析器在线，支持结构化 IPA 拆解'
              : 'Local parser is ready for structured IPA analysis',
        })
      })
      .catch(() => {
        if (cancelled) return
        setParserConnection({
          status: 'offline',
          message:
            language === 'zh'
              ? '本地解析器未启动，可运行 npm run parser'
              : 'Local parser is offline. Start it with npm run parser',
        })
      })

    return () => {
      cancelled = true
    }
  }, [language, useLocalParser])

  const progress = useMemo(() => {
    const done = pipelineStages.filter((item) => item.state === 'done').length
    const active = pipelineStages.some((item) => item.state === 'active') ? 0.5 : 0
    return Math.round(((done + active) / pipelineStages.length) * 100)
  }, [pipelineStages])
  const displayedStages = useMemo(
    () => pipelineStages.map((item) => ({ ...item, label: getStageLabel(language, item.key) })),
    [language, pipelineStages],
  )
  const parserStatusDisplay = useMemo<ParserConnection>(
    () =>
      useLocalParser
        ? parserConnection
        : {
            status: 'disabled',
            message: language === 'zh' ? '已关闭本地解析器' : 'Local parser disabled',
          },
    [language, parserConnection, useLocalParser],
  )

  const primaryFile =
    files.find((item) => item.id === primaryFileId) ??
    files.find((item) => item.kind === 'ipa') ??
    files[0] ??
    null
  const providerConfig = providerConfigs[selectedProvider]
  const inferredMarketAppId = parseAppStoreId(marketAppId || marketUrl)

  function updateStage(key: StageKey, state: StageState, detail: string) {
    setPipelineStages((current) =>
      current.map((item) => (item.key === key ? { ...item, state, detail } : item)),
    )
  }

  function resetPipeline() {
    setPipelineStages(buildPipelineStages(language))
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return

    const incoming = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      kind: file.name.toLowerCase().endsWith('.ipa') ? 'ipa' : ('supporting' as FileKind),
      size: formatSize(file.size),
      file,
    }))

    setFiles((current) => {
      const existingIds = new Set(current.map((item) => item.id))
      const deduped = incoming.filter((item) => !existingIds.has(item.id))
      const next = [...deduped, ...current]
      const nextPrimary =
        next.find((item) => item.id === primaryFileId)?.id ??
        deduped.find((item) => item.kind === 'ipa')?.id ??
        next.find((item) => item.kind === 'ipa')?.id ??
        next[0]?.id ??
        null
      setPrimaryFileId(nextPrimary)
      return next
    })
    setRunState('idle')
    setAnalysisError('')
    resetPipeline()
  }

  function removeFile(fileId: string) {
    setFiles((current) => {
      const next = current.filter((item) => item.id !== fileId)
      const nextPrimary =
        primaryFileId === fileId
          ? next.find((item) => item.kind === 'ipa')?.id ?? next[0]?.id ?? null
          : primaryFileId
      setPrimaryFileId(nextPrimary)
      return next
    })
    setRunState('idle')
    resetPipeline()
  }

  function clearInputs() {
    setFiles([])
    setPrimaryFileId(null)
    setAnalysisResult(null)
    setParserResult(null)
    setMarketIntel(null)
    setMarketStatus('')
    setMarketAppId('')
    setMarketUrl('')
    setMarketCountry('us')
    setAnalysisNotes('')
    setAnalysisError('')
    setRunState('idle')
    resetPipeline()
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    addFiles(event.dataTransfer.files)
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function friendlyError(error: unknown) {
    const text = error instanceof Error ? error.message : String(error)
    if (text.includes('Missing API key')) {
      return language === 'zh' ? '先填写当前 AI 平台的 API Key。' : 'Add the API key for the selected AI provider first.'
    }

    if (text.includes('Failed to fetch')) {
      return language === 'zh'
        ? '网络请求失败，可能是 CORS、离线状态，或本地解析器未启动。'
        : 'Request failed. This is usually CORS, offline access, or the local parser not running.'
    }

    return text
  }

  function buildSnapshot(): SavedProject {
    return {
      id: `${Date.now()}`,
      projectName,
      createdAt: new Date().toISOString(),
      language,
      selectedProvider,
      files: files.map(({ id, name, kind, size }) => ({ id, name, kind, size })),
      primaryFileId,
      marketAppId,
      marketUrl,
      marketCountry,
      marketIntel,
      analysisNotes,
      analysisResult,
      parserResult,
    }
  }

  function saveSnapshot() {
    const snapshot = buildSnapshot()
    setSavedProjects((current) => [snapshot, ...current].slice(0, 8))
  }

  function loadSnapshot(snapshot: SavedProject) {
    setProjectName(snapshot.projectName)
    setLanguage(snapshot.language)
    setSelectedProvider(snapshot.selectedProvider)
    setFiles(snapshot.files)
    setPrimaryFileId(snapshot.primaryFileId)
    setMarketAppId(snapshot.marketAppId)
    setMarketUrl(snapshot.marketUrl)
    setMarketCountry(snapshot.marketCountry)
    setMarketIntel(snapshot.marketIntel)
    setMarketStatus(
      snapshot.marketIntel
        ? language === 'zh'
          ? '已载入历史商店快照。'
          : 'Loaded saved App Store snapshot.'
        : '',
    )
    setAnalysisNotes(snapshot.analysisNotes)
    setAnalysisResult(snapshot.analysisResult)
    setParserResult(snapshot.parserResult)
    setAnalysisError(
      snapshot.analysisResult
        ? language === 'zh'
          ? '已载入历史快照；若要重新解析 IPA，请重新上传原始文件。'
          : 'Snapshot loaded. Re-upload the IPA if you want to parse it again.'
        : '',
    )
    setRunState(snapshot.analysisResult ? 'done' : 'idle')
    resetPipeline()
    setActiveView(snapshot.analysisResult ? 'brief' : 'deconstruct')
  }

  async function loadMarketIntel() {
    const appId = inferredMarketAppId
    if (!appId) {
      setMarketStatus(
        language === 'zh' ? '请先填写 App Store 链接或 App ID。' : 'Add an App Store URL or app id first.',
      )
      return
    }

    setMarketStatus(language === 'zh' ? '抓取商店信息中' : 'Fetching App Store data')

    try {
      const intel = await fetchMarketIntel(appId, marketCountry, language)
      setMarketAppId(appId)
      if (!marketUrl && intel.metadata?.storeUrl) {
        setMarketUrl(intel.metadata.storeUrl)
      }
      setMarketIntel(intel)
      setMarketStatus(
        language === 'zh'
          ? `已抓取 ${intel.metadata?.name ?? appId} 的商店信息`
          : `Fetched App Store data for ${intel.metadata?.name ?? appId}`,
      )
    } catch (error) {
      setMarketStatus(friendlyError(error))
    }
  }

  async function startRun() {
    if (runState === 'running') return

    setRunState('running')
    setAnalysisError('')
    setAnalysisResult(null)
    resetPipeline()

    try {
      updateStage(
        'input',
        'active',
        language === 'zh' ? `已接收 ${files.length} 份材料` : `${files.length} inputs ready`,
      )

      if (!files.length && !analysisNotes.trim()) {
        throw new Error(language === 'zh' ? '请先上传材料或填写备注。' : 'Add files or notes before running analysis.')
      }

      updateStage(
        'input',
        'done',
        language === 'zh'
          ? `主输入：${primaryFile?.name ?? '备注文本'}`
          : `Primary input: ${primaryFile?.name ?? 'notes'}`,
      )

      let nextParserResult: ParserResult | null = null
      const primaryIpa = files.find((item) => item.id === primaryFile?.id && item.kind === 'ipa')

      if (useLocalParser) {
        updateStage(
          'parser',
          'active',
          language === 'zh' ? '尝试连接本地解析器' : 'Connecting to local parser',
        )

        if (primaryIpa?.file) {
          nextParserResult = await callLocalParser(primaryIpa.file)
          setParserResult(nextParserResult)
          setParserConnection({
            status: 'ready',
            message:
              language === 'zh'
                ? '本地解析器在线，已提取结构化事实'
                : 'Local parser is online and returned structured facts',
          })
          updateStage(
            'parser',
            'done',
            nextParserResult.structure?.engine
              ? `${language === 'zh' ? '引擎' : 'Engine'}: ${nextParserResult.structure.engine}`
              : language === 'zh'
                ? '已完成 IPA 解析'
                : 'IPA parsed',
          )
        } else {
          setParserResult(null)
          updateStage(
            'parser',
            'error',
            language === 'zh'
              ? '没有可上传的 IPA 文件，回退到文本模式'
              : 'No uploaded IPA available, falling back to text mode',
          )
        }
      } else {
        setParserResult(null)
        updateStage(
          'parser',
          'done',
          language === 'zh' ? '已关闭本地解析器' : 'Local parser disabled',
        )
      }

      updateStage(
        'prompt',
        'active',
        language === 'zh' ? '提取可读文本并组织上下文' : 'Extracting readable text and building context',
      )
      const extractedText = await extractReadableText(files)
      const prompt = buildAnalysisPrompt(
        language,
        files,
        analysisNotes,
        extractedText,
        nextParserResult,
        marketIntel,
      )
      updateStage(
        'prompt',
        'done',
        nextParserResult
          ? language === 'zh'
            ? '已附加结构化 IPA 事实'
            : 'Structured IPA facts attached'
          : language === 'zh'
            ? '仅使用文本和备注'
            : 'Using text inputs and notes only',
      )

      updateStage(
        'analysis',
        'active',
        language === 'zh' ? `调用 ${providerConfig.label}` : `Calling ${providerConfig.label}`,
      )
      const text = await callAiProvider(selectedProvider, providerConfig, apiKeys[selectedProvider] ?? '', prompt)
      const parsed = hydrateAnalysis(normalizeAnalysis(safeJsonParse(text)), nextParserResult, language)
      updateStage(
        'analysis',
        'done',
        parsed.status ?? (language === 'zh' ? '拆解完成' : 'Analysis complete'),
      )

      updateStage(
        'brief',
        'active',
        language === 'zh' ? '整理 MVP 假设与任务' : 'Building MVP brief and task list',
      )
      setAnalysisResult(parsed)
      setRunState('done')
      updateStage(
        'brief',
        'done',
        language === 'zh' ? 'Brief 已更新并可导出' : 'Brief updated and ready to export',
      )
      setActiveView('brief')

      const snapshot = buildSnapshot()
      snapshot.analysisResult = parsed
      snapshot.parserResult = nextParserResult
      setSavedProjects((current) => [snapshot, ...current].slice(0, 8))
    } catch (error) {
      const message = friendlyError(error)
      setAnalysisError(message)
      setRunState('error')
      const activeStage =
        pipelineStages.find((item) => item.state === 'active')?.key ??
        'analysis'
      updateStage(activeStage, 'error', message)
    }
  }

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

  const briefCards = [
    [
      t.brief.cards[0][0],
      analysisResult?.risks?.[0] ??
        displayModules.find(([, , tone]) => tone === 'red' || tone === 'orange')?.[1] ??
        t.brief.cards[0][1],
    ],
    [t.brief.cards[1][0], displayOpportunities[0] ?? t.brief.cards[1][1]],
    [t.brief.cards[2][0], analysisResult?.mustValidate?.[0] ?? t.brief.cards[2][1]],
    [t.brief.cards[3][0], analysisResult?.notInMvp?.join('、') || t.brief.cards[3][1]],
  ]

  const checklistItems = analysisResult?.nextTasks?.length
    ? analysisResult.nextTasks
    : analysisResult?.mustValidate?.length
      ? analysisResult.mustValidate
      : t.brief.checklist

  const exportPayload = {
    projectName,
    language,
    createdAt: new Date().toISOString(),
    parserMode: useLocalParser ? 'local-parser' : 'text-only',
    provider: providerConfig.label,
    market: marketIntel
      ? {
          appId: marketIntel.appId,
          country: marketIntel.country,
          summary: summarizeMarketIntel(marketIntel, language),
          fetchedAt: marketIntel.fetchedAt,
          reviewThemes: marketIntel.reviewThemes,
        }
      : null,
    files: files.map((file) => ({
      name: file.name,
      kind: file.kind,
      size: file.size,
      primary: file.id === primaryFile?.id,
    })),
    packageSummary: analysisResult?.packageSummary ?? '',
    parserSummary: summarizeParserResult(parserResult, language),
    hypothesis: briefStatement,
    mustValidate: analysisResult?.mustValidate ?? [],
    notInMvp: analysisResult?.notInMvp ?? [],
    risks: analysisResult?.risks ?? [],
    nextTasks: analysisResult?.nextTasks ?? [],
    recommendation: analysisResult?.recommendation ?? '',
    recommendationReason: analysisResult?.recommendationReason ?? '',
  }

  function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportBrief(format: 'json' | 'md') {
    if (format === 'json') {
      downloadFile(
        JSON.stringify(exportPayload, null, 2),
        language === 'zh' ? 'ios-mvp-brief.zh.json' : 'ios-mvp-brief.en.json',
        'application/json',
      )
      return
    }

    const markdown = [
      '# iOS MVP Brief',
      '',
      `${language === 'zh' ? '项目' : 'Project'}: ${projectName}`,
      `${language === 'zh' ? '主假设' : 'Hypothesis'}: ${briefStatement}`,
      '',
      `## ${language === 'zh' ? '包体摘要' : 'Package Summary'}`,
      analysisResult?.packageSummary ?? summarizeParserResult(parserResult, language),
      '',
      `## ${language === 'zh' ? '必须验证' : 'Must Validate'}`,
      ...(analysisResult?.mustValidate ?? []).map((item) => `- ${item}`),
      '',
      `## ${language === 'zh' ? '暂不进入 MVP' : 'Not In MVP'}`,
      ...(analysisResult?.notInMvp ?? []).map((item) => `- ${item}`),
      '',
      `## ${language === 'zh' ? '风险' : 'Risks'}`,
      ...(analysisResult?.risks ?? []).map((item) => `- ${item}`),
      '',
      `## ${language === 'zh' ? '下一步' : 'Next Tasks'}`,
      ...(analysisResult?.nextTasks ?? []).map((item) => `- ${item}`),
      '',
      `## ${language === 'zh' ? '建议' : 'Recommendation'}`,
      `${analysisResult?.recommendation ?? ''}`,
      `${analysisResult?.recommendationReason ?? ''}`,
    ].join('\n')

    downloadFile(
      markdown,
      language === 'zh' ? 'ios-mvp-brief.zh.md' : 'ios-mvp-brief.en.md',
      'text/markdown',
    )
  }

  const agentArtifacts = [
    {
      name: t.agents.list[0][0],
      status:
        parserResult || !useLocalParser
          ? language === 'zh'
            ? '已完成'
            : 'Done'
          : runState === 'running'
            ? language === 'zh'
              ? '运行中'
              : 'Running'
            : language === 'zh'
              ? '等待'
              : 'Waiting',
      tone: parserResult || !useLocalParser ? 'blue' : 'gray',
      summary: analysisResult?.packageSummary ?? summarizeParserResult(parserResult, language),
      required: language === 'zh' ? 'IPA 文件或主文件元数据' : 'IPA binary or primary package metadata',
      output:
        parserResult?.analysisHints?.join(' ') ??
        (language === 'zh' ? '等待包体解析结果。' : 'Waiting for package facts.'),
    },
    {
      name: t.agents.list[1][0],
      status: marketIntel || analysisNotes.trim()
        ? language === 'zh'
          ? '已完成'
          : 'Done'
        : language === 'zh'
          ? '待补充'
          : 'Needs input',
      tone: marketIntel || analysisNotes.trim() ? 'orange' : 'gray',
      summary:
        (marketIntel?.metadata ? summarizeMarketIntel(marketIntel, language) : '') ||
        analysisNotes.trim() ||
        (language === 'zh'
          ? '请补充商店链接、评论、截图文案或试玩观察。'
          : 'Add store links, reviews, ad copy, or playtest notes.'),
      required: language === 'zh' ? '商店页、评论、市场反馈' : 'Store page, reviews, market notes',
      output: language === 'zh' ? '竞品市场信号与商业化线索。' : 'Market signals and monetization clues.',
    },
    {
      name: t.agents.list[2][0],
      status: displayLoop.length ? (language === 'zh' ? '已完成' : 'Done') : language === 'zh' ? '等待' : 'Waiting',
      tone: 'green',
      summary: displayLoop.join(' -> '),
      required: language === 'zh' ? '系统地图与首日目标' : 'System map and first-day goals',
      output: language === 'zh' ? '10 秒 / 30 秒 / 5 分钟循环。' : '10 sec / 30 sec / 5 min loop.',
    },
    {
      name: t.agents.list[3][0],
      status: analysisResult ? (language === 'zh' ? '已完成' : 'Done') : language === 'zh' ? '等待' : 'Waiting',
      tone: 'green',
      summary: briefStatement,
      required: language === 'zh' ? '竞争事实与创新空间' : 'Competitor facts and innovation space',
      output: (analysisResult?.notInMvp ?? []).join('、') || t.agents.list[3][1],
    },
    {
      name: t.agents.list[4][0],
      status: analysisResult?.risks?.length ? (language === 'zh' ? '已完成' : 'Done') : language === 'zh' ? '等待' : 'Waiting',
      tone: 'red',
      summary: analysisResult?.risks?.[0] ?? t.agents.list[4][1],
      required: language === 'zh' ? '引擎、框架、实现边界' : 'Engine, frameworks, implementation boundaries',
      output:
        parserResult?.structure?.engine
          ? `${language === 'zh' ? '推测技术栈' : 'Likely stack'}: ${parserResult.structure.engine}`
          : language === 'zh'
            ? '等待技术线索。'
            : 'Waiting for technical facts.',
    },
    {
      name: t.agents.list[5][0],
      status: analysisResult?.nextTasks?.length ? (language === 'zh' ? '已完成' : 'Done') : language === 'zh' ? '等待' : 'Waiting',
      tone: 'gray',
      summary: analysisResult?.nextTasks?.[0] ?? t.agents.list[5][1],
      required: language === 'zh' ? '已批准范围与主风险' : 'Approved scope and primary risks',
      output:
        analysisResult?.nextTasks?.join(' / ') ??
        (language === 'zh' ? '等待拆解结果。' : 'Waiting for analysis output.'),
    },
  ]
  const activeAgent = agentArtifacts[selectedAgent]
  const reviewRecommendation = analysisResult?.recommendation ?? t.review.recommendation
  const reviewReason = analysisResult?.recommendationReason ?? t.review.recommendationCopy
  const reviewFindings = [
    {
      label: language === 'zh' ? '包体事实' : 'Package fact',
      value: analysisResult?.packageSummary ?? summarizeParserResult(parserResult, language),
      tone: 'green',
    },
    {
      label: language === 'zh' ? '市场信号' : 'Market signal',
      value:
        marketIntel?.reviewThemes.length
          ? marketIntel.reviewThemes
              .map((theme) => `${theme.label} x${theme.mentions}`)
              .join(' / ')
          : marketIntel?.metadata
            ? summarizeMarketIntel(marketIntel, language)
            : t.review.findings[0][1],
      tone: 'orange',
    },
    {
      label: language === 'zh' ? '下一轮重点' : 'Next iteration focus',
      value: analysisResult?.nextTasks?.[0] ?? t.review.findings[2][1],
      tone: 'red',
    },
  ]
  const metricCards = [
    { value: String(files.length), label: language === 'zh' ? '输入材料数' : 'Inputs' },
    {
      value: String((analysisResult?.mustValidate ?? []).length || checklistItems.length),
      label: language === 'zh' ? '验证问题数' : 'Validation questions',
    },
  ]

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
                <button className="secondary-action" onClick={saveSnapshot}>
                  {language === 'zh' ? '保存快照' : 'Save snapshot'}
                </button>
                <button className="primary-action" onClick={startRun} disabled={runState === 'running'}>
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

                <div className="field-group">
                  <label>{language === 'zh' ? '项目名' : 'Project name'}</label>
                  <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                </div>

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
                  <div className="parser-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={useLocalParser}
                        onChange={(event) => setUseLocalParser(event.target.checked)}
                      />
                      <span>{language === 'zh' ? '启用本地 IPA 解析器' : 'Use local IPA parser'}</span>
                    </label>
                    <small className={`parser-state ${parserStatusDisplay.status}`}>
                      {parserStatusDisplay.message}
                    </small>
                  </div>

                  <div className="market-grid">
                    <div className="field-group">
                      <label>{language === 'zh' ? 'App Store 链接' : 'App Store URL'}</label>
                      <input
                        value={marketUrl}
                        onChange={(event) => {
                          const value = event.target.value
                          setMarketUrl(value)
                          if (!marketAppId) {
                            setMarketAppId(parseAppStoreId(value))
                          }
                        }}
                        placeholder="https://apps.apple.com/us/app/.../id1234567890"
                      />
                    </div>

                    <div className="field-group">
                      <label>{language === 'zh' ? 'App ID' : 'App ID'}</label>
                      <input
                        value={marketAppId}
                        onChange={(event) => setMarketAppId(event.target.value)}
                        placeholder="1234567890"
                      />
                    </div>

                    <div className="field-group">
                      <label>{language === 'zh' ? '国家区服' : 'Country'}</label>
                      <input
                        value={marketCountry}
                        onChange={(event) => setMarketCountry(event.target.value.toLowerCase())}
                        placeholder="us"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="file-actions">
                    <button className="secondary-action" onClick={loadMarketIntel}>
                      {language === 'zh' ? '抓取商店信息' : 'Fetch App Store data'}
                    </button>
                  </div>

                  {marketStatus && <p className="api-note">{marketStatus}</p>}
                  {marketIntel?.metadata && (
                    <div className="market-card">
                      <div className="market-card-header">
                        {marketIntel.metadata.artworkUrl && (
                          <img src={marketIntel.metadata.artworkUrl} alt={marketIntel.metadata.name} />
                        )}
                        <div>
                          <strong>{marketIntel.metadata.name}</strong>
                          <span>{marketIntel.metadata.developer}</span>
                          <span>
                            {marketIntel.metadata.genre}
                            {marketIntel.metadata.averageRating !== null &&
                              ` · ${marketIntel.metadata.averageRating.toFixed(1)} / 5`}
                          </span>
                        </div>
                      </div>
                      <p>{marketIntel.metadata.description.slice(0, 220)}</p>
                      {marketIntel.reviewThemes.length > 0 && (
                        <div className="theme-chip-row">
                          {marketIntel.reviewThemes.map((theme) => (
                            <span className={`theme-chip ${theme.tone}`} key={theme.label}>
                              {theme.label} x{theme.mentions}
                            </span>
                          ))}
                        </div>
                      )}
                      {marketIntel.reviews.length > 0 && (
                        <div className="review-snippets">
                          {marketIntel.reviews.slice(0, 3).map((review) => (
                            <article key={`${review.author}-${review.updated}`}>
                              <strong>
                                {review.title} · {review.rating}/5
                              </strong>
                              <span>{review.author}</span>
                              <p>{review.content.slice(0, 140)}</p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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

                <div className="file-actions">
                  <button className="secondary-action" onClick={clearInputs}>
                    {language === 'zh' ? '清空输入' : 'Clear inputs'}
                  </button>
                </div>

                <div className="file-stack">
                  {files.map((file) => (
                    <article className="file-row" key={file.id}>
                      <div>
                        <strong>{file.name}</strong>
                        <span>{t.fileKinds[file.kind]}</span>
                      </div>
                      <div className="file-row-actions">
                        <small>{file.size}</small>
                        <button
                          className={file.id === primaryFile?.id ? 'file-chip active' : 'file-chip'}
                          onClick={() => setPrimaryFileId(file.id)}
                        >
                          {file.id === primaryFile?.id
                            ? language === 'zh'
                              ? '主输入'
                              : 'Primary'
                            : language === 'zh'
                              ? '设为主输入'
                              : 'Set primary'}
                        </button>
                        <button className="file-chip" onClick={() => removeFile(file.id)}>
                          {language === 'zh' ? '移除' : 'Remove'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {savedProjects.length > 0 && (
                  <div className="history-list">
                    <h2>{language === 'zh' ? '最近快照' : 'Recent snapshots'}</h2>
                    {savedProjects.map((snapshot) => (
                      <article className="history-row" key={snapshot.id}>
                        <div>
                          <strong>{snapshot.projectName}</strong>
                          <span>{formatTimestamp(snapshot.createdAt, language)}</span>
                        </div>
                        <button className="file-chip active" onClick={() => loadSnapshot(snapshot)}>
                          {language === 'zh' ? '载入' : 'Load'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
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

                <div className="stage-list">
                  {displayedStages.map((stage) => (
                    <article className={`stage-row ${stage.state}`} key={stage.key}>
                      <strong>{stage.label}</strong>
                      <span>{stage.detail}</span>
                    </article>
                  ))}
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
                {analysisResult?.packageSummary && (
                  <p className="analysis-status">{analysisResult.packageSummary}</p>
                )}
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
                <button className="secondary-action" onClick={() => exportBrief('md')}>
                  Markdown
                </button>
                <button className="primary-action" onClick={() => exportBrief('json')}>
                  {language === 'zh' ? '导出 JSON' : 'Export JSON'}
                </button>
              </div>
            </header>

            <div className="brief-layout">
              <section className="panel brief-main">
                <h2>{t.brief.strategyTitle}</h2>
                <p className="brief-statement">{briefStatement}</p>

                <div className="brief-grid">
                  {briefCards.map(([label, value]) => (
                    <article key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="panel mvp-checklist">
                <h2>{t.brief.scopeTitle}</h2>
                {checklistItems.map((item) => (
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
                {agentArtifacts.map((agent, index) => (
                  <button
                    className={
                      selectedAgent === index
                        ? `agent-card selected ${agent.tone}`
                        : `agent-card ${agent.tone}`
                    }
                    key={agent.name}
                    onClick={() => setSelectedAgent(index)}
                  >
                    <span>{agent.status}</span>
                    <strong>{agent.name}</strong>
                    <small>{agent.summary}</small>
                  </button>
                ))}
              </section>

              <aside className="agent-inspector">
                <img src={productImage} alt={t.agents.imageAlt} className="agent-image" />
                <p className="eyebrow">{t.agents.selected}</p>
                <h2>{activeAgent.name}</h2>
                <p>{activeAgent.summary}</p>
                <div className="handoff-box">
                  <span>{t.agents.requiredInput}</span>
                  <strong>{activeAgent.required}</strong>
                </div>
                <div className="handoff-box">
                  <span>{t.agents.expectedOutput}</span>
                  <strong>{activeAgent.output}</strong>
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
                <button
                  className="primary-action"
                  onClick={() => {
                    setAnalysisNotes((current) =>
                      [current, '', ...(analysisResult?.nextTasks ?? [])].filter(Boolean).join('\n'),
                    )
                    setActiveView('deconstruct')
                  }}
                >
                  {t.review.action}
                </button>
              </div>
            </header>

            <div className="review-layout">
              <section className="decision-panel">
                <span>{t.review.recommendationLabel}</span>
                <strong>{reviewRecommendation}</strong>
                <p>{reviewReason}</p>
              </section>

              <section className="metric-panel">
                {metricCards.map((metric) => (
                  <article key={metric.label}>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </section>

              <section className="panel findings-panel">
                <h2>{t.review.findingsTitle}</h2>
                {reviewFindings.map((finding) => (
                  <article className={`finding ${finding.tone}`} key={finding.label}>
                    <span>{finding.label}</span>
                    <strong>{finding.value}</strong>
                  </article>
                ))}
              </section>

              <aside className="decision-actions">
                {t.review.decisions.map((decision, index) => (
                  <button
                    className={decision === reviewRecommendation || index === 1 ? 'recommended' : undefined}
                    key={decision}
                  >
                    {decision}
                  </button>
                ))}
                <p>{(analysisResult?.nextTasks ?? []).join(' / ') || t.review.next}</p>
              </aside>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
