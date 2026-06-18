<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  buildCharts,
  fetchAllSongs,
  fetchUserRecords,
  UserDataError,
} from './api'
import type { Chart, SortDir, SortKey, Song, UserRecord } from './types'
import {
  ajRate,
  defaultFilterState,
  filterCharts,
  lampLabel,
  maxRate,
  type FilterState,
} from './filters'
import FilterPanel from './components/FilterPanel.vue'
import ResultTable from './components/ResultTable.vue'
import Pagination from './components/Pagination.vue'

const PAGE_SIZE = 50
const STORAGE_KEY = 'rec_plus_settings'

// ----- 状態 -----
const songs = ref<Song[] | null>(null)
const userRecords = ref<UserRecord[] | null>(null)

const loadingSongs = ref(true)
const songsError = ref('')

const userId = ref('')
const loadingUser = ref(false)
const userError = ref('')
const userInfo = ref('') // 取得成功時のメッセージ

const filter = reactive<FilterState>(defaultFilterState())
const page = ref(1)

// ----- ソート -----
const sortKey = ref<SortKey>('const')
const sortDir = ref<SortDir>('desc')

function constVal(c: Chart): number {
  return c.isConstUnknown ? c.level : c.const || c.level
}
function lampRank(c: Chart): number {
  switch (lampLabel(c)) {
    case 'AJC':
      return 4
    case 'AJ':
      return 3
    case 'FC':
      return 2
    default:
      return c.played ? 1 : 0
  }
}
function sortValue(c: Chart, key: SortKey): string | number {
  switch (key) {
    case 'title':
      return c.title
    case 'diff':
      // 難易度はレベル値で並べる (降順=高難度が先頭)
      return c.level
    case 'const':
      return constVal(c)
    case 'genre':
      return c.genre
    case 'video':
      return c.videoLengthSec ?? -1
    case 'score':
      return c.score
    case 'lamp':
      return lampRank(c)
    case 'statMax':
      return maxRate(c) ?? -1
    case 'statAj':
      return ajRate(c) ?? -1
  }
}

/** その列に表示できるデータがあるか (無い場合はソート方向に依らず末尾へ送る) */
function hasSortData(c: Chart, key: SortKey): boolean {
  switch (key) {
    case 'video':
      return c.videoLengthSec != null
    case 'score':
    case 'lamp':
      return c.played
    case 'statMax':
      return maxRate(c) != null
    case 'statAj':
      return ajRate(c) != null
    case 'const':
      return !c.isConstUnknown
    default:
      return true
  }
}

function handleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

// ----- 永続化 (localStorage に 1 つの JSON として保存) -----
function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId: userId.value, filter }),
    )
  } catch {
    /* ignore */
  }
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (typeof saved.userId === 'string') userId.value = saved.userId
    if (saved.filter) Object.assign(filter, saved.filter)
  } catch {
    /* ignore */
  }
}

// ----- 算出 -----
const scoreEnabled = computed(() => userRecords.value !== null)

const charts = computed<Chart[]>(() => {
  if (!songs.value) return []
  return buildCharts(songs.value, userRecords.value)
})

const filtered = computed<Chart[]>(() => {
  const list = filterCharts(charts.value, filter)
  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortKey.value
  return list.slice().sort((a, b) => {
    // データの無い譜面は昇順・降順いずれでも末尾へ
    const ha = hasSortData(a, key)
    const hb = hasSortData(b, key)
    if (ha !== hb) return ha ? -1 : 1
    if (!ha && !hb) return a.title.localeCompare(b.title, 'ja')

    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    let cmp: number
    if (typeof va === 'string' && typeof vb === 'string') {
      cmp = va.localeCompare(vb, 'ja')
    } else {
      cmp = (va as number) - (vb as number)
    }
    if (cmp !== 0) return cmp * dir
    // タイブレーク (曲名昇順, 方向に依らず固定)
    return a.title.localeCompare(b.title, 'ja')
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const startIndex = computed(() => (page.value - 1) * PAGE_SIZE)
const pagedCharts = computed(() =>
  filtered.value.slice(startIndex.value, startIndex.value + PAGE_SIZE),
)

// 絞り込み条件が変わったら 1 ページ目へ戻す
watch(
  () => filtered.value.length,
  () => {
    if (page.value > pageCount.value) page.value = pageCount.value
  },
)
watch(
  filter,
  () => {
    page.value = 1
    saveState()
  },
  { deep: true },
)

// ----- アクション -----
async function loadSongs() {
  loadingSongs.value = true
  songsError.value = ''
  try {
    songs.value = await fetchAllSongs()
  } catch (e) {
    songsError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingSongs.value = false
  }
}

async function loadUser() {
  const name = userId.value.trim()
  userError.value = ''
  userInfo.value = ''
  if (!name) {
    // ID 未入力ならスコアを使わないモードに戻す
    userRecords.value = null
    saveState()
    return
  }
  loadingUser.value = true
  try {
    const records = await fetchUserRecords(name)
    userRecords.value = records
    userInfo.value = `${records.length} 件のプレイ記録を読み込みました`
    page.value = 1
    saveState()
  } catch (e) {
    userRecords.value = null
    userError.value =
      e instanceof UserDataError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e)
  } finally {
    loadingUser.value = false
  }
}

function clearUser() {
  userId.value = ''
  userRecords.value = null
  userError.value = ''
  userInfo.value = ''
  saveState()
}

function resetFilter() {
  Object.assign(filter, defaultFilterState())
}

onMounted(() => {
  loadState()
  // 全曲データは常に、ユーザーデータは cookie に ID があれば、
  // ページを開いた瞬間に裏で並行して取得を開始する
  loadSongs()
  if (userId.value.trim()) loadUser()
})
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-800 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden"
  >
    <!-- ヘッダー -->
    <header class="sticky top-0 z-20 shrink-0 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div class="mx-auto flex max-w-[1800px] items-center px-4 py-3 sm:px-6">
        <span class="text-2xl font-black tracking-tight text-white">rec<span class="text-violet-400">+</span></span>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:min-h-0 lg:flex-1">
      <div class="grid grid-cols-1 gap-6 py-6 lg:h-full lg:grid-cols-[360px_1fr] lg:py-0">
        <!-- 左カラム: ユーザー + 絞り込み (PC では独立スクロール) -->
        <aside
          class="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:py-6 lg:pr-2"
        >
          <!-- ユーザー ID -->
          <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <label class="mb-1 block text-sm font-bold text-slate-700">
              chunirec ユーザー ID
            </label>
            <p class="mb-3 text-xs text-slate-400">
              入力するとスコア・達成状況を反映します（任意）。
            </p>
            <div class="flex gap-2">
              <input
                v-model="userId"
                type="text"
                maxlength="30"
                placeholder="例: chunithm"
                class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                @keyup.enter="loadUser"
              />
              <button
                type="button"
                class="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                :disabled="loadingUser"
                @click="loadUser"
              >
                {{ loadingUser ? '取得中…' : '取得' }}
              </button>
            </div>
            <p v-if="userError" class="mt-2 text-xs font-medium text-rose-600">{{ userError }}</p>
            <div v-else-if="userInfo" class="mt-2 flex items-center justify-between text-xs">
              <span class="font-medium text-emerald-600">{{ userInfo }}</span>
              <button type="button" class="text-slate-400 hover:underline" @click="clearUser">
                クリア
              </button>
            </div>
          </div>

          <!-- 絞り込み -->
          <FilterPanel v-model="filter" :score-enabled="scoreEnabled" @reset="resetFilter" />
        </aside>

        <!-- 右カラム: 結果 (PC では独立スクロール) -->
        <section
          class="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:py-6 lg:pr-1"
        >
          <!-- サマリ -->
          <div
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 sm:px-5"
          >
            <div class="text-sm text-slate-600">
              <template v-if="loadingSongs">全曲データを読み込み中…</template>
              <template v-else-if="songsError" class="text-rose-600">{{ songsError }}</template>
              <template v-else>
                該当
                <span class="text-lg font-bold text-violet-600">{{ filtered.length.toLocaleString() }}</span>
                譜面
                <span class="text-slate-400">/ 全 {{ charts.length.toLocaleString() }} 譜面</span>
              </template>
            </div>
            <div v-if="!loadingSongs && filtered.length" class="text-xs text-slate-400">
              {{ startIndex + 1 }}–{{ Math.min(startIndex + PAGE_SIZE, filtered.length) }} 件目を表示
              （{{ page }}/{{ pageCount }} ページ）
            </div>
          </div>

          <div v-if="songsError" class="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
            {{ songsError }}
            <button type="button" class="ml-2 font-semibold underline" @click="loadSongs">再試行</button>
          </div>

          <div v-if="loadingSongs" class="rounded-2xl bg-white p-12 text-center text-slate-400 shadow-sm ring-1 ring-slate-200">
            読み込み中…
          </div>

          <template v-else>
            <ResultTable
              :charts="pagedCharts"
              :start-index="startIndex"
              :score-enabled="scoreEnabled"
              :sort-key="sortKey"
              :sort-dir="sortDir"
              @sort="handleSort"
            />
            <Pagination v-model:page="page" :page-count="pageCount" />
          </template>
        </section>
      </div>
    </main>

    <footer class="mx-auto w-full max-w-[1800px] shrink-0 px-4 py-8 text-center text-xs text-slate-400 sm:px-6 lg:py-3">
      データ: chunirec / 譜面保管所 (sdvx.in)。本ツールは非公式です。
    </footer>
  </div>
</template>
