// ===== 全曲取得 API (chunirec ベース) のレスポンス型 =====

export interface SongMeta {
  id: string
  title: string
  genre: string
  artist: string
  release: string
  bpm: number
  /** 譜面動画の長さ(秒)。動画が無い曲では undefined。 */
  videoLengthSec?: number
}

export interface ChartData {
  level: number
  const: number
  maxcombo: number
  is_const_unknown: number
  /** 譜面保管所(sdvx.in)へのリンク */
  sdvxLink?: string
  /** 譜面動画(YouTube 等)へのリンク */
  videoUrl?: string
  /** 統計: プレイ人数 (統計 CSV がある譜面のみ) */
  statPlayCount?: number
  /** 統計: MAX(理論値)達成人数 */
  statMaxCount?: number
  statSssCount?: number
  statSsPlusCount?: number
  statSsCount?: number
  statSCount?: number
  /** 統計: AJ 達成人数 */
  statAjCount?: number
  statFcCount?: number
}

/** 難易度キー。本ツールでは MAS / ULT のみ扱う。 */
export type DiffKey = 'BAS' | 'ADV' | 'EXP' | 'MAS' | 'ULT' | 'WE'

export interface Song {
  meta: SongMeta
  data: Partial<Record<DiffKey, ChartData>>
}

export interface AllSongsResponse {
  songs: Song[]
  success: boolean
  last_updated?: string
  total_songs?: number
}

// ===== 譜面動画情報 (musics/chunithm-videos.json) =====

export interface VideoEntry {
  videoUrl: string
  videoLengthSec?: number
}

export interface VideoBundle {
  /** 譜面保管所 (sdvx.in) の曲 ID */
  sdvxId: string
  MAS?: VideoEntry
  ULT?: VideoEntry
}

export interface VideosJson {
  last_updated?: string
  /** chunirec の楽曲 ID -> 動画情報 */
  videos: Record<string, VideoBundle>
}

// ===== ユーザーデータ (chunirec records/showall.json) のレスポンス型 =====

export interface UserRecord {
  id: string
  diff: string
  title?: string
  score: number
  is_clear?: boolean | number
  is_fullcombo?: boolean | number
  is_alljustice?: boolean | number
  [key: string]: unknown
}

export interface ShowallResponse {
  records: UserRecord[]
  [key: string]: unknown
}

/** nurunchu.com API のエラーレスポンス */
export interface ApiError {
  success: false
  code?: string
  error?: string
  upstream?: 'rec' | 'support'
  upstreamStatus?: number
  upstreamBody?: string
}

// ===== 表示・絞り込み用にフラット化した譜面 =====

export type TargetDiff = 'MAS' | 'ULT'

/** ソート可能な列のキー (曲名〜ランプ) */
export type SortKey =
  | 'title'
  | 'diff'
  | 'const'
  | 'genre'
  | 'bpm'
  | 'video'
  | 'score'
  | 'lamp'
  | 'statMax'
  | 'statAj'

export type SortDir = 'asc' | 'desc'

export interface Chart {
  // 曲メタ
  id: string
  title: string
  genre: string
  artist: string
  release: string
  bpm: number
  videoLengthSec?: number
  // 譜面
  diff: TargetDiff
  level: number
  const: number
  isConstUnknown: boolean
  /** 同じ曲に MASTER 譜面が存在するか */
  hasMaster: boolean
  /** 同じ曲に ULTIMA 譜面が存在するか */
  hasUltima: boolean
  sdvxLink?: string
  videoUrl?: string
  // 統計 (stat=true 時のみ。未取得は undefined)
  statPlayCount?: number
  statMaxCount?: number
  statAjCount?: number
  // ユーザースコア (未取得・未プレイ時は played=false)
  score: number
  isFullcombo: boolean
  isAlljustice: boolean
  played: boolean
  // OP 表示用 (同一曲の MAS/ULT を横断した値。未プレイ・定数なしは null)
  masterOp: number | null
  ultimaOp: number | null
  // 各難易度の理論値 OP (定数が入っていれば算出、無ければ null)
  masterTheoreticalOp: number | null
  ultimaTheoreticalOp: number | null
}
