<template>
  <nav class="toc" aria-label="Categories">
    <div ref="listRef" class="toc-list">
      <svg class="toc-rail" :viewBox="`0 0 ${svgWidth} ${svgHeight}`" :width="svgWidth" :height="svgHeight" aria-hidden="true">
        <path class="toc-rail-path" :d="railPath" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <rect
          v-if="activeY !== null"
          class="toc-rail-active"
          :x="activeX - 1.5"
          :y="activeY"
          width="3"
          height="18"
          rx="1.5"
        />
      </svg>

      <div
        v-for="row in visibleRows"
        :key="row.path"
        class="toc-row"
        :class="{ 'is-active': row.path === activePath }"
        :style="{ paddingLeft: `${railPad + row.depth * indent}px` }"
      >
        <button
          v-if="row.hasChildren"
          type="button"
          class="toc-fold"
          :aria-expanded="isOpen(row.path)"
          :aria-label="isOpen(row.path) ? 'Collapse' : 'Expand'"
          @click.stop="toggle(row.path)"
        >
          <span class="toc-fold-mark">{{ isOpen(row.path) ? '−' : '+' }}</span>
        </button>
        <span v-else class="toc-fold-spacer" />

        <button type="button" class="toc-link" @click="onSelect(row)">
          <span class="toc-text">{{ row.name }}</span>
          <span class="toc-count">{{ row.count }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { CategoryNode } from "@/types/bookmarks.types"

const props = defineProps<{
  nodes: CategoryNode[]
}>()

type FlatRow = {
  path: string
  name: string
  count: number
  depth: number
  hasChildren: boolean
}

const { activePath, setActivePath } = useFilterStore()

const ROW_H = 34
const indent = 18
const railPad = 14
const svgWidth = 28

const openMap = ref<Record<string, boolean>>({})

function initOpen(nodes: CategoryNode[], depth = 0) {
  for (const n of nodes) {
    if (!(n.path in openMap.value)) {
      openMap.value[n.path] = depth < 1
    }
    if (n.children?.length) initOpen(n.children, depth + 1)
  }
}

watch(
  () => props.nodes,
  (nodes) => initOpen(nodes),
  { immediate: true, deep: true },
)

function isOpen(path: string) {
  return !!openMap.value[path]
}

function toggle(path: string) {
  openMap.value[path] = !openMap.value[path]
}

function flatten(nodes: CategoryNode[], depth = 0): FlatRow[] {
  const out: FlatRow[] = []
  for (const n of nodes) {
    const hasChildren = (n.children?.length || 0) > 0
    out.push({
      path: n.path,
      name: n.name,
      count: n.count,
      depth,
      hasChildren,
    })
    if (hasChildren && isOpen(n.path)) {
      out.push(...flatten(n.children, depth + 1))
    }
  }
  return out
}

const visibleRows = computed(() => flatten(props.nodes))

const svgHeight = computed(() => Math.max(visibleRows.value.length * ROW_H, ROW_H))

function xForDepth(depth: number) {
  return 4 + depth * indent
}

const railPath = computed(() => {
  const rows = visibleRows.value
  if (!rows.length) return ""

  const parts: string[] = []
  let prevDepth = rows[0].depth
  let x = xForDepth(prevDepth)
  // start above first row center
  parts.push(`M ${x} 0`)

  rows.forEach((row, i) => {
    const yTop = i * ROW_H
    const yMid = yTop + ROW_H / 2
    const yBot = yTop + ROW_H
    const depth = row.depth
    const xNext = xForDepth(depth)

    if (depth !== prevDepth) {
      // S-curve step into / out of nest, then continue
      const yCurveStart = yTop + 2
      parts.push(`L ${x} ${yCurveStart}`)
      const dir = depth > prevDepth ? 1 : -1
      const dx = Math.abs(xNext - x)
      // smooth cubic step
      parts.push(
        `C ${x} ${yCurveStart + 8}, ${xNext} ${yCurveStart + 2}, ${xNext} ${yCurveStart + 12}`,
      )
      x = xNext
      parts.push(`L ${x} ${yMid}`)
      // silence unused
      void dir
      void dx
    } else {
      parts.push(`L ${x} ${yMid}`)
    }

    // extend toward next row (or end)
    if (i < rows.length - 1) {
      const nextDepth = rows[i + 1].depth
      if (nextDepth === depth) {
        parts.push(`L ${x} ${yBot}`)
      } else {
        // stop near bottom so next iteration draws the curve
        parts.push(`L ${x} ${yBot - 2}`)
      }
    } else {
      parts.push(`L ${x} ${yBot}`)
    }

    prevDepth = depth
  })

  return parts.join(" ")
})

const activeIndex = computed(() =>
  visibleRows.value.findIndex((r) => r.path === activePath.value),
)

const activeY = computed(() => {
  if (activeIndex.value < 0) return null
  return activeIndex.value * ROW_H + (ROW_H - 18) / 2
})

const activeX = computed(() => {
  if (activeIndex.value < 0) return xForDepth(0)
  return xForDepth(visibleRows.value[activeIndex.value].depth)
})

// Expand ancestors when selection changes
watch(
  activePath,
  (path) => {
    if (!path) return
    const parts = path.split("/")
    for (let i = 1; i < parts.length; i++) {
      openMap.value[parts.slice(0, i).join("/")] = true
    }
  },
  { immediate: true },
)

function onSelect(row: FlatRow) {
  setActivePath(row.path)
  if (row.hasChildren && !isOpen(row.path)) {
    openMap.value[row.path] = true
  }
}
</script>

<style scoped>
.toc {
  --toc-muted: #8b929a;
  --toc-text: #5c6570;
  --toc-text-hover: #111827;
  --toc-rail: #d7 rec0e6;
  --toc-active: #111827;
}

.dark .toc {
  --toc-muted: #94a3b8;
  --toc-text: #94a3b8;
  --toc-text-hover: #f8fafc;
  --toc-rail: #475569;
  --toc-active: #f8fafc;
}

.toc-list {
  position: relative;
  padding-left: 0;
}

.toc-rail {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  overflow: visible;
}

.toc-rail-path {
  stroke: #d0d5db;
  stroke-width: 1.5;
}

.dark .toc-rail-path {
  stroke: #475569;
}

.toc-rail-active {
  fill: #111827;
}

.dark .toc-rail-active {
  fill: #f8fafc;
}

.toc-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 34px;
  gap: 2px;
}

.toc-fold,
.toc-fold-spacer {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #9aa3ad;
  padding: 0;
}

.toc-fold {
  border-radius: 3px;
  cursor: pointer;
}

.toc-fold:hover {
  background: rgb(0 0 0 / 0.05);
  color: #111827;
}

.dark .toc-fold:hover {
  background: rgb(255 255 255 / 0.08);
  color: #f8fafc;
}

.toc-fold-mark {
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
}

.toc-link {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
  height: 100%;
  border: 0;
  background: transparent;
  padding: 0 4px 0 2px;
  text-align: left;
  cursor: pointer;
  color: #6b7280;
}

.toc-link:hover .toc-text {
  color: #111827;
}

.dark .toc-link {
  color: #94a3b8;
}

.dark .toc-link:hover .toc-text {
  color: #f8fafc;
}

.toc-text {
  font-size: 14px;
  font-weight: 450;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.12s ease;
}

.toc-row.is-active .toc-text {
  color: #111827;
  font-weight: 560;
}

.dark .toc-row.is-active .toc-text {
  color: #f8fafc;
}

.toc-count {
  margin-left: auto;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #9ca3af;
  flex-shrink: 0;
}

.dark .toc-count {
  color: #64748b;
}
</style>
