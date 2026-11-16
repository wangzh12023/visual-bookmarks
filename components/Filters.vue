<template>
  <div class="flex flex-col gap-4">
    <div>
      <div class="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        Quick Filters
      </div>
      <div class="flex flex-col gap-1">
        <UTooltip text="Only show bookmarks that already have a preview screenshot">
          <UButton
            class="w-full justify-start"
            icon="i-heroicons-photo"
            :label="`With preview (${bookmarkMeta.withPreview})`"
            :variant="previewOnly ? 'solid' : 'ghost'"
            @click="invertPreviewOnly()"
          />
        </UTooltip>
        <UInput
          v-model="queryModel"
          icon="i-heroicons-magnifying-glass"
          size="md"
          placeholder="Search title / host…"
        >
          <template v-if="queryModel" #trailing>
            <UButton
              color="gray"
              variant="link"
              icon="i-heroicons-x-mark-20-solid"
              :padded="false"
              @click="setQuery('')"
            />
          </template>
        </UInput>
      </div>
    </div>

    <div>
      <div class="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
        Categories
      </div>
      <CategoryTree :nodes="categoryTree" />
    </div>

    <div v-if="nbTouchedFilters() > 0" class="flex justify-end">
      <UButton
        color="gray"
        variant="ghost"
        size="xs"
        icon="i-material-symbols-delete-outline-rounded"
        :label="`Clear ${nbTouchedFilters()} filter${suffix}`"
        @click="clearFiltering()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { bookmarkMeta, categoryTree } from "@/data/categories"

const { previewOnly, query, invertPreviewOnly, setQuery, nbTouchedFilters, clearFiltering } =
  useFilterStore()

const queryModel = computed({
  get: () => query.value,
  set: (value: string) => setQuery(value),
})

const suffix = computed(() => (nbTouchedFilters() == 1 ? "" : "s"))
</script>
