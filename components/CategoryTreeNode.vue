<template>
  <div class="tree-node" :style="{ '--depth': depth }">
    <div
      class="tree-row group"
      :class="{
        'is-active': isSelected,
        'is-ancestor': isAncestor,
      }"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="tree-chevron"
        :aria-label="open ? 'Collapse' : 'Expand'"
        @click.stop="open = !open"
      >
        <UIcon
          :name="open ? 'i-heroicons-chevron-down-20-solid' : 'i-heroicons-chevron-right-20-solid'"
          class="h-3.5 w-3.5"
        />
      </button>
      <span v-else class="tree-chevron-spacer" />

      <button type="button" class="tree-label" @click="setActivePath(node.path)">
        <UIcon :name="icon" class="tree-icon" />
        <span class="truncate">{{ node.name }}</span>
        <span class="tree-count">{{ node.count }}</span>
      </button>
    </div>

    <div v-if="hasChildren && open" class="tree-children">
      <CategoryTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategoryNode } from "@/types/bookmarks.types"

const props = defineProps<{
  node: CategoryNode
  depth: number
}>()

const { activePath, setActivePath } = useFilterStore()

const ICON_BY_PATH: Record<string, string> = {
  frontend: "i-heroicons-code-bracket-square",
  "frontend/Components&Framework": "i-heroicons-puzzle-piece",
  "frontend/design ui": "i-heroicons-swatch",
  "frontend/blog build": "i-heroicons-pencil-square",
  "frontend/blog build/blog examples": "i-heroicons-newspaper",
  "frontend/Icon Libraries": "i-heroicons-face-smile",
  "frontend/Examples": "i-heroicons-window",
  "frontend/Examples/蓝紫色": "i-heroicons-sparkles",
  "frontend/Examples/手绘": "i-heroicons-paint-brush",
  "frontend/Examples/白色/白粉": "i-heroicons-sun",
  "frontend/Examples/amazing": "i-heroicons-star",
  "frontend/UX Design": "i-heroicons-cursor-arrow-rays",
  "frontend/3d": "i-heroicons-cube",
  "latex template": "i-heroicons-document-text",
  "latex template/ppt": "i-heroicons-presentation-chart-bar",
  "latex template/notes": "i-heroicons-book-open",
  "latex template/book": "i-heroicons-bookmark",
}

const hasChildren = computed(() => props.node.children.length > 0)
const icon = computed(
  () => ICON_BY_PATH[props.node.path] || (hasChildren.value ? "i-heroicons-folder" : "i-heroicons-document"),
)

const isSelected = computed(() => activePath.value === props.node.path)
const isAncestor = computed(
  () => !!activePath.value && activePath.value.startsWith(props.node.path + "/"),
)

// Expand ancestors of active path; top-level starts open
const open = ref(props.depth < 1 || isSelected.value || isAncestor.value)

watch(
  () => activePath.value,
  (path) => {
    if (path && (path === props.node.path || path.startsWith(props.node.path + "/"))) {
      open.value = true
    }
  },
)
</script>

<style scoped>
.tree-node {
  --indent: 18px;
  position: relative;
}

.tree-row {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 34px;
  padding-left: calc(var(--depth) * var(--indent));
  border-radius: 0.5rem;
  color: rgb(71 85 105);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tree-row:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.dark .tree-row:hover {
  background: rgb(30 41 59 / 0.7);
  color: rgb(248 250 252);
}

.tree-row.is-active {
  color: rgb(4 120 87);
  background: rgb(204 251 241 / 0.55);
}

.dark .tree-row.is-active {
  color: rgb(110 231 183);
  background: rgb(6 78 59 / 0.35);
}

.tree-row.is-active::before {
  content: "";
  position: absolute;
  left: calc(var(--depth) * var(--indent) + 2px);
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 999px;
  background: rgb(16 185 129);
}

.tree-chevron,
.tree-chevron-spacer {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: 2px;
  border-radius: 0.375rem;
  color: rgb(148 163 184);
}

.tree-chevron:hover {
  background: rgb(226 232 240);
  color: rgb(51 65 85);
}

.dark .tree-chevron:hover {
  background: rgb(51 65 85);
  color: rgb(226 232 240);
}

.tree-label {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.45rem 0.35rem 0.15rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25;
}

.tree-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  opacity: 0.75;
}

.tree-count {
  margin-left: auto;
  border-radius: 0.375rem;
  background: rgb(241 245 249);
  padding: 0.1rem 0.4rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  color: rgb(100 116 139);
}

.dark .tree-count {
  background: rgb(30 41 59);
  color: rgb(148 163 184);
}

.tree-row.is-active .tree-count {
  background: rgb(255 255 255 / 0.7);
  color: rgb(4 120 87);
}

.tree-children {
  position: relative;
  margin-left: calc(var(--depth) * var(--indent) + 11px);
  padding-left: 17px;
  border-left: 1.5px solid rgb(203 213 225);
}

.dark .tree-children {
  border-left-color: rgb(71 85 105);
}

/* Rounded step into nested group */
.tree-children::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 0;
  width: 12px;
  height: 14px;
  border-left: 1.5px solid rgb(203 213 225);
  border-bottom: 1.5px solid rgb(203 213 225);
  border-bottom-left-radius: 10px;
}

.dark .tree-children::before {
  border-color: rgb(71 85 105);
}
</style>
