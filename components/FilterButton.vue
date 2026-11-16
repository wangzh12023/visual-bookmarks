<template>
  <UTooltip>
    <UButton
      class="w-full justify-between"
      :icon="categoryFilter.icon"
      :label="buttonLabel"
      :variant="isSelected ? 'solid' : 'ghost'"
      :class="indentClass"
      @click="setActivePath(categoryFilter.path)"
    />
    <template #text>
      {{ categoryFilter.help }}
    </template>
  </UTooltip>
</template>

<script setup lang="ts">
import type { CategoryFilter } from "@/data/categories"

const props = defineProps<{
  categoryFilter: CategoryFilter
}>()

const { activePath, setActivePath } = useFilterStore()

const depth = computed(() => props.categoryFilter.path.split("/").length - 1)

const indentClass = computed(() => {
  if (depth.value <= 0) return ""
  if (depth.value === 1) return "ml-2"
  return "ml-4"
})

const isSelected = computed(() => activePath.value === props.categoryFilter.path)

const buttonLabel = computed(
  () => `${props.categoryFilter.label} (${props.categoryFilter.count})`
)
</script>
