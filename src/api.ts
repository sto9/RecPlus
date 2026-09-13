import type {
  AllSongsResponse,
  ApiError,
  Chart,
  ShowallResponse,
  Song,
  TargetDiff,
  UserRecord,
  VideosJson,
} from './types'
import { calcOverPower, maxOverPower } from './filters'
import { addStatsCsv, mergeSongData, type StatsMap } from './musicData'

// nurunchu.com API (https://nurunchu.com/docs/api/)
const API_BASE = 'https://nurunchu.com/api/v1'
// 全曲データ (chunirec ベース)
const SONGS_URL = `${API_BASE}/otoge-music/chunithm`
// 譜面動画情報 (ChuniVideoAppender の出力)
const VIDEOS_URL = `${API_BASE}/otoge-music/files/musics/chunithm-videos.json`
// 達成人数の統計 (chunirec の CSV)
const STATS_URLS: Record<TargetDiff, string> = {
  MAS: `${API_BASE}/otoge-music/files/stats/records_stat_mas_num.csv`,
  ULT: `${API_BASE}/otoge-music/files/stats/records_stat_ult_num.csv`,
}
// ユーザーデータ (chunirec / chunisupport のプロキシ)
const USER_DATA_URL = `${API_BASE}/chunithm-userdata-proxy`

const TARGET_DIFFS: TargetDiff[] = ['MAS', 'ULT']

// レコードの取得元。'rec' = chunirec (既定)、'support' = chunisupport
export type RecordSource = 'rec' | 'support'

/**
 * 任意ファイルを取得する。未登録 (404) やネットワークエラーは null にして、全曲データの表示自体は止めない。
 */
async function fetchOptional(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      if (res.status !== 404) console.warn(`${url}: HTTP ${res.status}`)
      return null
    }
    return res
  } catch (e) {
    console.warn(`${url}: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

/** 全曲データを取得し、動画情報と統計をマージして返す。 */
export async function fetchAllSongs(): Promise<Song[]> {
  const [songsRes, videosRes, masRes, ultRes] = await Promise.all([
    fetch(SONGS_URL),
    fetchOptional(VIDEOS_URL),
    fetchOptional(STATS_URLS.MAS),
    fetchOptional(STATS_URLS.ULT),
  ])
  if (!songsRes.ok) {
    throw new Error(`全曲データの取得に失敗しました (HTTP ${songsRes.status})`)
  }
  const json: AllSongsResponse = await songsRes.json()
  if (!json || !Array.isArray(json.songs)) {
    throw new Error('全曲データの形式が不正です')
  }

  let videos: VideosJson['videos'] | null = null
  if (videosRes) {
    try {
      const parsed: VideosJson = await videosRes.json()
      if (parsed && typeof parsed.videos === 'object') videos = parsed.videos
    } catch (e) {
      console.warn('動画情報の解析に失敗しました', e)
    }
  }

  let stats: StatsMap | null = null
  for (const [diff, res] of [
    ['MAS', masRes],
    ['ULT', ultRes],
  ] as const) {
    if (!res) continue
    try {
      stats = addStatsCsv(stats ?? new Map(), await res.text(), diff)
    } catch (e) {
      console.warn(`統計 (${diff}) の解析に失敗しました`, e)
    }
  }

  return mergeSongData(json.songs, videos, stats)
}

export class UserDataError extends Error {}

/**
 * ユーザーの譜面ごとのプレイ記録 (showall) を取得する。
 * API がエラー (4xx/5xx) を返した場合や records が無い場合は UserDataError を投げる。
 */
export async function fetchUserRecords(
  userName: string,
  source: RecordSource = 'rec',
): Promise<UserRecord[]> {
  const params = new URLSearchParams({ user_name: userName, source })
  let res: Response
  try {
    res = await fetch(`${USER_DATA_URL}?${params.toString()}`)
  } catch {
    throw new UserDataError('ユーザーデータの取得に失敗しました (ネットワークエラー)')
  }
  const json: ShowallResponse | ApiError | null = await res.json().catch(() => null)

  if (!res.ok) {
    const err = (json ?? {}) as ApiError
    const status = err.upstreamStatus ?? res.status
    if (status === 404) {
      throw new UserDataError('該当するユーザー ID が見つかりませんでした。')
    }
    if (status === 403) {
      throw new UserDataError(
        'このユーザーのデータは非公開、またはアクセスが許可されていません。',
      )
    }
    throw new UserDataError(
      `ユーザーデータの取得に失敗しました (HTTP ${res.status}${
        err.upstreamStatus ? ` / upstream ${err.upstreamStatus}` : ''
      })`,
    )
  }

  if (!json || !('records' in json) || !Array.isArray((json as ShowallResponse).records)) {
    throw new UserDataError('譜面ごとのスコアを取得できませんでした。')
  }

  return (json as ShowallResponse).records
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === '1'
}

/**
 * 全曲データと(任意の)ユーザー記録をマージし、MASTER/ULTIMA 譜面の一覧を作る。
 * userRecords が null の場合はスコア未取得 (played=false) として扱う。
 */
export function buildCharts(
  songs: Song[],
  userRecords: UserRecord[] | null,
): Chart[] {
  // id + diff -> record の索引。
  // chunisupport の id は chunirec と別体系なので、曲名 + diff でも索引を作り
  // id で見つからない場合のフォールバックに使う (現データでは曲名はユニーク)。
  const recordMap = new Map<string, UserRecord>()
  const titleMap = new Map<string, UserRecord>()
  if (userRecords) {
    for (const r of userRecords) {
      recordMap.set(`${r.id}__${r.diff}`, r)
      if (r.title) titleMap.set(`${r.title}__${r.diff}`, r)
    }
  }

  const charts: Chart[] = []
  for (const song of songs) {
    const hasUltima = !!song.data.ULT
    const hasMaster = !!song.data.MAS

    // まず曲内の MAS/ULT の Chart を組み立てる
    const built: Partial<Record<TargetDiff, Chart>> = {}
    for (const diff of TARGET_DIFFS) {
      const data = song.data[diff]
      if (!data) continue

      const rec =
        recordMap.get(`${song.meta.id}__${diff}`) ??
        titleMap.get(`${song.meta.title}__${diff}`)
      const played = !!rec
      built[diff] = {
        id: song.meta.id,
        title: song.meta.title,
        genre: song.meta.genre,
        artist: song.meta.artist,
        release: song.meta.release,
        bpm: song.meta.bpm,
        videoLengthSec: song.meta.videoLengthSec,
        diff,
        level: data.level,
        const: data.const,
        isConstUnknown: !!data.is_const_unknown,
        hasMaster,
        hasUltima,
        sdvxLink: data.sdvxLink,
        videoUrl: data.videoUrl,
        statPlayCount: data.statPlayCount,
        statMaxCount: data.statMaxCount,
        statAjCount: data.statAjCount,
        score: rec ? Number(rec.score) || 0 : 0,
        isFullcombo: rec ? truthy(rec.is_fullcombo) : false,
        isAlljustice: rec ? truthy(rec.is_alljustice) : false,
        played,
        masterOp: null,
        ultimaOp: null,
        masterTheoreticalOp: null,
        ultimaTheoreticalOp: null,
      }
    }

    // 曲横断の OP を計算 (プレイ済みかつ定数が入っている譜面。暫定定数も対象)
    const opOf = (ch?: Chart): number | null =>
      ch && ch.played && ch.const > 0 ? calcOverPower(ch) : null
    const theoOf = (ch?: Chart): number | null =>
      ch && ch.const > 0 ? maxOverPower(ch) : null
    const masterOp = opOf(built.MAS)
    const ultimaOp = opOf(built.ULT)
    const masterTheoreticalOp = theoOf(built.MAS)
    const ultimaTheoreticalOp = theoOf(built.ULT)

    for (const diff of TARGET_DIFFS) {
      const ch = built[diff]
      if (!ch) continue
      ch.masterOp = masterOp
      ch.ultimaOp = ultimaOp
      ch.masterTheoreticalOp = masterTheoreticalOp
      ch.ultimaTheoreticalOp = ultimaTheoreticalOp
      charts.push(ch)
    }
  }
  return charts
}
