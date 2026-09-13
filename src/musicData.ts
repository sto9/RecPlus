// 全曲データに、譜面動画情報 (chunithm-videos.json) と達成人数の統計 (stats CSV) をマージする。
// 旧 GAS API (getAllMusic?includeVideos=true&stat=true) がサーバー側で行っていた処理の移植。
import type { ChartData, Song, TargetDiff, VideoBundle } from './types'

const SDVX_IN_BASE = 'https://sdvx.in/chunithm'

/** 譜面保管所 (sdvx.in) の譜面ページ URL */
export function sdvxChartUrl(sdvxId: string, diff: TargetDiff): string {
  if (diff === 'MAS') return `${SDVX_IN_BASE}/${sdvxId.slice(0, 2)}/${sdvxId}mst.htm`
  return `${SDVX_IN_BASE}/ult/${sdvxId}ult.htm`
}

/** 統計 CSV の列 (曲名,難易度,Lv.,プレイ人数,MAX,SSS,SS+,SS,S,AJ,FC) と ChartData のキーの対応 */
const STAT_COLUMNS: { idx: number; key: keyof StatEntry }[] = [
  { idx: 3, key: 'statPlayCount' },
  { idx: 4, key: 'statMaxCount' },
  { idx: 5, key: 'statSssCount' },
  { idx: 6, key: 'statSsPlusCount' },
  { idx: 7, key: 'statSsCount' },
  { idx: 8, key: 'statSCount' },
  { idx: 9, key: 'statAjCount' },
  { idx: 10, key: 'statFcCount' },
]
const STAT_TITLE_COL = 0

export type StatEntry = Pick<
  ChartData,
  | 'statPlayCount'
  | 'statMaxCount'
  | 'statSssCount'
  | 'statSsPlusCount'
  | 'statSsCount'
  | 'statSCount'
  | 'statAjCount'
  | 'statFcCount'
>

/** `title__diff` -> 統計 */
export type StatsMap = Map<string, StatEntry>

/** RFC 4180 風の CSV を行ごとの配列にする (ダブルクオート内のカンマ・改行・"" に対応) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** 統計 CSV (先頭行はヘッダー) を StatsMap に積む。曲名が空の行や列が足りない行は無視 */
export function addStatsCsv(map: StatsMap, csv: string, diff: TargetDiff): StatsMap {
  const lastCol = STAT_COLUMNS[STAT_COLUMNS.length - 1].idx
  const rows = parseCsv(csv)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length <= lastCol) continue
    const title = row[STAT_TITLE_COL]
    if (!title) continue
    const entry: StatEntry = {}
    for (const col of STAT_COLUMNS) {
      const n = Number(row[col.idx])
      if (row[col.idx] !== '' && Number.isFinite(n)) entry[col.key] = n
    }
    map.set(`${title}__${diff}`, entry)
  }
  return map
}

/**
 * 全曲データに動画情報と統計をマージした新しい配列を返す (元の配列は変更しない)。
 * - meta.videoLengthSec: MAS の動画長 (無ければ ULT のもの)
 * - data.MAS / data.ULT: sdvxLink, videoUrl, 統計 (stat*)
 */
export function mergeSongData(
  songs: Song[],
  videos: Record<string, VideoBundle> | null,
  stats: StatsMap | null,
): Song[] {
  return songs.map((song) => {
    const bundle = videos?.[song.meta.id]
    const meta = { ...song.meta }
    if (bundle) {
      const lengthSec = bundle.MAS?.videoLengthSec ?? bundle.ULT?.videoLengthSec
      if (lengthSec !== undefined) meta.videoLengthSec = lengthSec
    }
    const data: Song['data'] = { ...song.data }
    for (const diff of ['MAS', 'ULT'] as const) {
      const chart = song.data[diff]
      if (!chart) continue
      const merged: ChartData = { ...chart }
      if (bundle) {
        merged.sdvxLink = sdvxChartUrl(bundle.sdvxId, diff)
        const video = bundle[diff]
        if (video) merged.videoUrl = video.videoUrl
      }
      const stat = stats?.get(`${song.meta.title}__${diff}`)
      if (stat) Object.assign(merged, stat)
      data[diff] = merged
    }
    return { meta, data }
  })
}
