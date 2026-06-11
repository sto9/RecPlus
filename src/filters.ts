import type { Chart } from './types'

// MASTER / ULTIMA 譜面が属する 7 ジャンル (WORLD'S END は対象外)
export const GENRES = [
  'POPS&ANIME',
  'niconico',
  '東方Project',
  'VARIETY',
  'イロドリミドリ',
  'ゲキマイ',
  'ORIGINAL',
] as const
export type Genre = (typeof GENRES)[number]

// レベル選択肢 (内部値は数値。10.5 = 「10+」)
export const LEVEL_OPTIONS = [
  { value: 10, label: '10' },
  { value: 10.5, label: '10+' },
  { value: 11, label: '11' },
  { value: 11.5, label: '11+' },
  { value: 12, label: '12' },
  { value: 12.5, label: '12+' },
  { value: 13, label: '13' },
  { value: 13.5, label: '13+' },
  { value: 14, label: '14' },
  { value: 14.5, label: '14+' },
  { value: 15, label: '15' },
  { value: 15.5, label: '15+' },
  { value: 16, label: '16' },
] as const

// 達成基準 (ChuniRandomTool 準拠)
export const ACHIEVEMENT_OPTIONS = [
  { value: 'all', label: '指定なし' },
  { value: 'AJC', label: '理論値' },
  { value: '99AJ', label: '99AJ' },
  { value: 'AJ', label: 'AJ' },
  { value: 'SSS+', label: 'SSS+' },
  { value: 'SSS', label: 'SSS' },
  { value: 'SS+', label: 'SS+' },
  { value: 'SS', label: 'SS' },
] as const
export type AchievementKey = (typeof ACHIEVEMENT_OPTIONS)[number]['value']

export interface FilterState {
  // 曲名検索 (部分一致, 空白無視)
  titleQuery: string
  // レベル / 定数
  useConst: boolean
  levelLower: number
  levelUpper: number
  constLower: number
  constUpper: number
  // 難易度
  includeUltima: boolean
  // ジャンル
  genres: Record<Genre, boolean>
  // 達成済 / 未達成 (ユーザースコア依存)
  achieved: AchievementKey
  unachieved: AchievementKey
  // スコア範囲 (空は null)
  scoreLower: number | null
  scoreUpper: number | null
  // 動画の長さ(秒, 空は null)
  videoLenMin: number | null
  videoLenMax: number | null
  // 未プレイ除外
  excludeUnplayed: boolean
  // ULTIMA がある曲の MASTER を除外
  excludeMasterWithUltima: boolean
}

export function defaultFilterState(): FilterState {
  return {
    titleQuery: '',
    useConst: false,
    levelLower: 13,
    levelUpper: 15,
    constLower: 13.0,
    constUpper: 15.4,
    includeUltima: true,
    genres: {
      'POPS&ANIME': true,
      niconico: true,
      東方Project: true,
      VARIETY: true,
      イロドリミドリ: true,
      ゲキマイ: true,
      ORIGINAL: true,
    },
    achieved: 'all',
    unachieved: 'all',
    scoreLower: null,
    scoreUpper: null,
    videoLenMin: null,
    videoLenMax: null,
    excludeUnplayed: false,
    excludeMasterWithUltima: false,
  }
}

/** 譜面が達成基準 key を満たしているか */
function meetsAchievement(chart: Chart, key: AchievementKey): boolean {
  switch (key) {
    case 'AJC':
      return chart.score >= 1010000
    case '99AJ':
      return chart.isAlljustice && chart.score >= 1009900
    case 'AJ':
      return chart.isAlljustice
    case 'SSS+':
      return chart.score >= 1009000
    case 'SSS':
      return chart.score >= 1007500
    case 'SS+':
      return chart.score >= 1005000
    case 'SS':
      return chart.score >= 1000000
    case 'all':
      return true
  }
}

/** 空文字・NaN を null に正規化した数値を返す */
function numOrNull(v: number | null): number | null {
  if (v === null || (v as unknown) === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** 曲名検索用の正規化 (空白除去 + 小文字化) */
function normalizeTitle(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

export function filterCharts(charts: Chart[], f: FilterState): Chart[] {
  const titleQuery = normalizeTitle(f.titleQuery)
  const scoreLower = numOrNull(f.scoreLower)
  const scoreUpper = numOrNull(f.scoreUpper)
  const videoLenMin = numOrNull(f.videoLenMin)
  const videoLenMax = numOrNull(f.videoLenMax)
  const constLower = numOrNull(f.constLower)
  const constUpper = numOrNull(f.constUpper)

  return charts.filter((c) => {
    // 曲名検索 (部分一致, 空白無視)
    if (titleQuery && !normalizeTitle(c.title).includes(titleQuery)) return false

    // 難易度 (ULTIMA を含むか)
    if (c.diff === 'ULT' && !f.includeUltima) return false

    // レベル / 定数
    if (f.useConst) {
      // 定数不明の譜面は定数指定では除外
      if (c.isConstUnknown) return false
      if (constLower !== null && c.const < constLower) return false
      if (constUpper !== null && c.const > constUpper) return false
    } else {
      if (c.level < f.levelLower || c.level > f.levelUpper) return false
    }

    // ジャンル
    if (!(c.genre in f.genres) || !f.genres[c.genre as Genre]) return false

    // 達成済 (done_X): 基準を満たす譜面のみ
    if (f.achieved !== 'all' && !meetsAchievement(c, f.achieved)) return false
    // 未達成 (notdone_X): 基準を満たす譜面を除外
    if (f.unachieved !== 'all' && meetsAchievement(c, f.unachieved)) return false

    // スコア範囲
    if (scoreLower !== null && c.score < scoreLower) return false
    if (scoreUpper !== null && c.score > scoreUpper) return false

    // 動画の長さ
    if (videoLenMin !== null || videoLenMax !== null) {
      if (c.videoLengthSec == null) return false
      if (videoLenMin !== null && c.videoLengthSec < videoLenMin) return false
      if (videoLenMax !== null && c.videoLengthSec > videoLenMax) return false
    }

    // 未プレイ除外
    if (f.excludeUnplayed && !c.played) return false

    // ULTIMA がある曲の MASTER を除外
    if (f.excludeMasterWithUltima && c.diff === 'MAS' && c.hasUltima) return false

    return true
  })
}

// ===== 表示用ヘルパー =====

/** 数値レベルを表示ラベルへ (12.5 -> "12+") */
export function levelLabel(level: number): string {
  const base = Math.floor(level)
  return Number.isInteger(level) ? `${base}` : `${base}+`
}

/** スコアからランクを返す */
export function scoreRank(score: number): string {
  if (score >= 1009000) return 'SSS+'
  if (score >= 1007500) return 'SSS'
  if (score >= 1005000) return 'SS+'
  if (score >= 1000000) return 'SS'
  if (score >= 990000) return 'S+'
  if (score >= 975000) return 'S'
  if (score >= 950000) return 'AAA'
  if (score >= 925000) return 'AA'
  if (score >= 900000) return 'A'
  if (score >= 800000) return 'BBB'
  if (score >= 700000) return 'BB'
  if (score >= 500000) return 'B'
  return ''
}

/** ランプ (AJC > AJ > FC > -) */
export function lampLabel(chart: Chart): string {
  if (chart.score >= 1010000) return 'AJC'
  if (chart.isAlljustice) return 'AJ'
  if (chart.isFullcombo) return 'FC'
  return '-'
}

/** 秒を mm:ss へ */
export function formatDuration(sec?: number): string {
  if (sec == null) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
