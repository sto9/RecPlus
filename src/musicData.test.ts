import { describe, expect, it } from 'vitest'
import { addStatsCsv, mergeSongData, parseCsv, sdvxChartUrl } from './musicData'
import type { Song } from './types'

describe('parseCsv', () => {
  it('カンマ区切り・クオート・改行・BOM を扱う', () => {
    const rows = parseCsv('﻿a,b,c\r\n"x, y","he said ""hi""",3\nlast,,\n')
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'he said "hi"', '3'],
      ['last', '', ''],
    ])
  })
})

describe('addStatsCsv', () => {
  const csv = [
    '曲名,難易度,Lv.,プレイ人数,MAX,SSS,SS+,SS,S,AJ,FC',
    'Song A,MASTER,13,1000,10,500,600,700,900,300,400',
    ',MASTER,13,1,1,1,1,1,1,1,1',
    'Short,MASTER,13',
  ].join('\n')

  it('曲名 + 難易度で引ける統計を作る (空の曲名・列不足の行は無視)', () => {
    const map = addStatsCsv(new Map(), csv, 'MAS')
    expect([...map.keys()]).toEqual(['Song A__MAS'])
    expect(map.get('Song A__MAS')).toEqual({
      statPlayCount: 1000,
      statMaxCount: 10,
      statSssCount: 500,
      statSsPlusCount: 600,
      statSsCount: 700,
      statSCount: 900,
      statAjCount: 300,
      statFcCount: 400,
    })
  })
})

describe('mergeSongData', () => {
  const songs: Song[] = [
    {
      meta: { id: 'id1', title: 'Song A', genre: 'POPS&ANIME', artist: 'X', release: '2020-01-01', bpm: 150 },
      data: {
        EXP: { level: 10, const: 10, maxcombo: 500, is_const_unknown: 0 },
        MAS: { level: 13, const: 13.2, maxcombo: 900, is_const_unknown: 0 },
        ULT: { level: 14, const: 14.1, maxcombo: 1000, is_const_unknown: 0 },
      },
    },
    {
      meta: { id: 'id2', title: 'Song B', genre: 'VARIETY', artist: 'Y', release: '2020-01-01', bpm: 120 },
      data: { MAS: { level: 12, const: 12.5, maxcombo: 800, is_const_unknown: 0 } },
    },
  ]
  const videos = {
    id1: {
      sdvxId: '01046',
      MAS: { videoUrl: 'https://www.youtube.com/watch?v=aaa', videoLengthSec: 133 },
      ULT: { videoUrl: 'https://www.youtube.com/watch?v=bbb', videoLengthSec: 133 },
    },
  }
  const stats = addStatsCsv(
    addStatsCsv(new Map(), '曲名,難易度,Lv.,プレイ人数,MAX,SSS,SS+,SS,S,AJ,FC\nSong A,MASTER,13,100,1,2,3,4,5,6,7\n', 'MAS'),
    '曲名,難易度,Lv.,プレイ人数,MAX,SSS,SS+,SS,S,AJ,FC\nSong A,ULTIMA,14,50,0,1,2,3,4,5,6\n',
    'ULT',
  )

  it('動画情報と統計を MAS / ULT にマージし、他の難易度と元データは変えない', () => {
    const merged = mergeSongData(songs, videos, stats)
    expect(merged[0].meta.videoLengthSec).toBe(133)
    expect(merged[0].data.MAS).toMatchObject({
      level: 13,
      sdvxLink: 'https://sdvx.in/chunithm/01/01046mst.htm',
      videoUrl: 'https://www.youtube.com/watch?v=aaa',
      statPlayCount: 100,
      statMaxCount: 1,
      statAjCount: 6,
    })
    expect(merged[0].data.ULT).toMatchObject({
      sdvxLink: 'https://sdvx.in/chunithm/ult/01046ult.htm',
      videoUrl: 'https://www.youtube.com/watch?v=bbb',
      statPlayCount: 50,
      statAjCount: 5,
    })
    expect(merged[0].data.EXP).toEqual(songs[0].data.EXP)
    // 元の配列は変更されない
    expect(songs[0].meta.videoLengthSec).toBeUndefined()
    expect(songs[0].data.MAS!.sdvxLink).toBeUndefined()
  })

  it('動画・統計が無い曲はそのまま', () => {
    const merged = mergeSongData(songs, videos, stats)
    expect(merged[1].meta.videoLengthSec).toBeUndefined()
    expect(merged[1].data.MAS).toEqual(songs[1].data.MAS)
  })

  it('動画情報・統計が null でも動く', () => {
    const merged = mergeSongData(songs, null, null)
    expect(merged).toEqual(songs)
  })

  it('ULT にしか動画長が無い場合は ULT の値を使う', () => {
    const merged = mergeSongData(songs, { id1: { sdvxId: '01046', ULT: { videoUrl: 'u', videoLengthSec: 200 } } }, null)
    expect(merged[0].meta.videoLengthSec).toBe(200)
    expect(merged[0].data.MAS!.videoUrl).toBeUndefined()
    expect(merged[0].data.MAS!.sdvxLink).toBe(sdvxChartUrl('01046', 'MAS'))
  })
})
