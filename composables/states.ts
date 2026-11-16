export const useFilterStore = () => {
  const activePath = useState<string | null>("activeCategoryPath", () => null)
  const previewOnly = useState<boolean>("previewOnly", () => false)
  const query = useState<string>("searchQuery", () => "")

  const setActivePath = (path: string | null) => {
    // toggle off if clicking the same path again
    if (path !== null && activePath.value === path) {
      activePath.value = null
      return
    }
    activePath.value = path
  }

  const invertPreviewOnly = () => {
    previewOnly.value = !previewOnly.value
  }

  const setQuery = (value: string) => {
    query.value = value
  }

  const nbTouchedFilters = () => {
    let n = 0
    if (activePath.value) n += 1
    if (previewOnly.value) n += 1
    if (query.value.trim()) n += 1
    return n
  }

  const clearFiltering = () => {
    activePath.value = null
    previewOnly.value = false
    query.value = ""
  }

  return {
    activePath,
    previewOnly,
    query,
    setActivePath,
    invertPreviewOnly,
    setQuery,
    nbTouchedFilters,
    clearFiltering,
  }
}
