<template>
  <div class="grid flex-grow grid-cols-1 content-start gap-6 lg:grid-cols-2">
    <LibraryCard v-for="item in sortedItems" :key="item.id" :item="item" />
    <div
      v-if="visibleCount === 0"
      class="col-span-full rounded-lg border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700"
    >
      <p class="text-sm font-medium">No matches</p>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Try another category or clear filters.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { bookmarkItems } from "@/data/categories"
import type { BookmarkItem } from "@/types/bookmarks.types"

const { activePath, previewOnly, query } = useFilterStore()

function matches(item: BookmarkItem): boolean {
  if (previewOnly.value && !item.preview) return false
  if (activePath.value) {
    const selected = activePath.value
    if (!(item.path === selected || item.path.startsWith(selected + "/"))) return false
  }
  const q = query.value.trim().toLowerCase()
  if (q) {
    const hay = `${item.title} ${item.host} ${item.path}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

const sortedItems = computed(() =>
  [...bookmarkItems].sort((a, b) => Number(!!b.preview) - Number(!!a.preview))
)

const visibleCount = computed(() => sortedItems.value.filter(matches).length)
</script>
