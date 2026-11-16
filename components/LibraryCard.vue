<template>
  <div
    v-if="display"
    class="w-auto overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800"
  >
    <div class="flex h-full flex-col">
      <UButton
        :to="item.url"
        target="_blank"
        variant="ghost"
        color="black"
        :padded="false"
        class="block w-full overflow-hidden rounded-none"
      >
        <div class="relative aspect-[16/10] w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
          <img
            v-if="item.preview"
            :src="item.preview"
            :alt="item.title"
            class="h-full w-full object-cover object-top"
            loading="lazy"
          />
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400"
          >
            <img
              v-if="item.favicon"
              :src="item.favicon"
              alt=""
              class="h-8 w-8 rounded"
            />
            <UIcon v-else name="i-heroicons-photo" class="h-8 w-8" />
            <span class="text-xs">No preview yet</span>
          </div>
          <UBadge
            v-if="item.preview"
            color="primary"
            variant="solid"
            size="xs"
            class="absolute left-2 top-2"
          >
            Preview
          </UBadge>
        </div>
      </UButton>

      <div class="flex flex-1 flex-col justify-between gap-3 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <UTooltip :text="`Open ${item.title}`">
              <UButton
                :to="item.url"
                target="_blank"
                variant="ghost"
                color="black"
                :padded="false"
                class="justify-start text-left"
              >
                <span class="line-clamp-2 text-base font-medium tracking-wide">
                  {{ item.title }}
                </span>
              </UButton>
            </UTooltip>
            <div class="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <UIcon name="i-heroicons-link" class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ item.host }}</span>
            </div>
          </div>
          <UTooltip text="Open in new tab">
            <UButton
              :to="item.url"
              target="_blank"
              icon="i-heroicons-arrow-top-right-on-square"
              variant="ghost"
              color="gray"
              :square="true"
            />
          </UTooltip>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="gray" variant="subtle" size="xs">
            {{ leafLabel }}
          </UBadge>
          <UBadge v-if="item.category !== leafLabel" color="gray" variant="soft" size="xs">
            {{ item.category }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookmarkItem } from "@/types/bookmarks.types"

const props = defineProps<{
  item: BookmarkItem
}>()

const { activePath, previewOnly, query } = useFilterStore()

const leafLabel = computed(() => props.item.subcategory.at(-1) || props.item.category)

const display = computed((): boolean => {
  if (previewOnly.value && !props.item.preview) return false

  if (activePath.value) {
    const path = props.item.path
    const selected = activePath.value
    if (!(path === selected || path.startsWith(selected + "/"))) return false
  }

  const q = query.value.trim().toLowerCase()
  if (q) {
    const hay = `${props.item.title} ${props.item.host} ${props.item.path}`.toLowerCase()
    if (!hay.includes(q)) return false
  }

  return true
})
</script>
