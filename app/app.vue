<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* 全域轉場動畫，使用 GSAP 或 CSS 精緻轉場 */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease-out;
}
.page-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
