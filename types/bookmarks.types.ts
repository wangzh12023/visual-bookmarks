export type CategoryNode = {
  name: string
  path: string
  count: number
  children: CategoryNode[]
}

export type BookmarkItem = {
  id: string
  title: string
  url: string
  host: string
  category: string
  subcategory: string[]
  path: string
  preview: string | null
  favicon: string | null
}

export type BookmarkData = {
  meta: {
    title: string
    description: string
    total: number
    withPreview: number
  }
  categories: CategoryNode[]
  items: BookmarkItem[]
}
