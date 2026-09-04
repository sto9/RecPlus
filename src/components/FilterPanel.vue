<script setup lang="ts">
import { ref } from 'vue'
import {
  ACHIEVEMENT_OPTIONS,
  GENRES,
  LEVEL_OPTIONS,
  type FilterState,
} from '../filters'

const filter = defineModel<FilterState>({ required: true })

defineProps<{ scoreEnabled: boolean }>()
const emit = defineEmits<{ reset: [] }>()

const advancedOpen = ref(true)

function allGenres(on: boolean) {
  for (const g of GENRES) filter.value.genres[g] = on
}
</script>

<template>
  <div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
    <!-- 曲名検索 -->
    <div class="border-b border-slate-100 p-4 sm:p-5">
      <h3 class="mb-3 text-sm font-bold text-slate-700">曲名検索</h3>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
        <input
          v-model="filter.titleQuery"
          type="search"
          class="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      </div>
    </div>

    <!-- レベル / 定数 -->
    <div class="border-b border-slate-100 p-4 sm:p-5">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-700">レベル / 定数</h3>
        <label class="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            v-model="filter.useConst"
            class="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          定数で指定
        </label>
      </div>

      <div v-if="!filter.useConst" class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 text-xs text-slate-500">
          <span>以上</span>
          <select
            v-model.number="filter.levelLower"
            class="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            <option v-for="o in LEVEL_OPTIONS" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
        <span class="pb-2 text-slate-400">〜</span>
        <label class="flex flex-col gap-1 text-xs text-slate-500">
          <span>以下</span>
          <select
            v-model.number="filter.levelUpper"
            class="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            <option v-for="o in LEVEL_OPTIONS" :key="o.value" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
      </div>

      <div v-else class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 text-xs text-slate-500">
          <span>以上</span>
          <input
            type="number"
            step="0.1"
            v-model.number="filter.constLower"
            class="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </label>
        <span class="pb-2 text-slate-400">〜</span>
        <label class="flex flex-col gap-1 text-xs text-slate-500">
          <span>以下</span>
          <input
            type="number"
            step="0.1"
            v-model.number="filter.constUpper"
            class="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </label>
      </div>
    </div>

    <!-- 難易度 (MASTER / ULTIMA) -->
    <div class="border-b border-slate-100 p-4 sm:p-5">
      <h3 class="mb-3 text-sm font-bold text-slate-700">難易度</h3>
      <div class="flex flex-wrap gap-2">
        <label
          class="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition"
          :class="filter.includeMaster ? 'bg-master text-white' : 'bg-slate-100 text-slate-500'"
        >
          <input type="checkbox" v-model="filter.includeMaster" class="hidden" />
          MASTER
        </label>
        <label
          class="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition"
          :class="filter.includeUltima ? 'bg-slate-900 text-white ring-1 ring-rose-500' : 'bg-slate-100 text-slate-500'"
        >
          <input type="checkbox" v-model="filter.includeUltima" class="hidden" />
          ULTIMA
        </label>
      </div>
      <label
        class="mt-3 flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-slate-600"
      >
        <input
          type="checkbox"
          v-model="filter.excludeMasterWithUltima"
          class="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
        ULTIMA がある曲の MASTER を除外
      </label>
    </div>

    <!-- ジャンル -->
    <div class="border-b border-slate-100 p-4 sm:p-5">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-700">ジャンル</h3>
        <div class="flex gap-2 text-xs">
          <button
            type="button"
            class="text-violet-600 hover:underline"
            @click="allGenres(true)"
          >
            全選択
          </button>
          <button
            type="button"
            class="text-slate-400 hover:underline"
            @click="allGenres(false)"
          >
            全解除
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <label
          v-for="g in GENRES"
          :key="g"
          class="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition"
          :class="
            filter.genres[g]
              ? 'bg-violet-600 text-white'
              : 'bg-slate-100 text-slate-500'
          "
        >
          <input type="checkbox" v-model="filter.genres[g]" class="hidden" />
          {{ g }}
        </label>
      </div>
    </div>

    <!-- 詳細フィルタ -->
    <div class="p-4 sm:p-5">
      <div class="mb-1 flex items-center justify-between">
        <button
          type="button"
          class="text-sm font-bold text-slate-700"
          @click="advancedOpen = !advancedOpen"
        >
          詳細フィルタ
        </button>
        <button
          type="button"
          class="text-slate-400 transition"
          :class="advancedOpen ? 'rotate-180' : ''"
          @click="advancedOpen = !advancedOpen"
        >
          ▾
        </button>
      </div>

      <div v-show="advancedOpen" class="mt-4 space-y-5">
        <!-- 達成済 / 未達成 -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" :class="!scoreEnabled && 'opacity-50'">
          <label class="flex flex-col gap-1 text-xs text-slate-500">
            <span>達成済</span>
            <select
              v-model="filter.achieved"
              :disabled="!scoreEnabled"
              class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:bg-slate-50"
            >
              <option v-for="o in ACHIEVEMENT_OPTIONS" :key="o.value" :value="o.value">
                {{ o.value === 'all' ? '指定なし' : '既' + o.label }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-xs text-slate-500">
            <span>未達成</span>
            <select
              v-model="filter.unachieved"
              :disabled="!scoreEnabled"
              class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:bg-slate-50"
            >
              <option v-for="o in ACHIEVEMENT_OPTIONS" :key="o.value" :value="o.value">
                {{ o.value === 'all' ? '指定なし' : '未' + o.label }}
              </option>
            </select>
          </label>
        </div>

        <!-- スコア範囲 -->
        <div :class="!scoreEnabled && 'opacity-50'">
          <h4 class="mb-2 text-xs font-semibold text-slate-600">スコア範囲</h4>
          <div class="flex flex-wrap items-end gap-3">
            <label class="flex flex-col gap-1 text-xs text-slate-500">
              <span>以上</span>
              <input
                type="number"
                placeholder="例: 1007500"
                :disabled="!scoreEnabled"
                v-model.number="filter.scoreLower"
                class="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:bg-slate-50"
              />
            </label>
            <span class="pb-2 text-slate-400">〜</span>
            <label class="flex flex-col gap-1 text-xs text-slate-500">
              <span>以下</span>
              <input
                type="number"
                placeholder="例: 1010000"
                :disabled="!scoreEnabled"
                v-model.number="filter.scoreUpper"
                class="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:bg-slate-50"
              />
            </label>
          </div>
        </div>

        <!-- 動画の長さ -->
        <div>
          <h4 class="mb-2 text-xs font-semibold text-slate-600">動画の長さ（秒）</h4>
          <div class="flex flex-wrap items-end gap-3">
            <label class="flex flex-col gap-1 text-xs text-slate-500">
              <span>以上</span>
              <input
                type="number"
                min="0"
                placeholder="例: 90"
                v-model.number="filter.videoLenMin"
                class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </label>
            <span class="pb-2 text-slate-400">〜</span>
            <label class="flex flex-col gap-1 text-xs text-slate-500">
              <span>以下</span>
              <input
                type="number"
                min="0"
                placeholder="例: 150"
                v-model.number="filter.videoLenMax"
                class="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </label>
          </div>
          <p class="mt-1 text-[11px] text-slate-400">
            指定すると、動画が無い譜面は除外されます。
          </p>
        </div>

        <!-- 除外設定 -->
        <div class="space-y-2">
          <label
            class="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-slate-600"
            :class="!scoreEnabled && 'opacity-50'"
          >
            <input
              type="checkbox"
              :disabled="!scoreEnabled"
              v-model="filter.excludeUnplayed"
              class="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            未プレイの譜面を除外
          </label>
        </div>

        <div class="pt-1">
          <button
            type="button"
            class="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            @click="emit('reset')"
          >
            条件をリセット
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
