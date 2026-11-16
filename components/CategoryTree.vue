<template>
  <div class="category-tree">
    <CategoryTreeNode
      v-for="node in nodes"
      :key="node.path"
      :node="node"
      :depth="0"
    />
  </div>
</template>

<script setup lang="ts">
import type { CategoryNode } from "@/types/bookmarks.types"
import CategoryTreeNode from "./CategoryTreeNode.vue"

defineProps<{
  nodes: CategoryNode[]
}>()
</script>
