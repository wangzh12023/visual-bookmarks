<template>
  <UAccordion
    :items="accordionSections"
    color="black"
    size="xl"
    variant="ghost"
    :multiple="true"
  >
    <template #quick>
      <div class="ml-2 flex flex-col gap-1">
        <UTooltip text="Only show bookmarks that already have a preview screenshot">
          <UButton
            class="w-full"
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
          :ui="{ icon: { trailing: { pointer: '' } } }"
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
    </template>

    <template #frontend>
      <div class="ml-2 flex flex-col gap-1">
        <FilterButton
          v-for="filter in frontendFilters"
          :key="filter.id"
          :category-filter="filter"
        />
      </div>
    </template>

    <template #latex>
      <div class="ml-2 flex flex-col gap-1">
        <FilterButton
          v-for="filter in latexFilters"
          :key="filter.id"
          :category-filter="filter"
        />
      </div>
    </template>
  </UAccordion>

  <div v-if="nbTouchedFilters() > 0" class="mt-2 flex justify-end">
    <UButton
      color="gray"
      variant="ghost"
      size="xs"
      icon="i-material-symbols-delete-outline-rounded"
      :label="`Clear ${nbTouchedFilters()} filter${suffix}`"
      @click="clearFiltering()"
    />
  </div>
</template>

<script setup lang="ts">
import { bookmarkMeta, categoryFilters } from "@/data/categories"

const accordionSections = [
  {
    label: "Quick Filters",
    defaultOpen: true,
    slot: "quick",
  },
  {
    label: "Frontend",
    defaultOpen: true,
    slot: "frontend",
  },
  {
    label: "LaTeX Template",
    defaultOpen: true,
    slot: "latex",
  },
]

const frontendFilters = categoryFilters.filter((f) => f.path === "frontend" || f.path.startsWith("frontend/"))
const latexFilters = categoryFilters.filter(
  (f) => f.path === "latex template" || f.path.startsWith("latex template/")
)

const { previewOnly, query, invertPreviewOnly, setQuery, nbTouchedFilters, clearFiltering } =
  useFilterStore()

const queryModel = computed({
  get: () => query.value,
  set: (value: string) => setQuery(value),
})

const suffix = computed(() => (nbTouchedFilters() == 1 ? "" : "s"))
</script>
