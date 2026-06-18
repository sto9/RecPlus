import type {
  AllSongsResponse,
  Chart,
  ProxyError,
  ShowallResponse,
  Song,
  TargetDiff,
  UserRecord,
} from './types'

// chunirec ベースの全曲取得 API (動画情報込み)
const ALL_SONGS_URL =
  'https://script.google.com/macros/s/AKfycbwoMdrHk6pYIlF_QVuDrju2a9YnHOb9nkxs8Zz4fMzYJDhUCL1o_uMJFYxwHYu4zDYc/exec?gameType=chunithm&includeVideos=true&stat=true'

// chunirec のユーザーデータ取得 (records/showall.json をプロキシ)
const USER_DATA_BASE_URL =
  'https://script.google.com/macros/s/AKfycbymXozLW1AlhIGTm8Co1BIvc0t1bArK9vppmTlF1r-OTkItibwsYbYrfoEsZPMA-i6HMw/exec'

const TARGET_DIFFS: TargetDiff[] = ['MAS', 'ULT']

/** 全曲データを取得する。 */
export async function fetchAllSongs(): Promise<Song[]> {
  const res = await fetch(ALL_SONGS_URL)
  if (!res.ok) {
    throw new Error(`全曲データの取得に失敗しました (HTTP ${res.status})`)
  }
  const json: AllSongsResponse = await res.json()
  if (!json || !Array.isArray(json.songs)) {
    throw new Error('全曲データの形式が不正です')
  }
  return json.songs
}

export class UserDataError extends Error {}

/**
 * ユーザーの譜面ごとのプレイ記録 (showall) を取得する。
 * proxy が profile を返した等で records が無い場合は UserDataError を投げる。
 */
export async function fetchUserRecords(userName: string): Promise<UserRecord[]> {
  const url = `${USER_DATA_BASE_URL}?user_name=${encodeURIComponent(userName)}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new UserDataError(`ユーザーデータの取得に失敗しました (HTTP ${res.status})`)
  }
  const json: ShowallResponse | ProxyError = await res.json()

  if ('success' in json && json.success === false) {
    const err = json as ProxyError
    if (err.upstreamStatus === 404) {
      throw new UserDataError('該当するユーザー ID が見つかりませんでした。')
    }
    if (err.upstreamStatus === 403) {
      throw new UserDataError(
        'このユーザーのデータは非公開、またはアクセスが許可されていません。',
      )
    }
    throw new UserDataError(
      `ユーザーデータの取得に失敗しました${
        err.upstreamStatus ? ` (upstream ${err.upstreamStatus})` : ''
      }`,
    )
  }

  if (!('records' in json) || !Array.isArray((json as ShowallResponse).records)) {
    // proxy が showall ではなく profile を返している等
    throw new UserDataError(
      '譜面ごとのスコアを取得できませんでした。proxy が showall.json を返すよう設定されているか確認してください。',
    )
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
  // id + diff -> record の索引
  const recordMap = new Map<string, UserRecord>()
  if (userRecords) {
    for (const r of userRecords) {
      recordMap.set(`${r.id}__${r.diff}`, r)
    }
  }

  const charts: Chart[] = []
  for (const song of songs) {
    const hasUltima = !!song.data.ULT
    for (const diff of TARGET_DIFFS) {
      const data = song.data[diff]
      if (!data) continue

      const rec = recordMap.get(`${song.meta.id}__${diff}`)
      const played = !!rec
      charts.push({
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
      })
    }
  }
  return charts
}
