import bookmarks from "@/data/bookmarks.json"
import type { CategoryNode } from "@/types/bookmarks.types"

export type CategoryFilter = {
  id: string
  label: string
  path: string
  count: number
  icon: string
  help: string
}

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

function flatten(nodes: CategoryNode[], depth = 0): CategoryFilter[] {
  const out: CategoryFilter[] = []
  for (const node of nodes) {
    out.push({
      id: node.path,
      label: node.name,
      path: node.path,
      count: node.count,
      icon: ICON_BY_PATH[node.path] || "i-heroicons-folder",
      help: `${node.count} bookmarks in ${node.path}`,
    })
    out.push(...flatten(node.children, depth + 1))
  }
  return out
}

export const categoryTree = bookmarks.categories as CategoryNode[]
export const categoryFilters = flatten(categoryTree)
export const bookmarkItems = bookmarks.items
export const bookmarkMeta = bookmarks.meta
