<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  pageCount: number
}>()
const emit = defineEmits<{ 'update:page': [value: number] }>()

// 表示するページ番号 (現在ページの前後 + 端)
const pages = computed<(number | '…')[]>(() => {
  const total = props.pageCount
  const cur = props.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, 2, total - 1, total, cur - 1, cur, cur + 1])
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
})

function go(p: number) {
  if (p < 1 || p > props.pageCount || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <nav v-if="pageCount > 1" class="flex flex-wrap items-center justify-center gap-1.5">
    <button
      type="button"
      class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition enabled:hover:bg-slate-100 disabled:opacity-40"
      :disabled="page <= 1"
      @click="go(page - 1)"
    >
      前へ
    </button>

    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="px-2 text-slate-400">…</span>
      <button
        v-else
        type="button"
        class="min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition"
        :class="
          p === page
            ? 'bg-violet-600 text-white shadow-sm'
            : 'text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
        "
        @click="go(p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      type="button"
      class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition enabled:hover:bg-slate-100 disabled:opacity-40"
      :disabled="page >= pageCount"
      @click="go(page + 1)"
    >
      次へ
    </button>
  </nav>
</template>
