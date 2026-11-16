export default defineAppConfig({
  ui: {
    strategy: "merge",
    primary: "emerald",
    gray: "slate",
    icons: {
      dynamic: true,
    },
    tooltip: {
      base: "h-auto overflow-visible text-overflow-clip whitespace-normal",
      popper: { placement: "top" },
    },
  },
  repoUrl: "https://github.com/wangzh12023/visual-bookmarks",
  demoUrl: "https://wangzh12023.github.io/visual-bookmarks/",
})
