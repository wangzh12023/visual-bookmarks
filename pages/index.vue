<template>
  <div>
    <div class="sticky top-0 z-20">
      <Header />
    </div>
    <UContainer class="pb-6">
      <div class="mt-6 text-center sm:my-12">
        <p class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Pick references by sight
        </p>
        <p class="text-lg sm:text-xl">
          for your
          <span class="primary-text font-semibold">frontend</span>
          ,
          <span class="primary-text font-semibold">LaTeX</span>
          and
          <span class="primary-text font-semibold">template</span>
          work.
        </p>
      </div>

      <div class="mt-6 flex flex-grow justify-center gap-4 sm:mt-8">
        <div class="-mt-2 hidden w-72 shrink-0 p-3 md:block">
          <Filters />
        </div>

        <LibraryCards />
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const title = ref("Visual Bookmarks")
const config = useRuntimeConfig()
const description =
  "Browse frontend, UI, and LaTeX template bookmarks by sight — preview screenshots with category filters."

useHead({
  title,
  htmlAttrs: { lang: "en" },
})

useSeoMeta({
  title: title.value,
  description,
  ogTitle: title.value,
  ogDescription: description,
  ogType: "website",
  ogSiteName: title.value,
  ogUrl: config.public.siteUrl,
  ogImage: `${config.public.siteUrl}/og.png`,
  twitterCard: "summary_large_image",
  twitterTitle: title.value,
  twitterDescription: description,
  twitterImage: `${config.public.siteUrl}/og.png`,
})
</script>
