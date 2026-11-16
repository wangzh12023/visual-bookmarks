// https://nuxt.com/docs/api/configuration/nuxt-config
const baseURL = process.env.NUXT_APP_BASE_URL || "/"

export default defineNuxtConfig({
  modules: ["@nuxt/ui"],

  // Static hosting (GitHub Pages)
  ssr: true,
  nitro: {
    preset: "static",
  },

  app: {
    baseURL,
    head: {
      htmlAttrs: { lang: "en" },
      title: "Visual Bookmarks",
      meta: [
        {
          name: "description",
          content:
            "Browse frontend, UI, and LaTeX template bookmarks by sight — a visual gallery with category filters and preview screenshots.",
        },
        { name: "theme-color", content: "#10b981" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "Visual Bookmarks" },
        {
          property: "og:description",
          content:
            "Pick design & template references by sight. Nuxt UI gallery for frontend and LaTeX bookmarks.",
        },
        { property: "og:image", content: "https://wangzh12023.github.io/visual-bookmarks/og.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Visual Bookmarks" },
        {
          name: "twitter:description",
          content:
            "Pick design & template references by sight. Nuxt UI gallery for frontend and LaTeX bookmarks.",
        },
        { name: "twitter:image", content: "https://wangzh12023.github.io/visual-bookmarks/og.png" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: `${baseURL}favicon.svg` },
        { rel: "apple-touch-icon", href: `${baseURL}apple-touch-icon.png` },
      ],
    },
  },

  runtimeConfig: {
    public: {
      loadPlausible: "",
      siteUrl: "https://wangzh12023.github.io/visual-bookmarks",
      repoUrl: "https://github.com/wangzh12023/visual-bookmarks",
    },
  },

  typescript: {
    shim: false,
    tsConfig: {
      compilerOptions: {
        moduleResolution: "bundler",
        paths: {
          "@": ["."],
          "@/*": ["./*"],
        },
      },
    },
  },

  tailwindcss: {
    cssPath: "~/assets/css/tailwind.css",
    configPath: "tailwind.config.js",
  },

  devtools: { enabled: true },
  compatibilityDate: "2024-07-10",
})
