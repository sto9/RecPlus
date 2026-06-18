<script setup lang="ts">
import type { Chart, SortDir, SortKey } from '../types'
import {
  ajRate,
  calcOverPower,
  formatDuration,
  lampLabel,
  levelLabel,
  maxOverPower,
  maxRate,
  scoreRank,
  showOverPower,
} from '../filters'

const props = defineProps<{
  charts: Chart[]
  startIndex: number
  scoreEnabled: boolean
  sortKey: SortKey
  sortDir: SortDir
}>()
const emit = defineEmits<{ sort: [key: SortKey] }>()

// ソート可能な列 (曲名〜ランプ)
const SORT_COLUMNS: { key: SortKey; label: string; align: string }[] = [
  { key: 'title', label: '曲名 / アーティスト', align: 'text-left' },
  { key: 'diff', label: '難易度', align: 'text-center' },
  { key: 'const', label: '定数', align: 'text-center' },
  { key: 'genre', label: 'ジャンル', align: 'text-center' },
  { key: 'video', label: '動画長', align: 'text-center' },
  { key: 'score', label: 'スコア / OP', align: 'text-right' },
  { key: 'lamp', label: 'ランプ', align: 'text-center' },
  { key: 'statMax', label: 'MAX率', align: 'text-right' },
  { key: 'statAj', label: 'AJ率', align: 'text-right' },
]

/** 達成率を小数1桁の % へ。null は '—'。 */
function fmtRate(r: number | null): string {
  return r == null ? '—' : `${r.toFixed(1)}%`
}
function fmtCount(n?: number): string {
  return n == null ? '' : n.toLocaleString()
}

function arrow(key: SortKey): string {
  if (props.sortKey !== key) return '↕'
  return props.sortDir === 'asc' ? '▲' : '▼'
}

function lampClass(lamp: string): string {
  switch (lamp) {
    case 'AJC':
      return 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
    case 'AJ':
      return 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300'
    case 'FC':
      return 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
    default:
      return 'text-slate-300'
  }
}

function rankClass(rank: string): string {
  if (rank.startsWith('SSS')) return 'text-amber-600 font-bold'
  if (rank.startsWith('SS')) return 'text-violet-600 font-semibold'
  if (rank.startsWith('S')) return 'text-sky-600'
  return 'text-slate-500'
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
          <th class="px-2 py-2.5 text-right font-semibold">#</th>
          <th
            v-for="col in SORT_COLUMNS"
            :key="col.key"
            class="select-none px-2 py-2.5 font-semibold whitespace-nowrap first:px-3"
            :class="col.align"
          >
            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-1 transition hover:text-violet-600"
              :class="sortKey === col.key ? 'text-violet-600' : ''"
              @click="emit('sort', col.key)"
            >
              <span>{{ col.label }}</span>
              <span class="text-[10px]" :class="sortKey === col.key ? 'text-violet-500' : 'text-slate-300'">
                {{ arrow(col.key) }}
              </span>
            </button>
          </th>
          <th class="px-2 py-2.5 text-center font-semibold whitespace-nowrap">保管所</th>
          <th class="px-2 py-2.5 text-center font-semibold whitespace-nowrap">動画</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(c, i) in charts"
          :key="c.id + c.diff"
          class="border-b border-slate-100 transition hover:bg-violet-50/40"
        >
          <td class="px-2 py-2 text-right text-xs text-slate-400 tabular-nums">
            {{ startIndex + i + 1 }}
          </td>
          <td class="max-w-[22rem] px-3 py-2">
            <div class="truncate font-medium text-slate-800" :title="c.title">
              {{ c.title }}
            </div>
            <div class="truncate text-xs text-slate-400" :title="c.artist">
              {{ c.artist }}
            </div>
          </td>
          <td class="px-2 py-2 text-center">
            <span
              class="inline-block rounded px-2 py-0.5 text-xs font-bold text-white"
              :class="c.diff === 'ULT' ? 'bg-slate-900 ring-1 ring-rose-500' : 'bg-violet-600'"
            >
              {{ c.diff }} {{ levelLabel(c.level) }}
            </span>
          </td>
          <td class="px-2 py-2 text-center tabular-nums text-slate-600">
            {{ c.isConstUnknown ? '?' : c.const.toFixed(1) }}
          </td>
          <td class="px-2 py-2 text-center text-xs text-slate-500 whitespace-nowrap">
            {{ c.genre }}
          </td>
          <td class="px-2 py-2 text-center tabular-nums text-slate-600">
            {{ formatDuration(c.videoLengthSec) }}
          </td>
          <td class="px-2 py-2 text-right tabular-nums">
            <template v-if="scoreEnabled">
              <div class="font-semibold text-slate-800">
                {{ c.played ? c.score.toLocaleString() : '—' }}
              </div>
              <div v-if="c.played" class="text-xs" :class="rankClass(scoreRank(c.score))">
                {{ scoreRank(c.score) }}
              </div>
              <div
                v-if="c.played"
                class="text-[11px] font-semibold text-emerald-600"
                title="単曲 OVER POWER / 理論値"
              >
                <template v-if="showOverPower(c)">
                  {{ calcOverPower(c).toFixed(2) }} / {{ maxOverPower(c).toFixed(2) }}
                </template>
                <span v-else class="text-slate-300">-</span>
              </div>
            </template>
            <span v-else class="text-xs text-slate-300">—</span>
          </td>
          <td class="px-2 py-2 text-center">
            <span
              class="inline-block rounded px-1.5 py-0.5 text-xs font-bold"
              :class="lampClass(lampLabel(c))"
            >
              {{ scoreEnabled ? lampLabel(c) : '-' }}
            </span>
          </td>
          <td
            class="px-2 py-2 text-right tabular-nums"
            :title="c.statMaxCount != null ? `${fmtCount(c.statMaxCount)} / ${fmtCount(c.statPlayCount)} 人` : ''"
          >
            <div class="font-semibold text-amber-600">{{ fmtRate(maxRate(c)) }}</div>
            <div v-if="c.statMaxCount != null" class="text-[11px] text-slate-400">
              {{ fmtCount(c.statMaxCount) }}人
            </div>
          </td>
          <td
            class="px-2 py-2 text-right tabular-nums"
            :title="c.statAjCount != null ? `${fmtCount(c.statAjCount)} / ${fmtCount(c.statPlayCount)} 人` : ''"
          >
            <div class="font-semibold text-yellow-600">{{ fmtRate(ajRate(c)) }}</div>
            <div v-if="c.statAjCount != null" class="text-[11px] text-slate-400">
              {{ fmtCount(c.statAjCount) }}人
            </div>
          </td>
          <td class="px-2 py-2 text-center">
            <a
              v-if="c.sdvxLink"
              :href="c.sdvxLink"
              target="_blank"
              rel="noopener noreferrer"
              class="text-lg text-amber-400 transition hover:text-amber-500"
              title="譜面保管所 (sdvx.in)"
              >★</a
            >
            <span v-else class="text-slate-200">★</span>
          </td>
          <td class="px-2 py-2 text-center">
            <a
              v-if="c.videoUrl"
              :href="c.videoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-lg text-rose-400 transition hover:text-rose-500"
              title="譜面動画"
              >★</a
            >
            <span v-else class="text-slate-200">★</span>
          </td>
        </tr>
        <tr v-if="charts.length === 0">
          <td colspan="12" class="px-4 py-12 text-center text-slate-400">
            条件に一致する譜面がありません。
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
