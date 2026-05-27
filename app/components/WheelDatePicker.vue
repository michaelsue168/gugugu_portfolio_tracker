<template>
  <div class="relative w-full">
    <!-- 原生 iOS/Android 支援的 datepicker 輸入框，在 iOS 上會自動開啟系統級滾輪 -->
    <input 
      v-model="dateVal" 
      type="date" 
      required 
      class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-3 px-4 text-xs text-white focus:outline-none font-mono appearance-none relative select-none cursor-pointer text-left z-10"
    />
    <!-- 曆法日曆 Icon 視覺引導，不遮擋觸碰事件 -->
    <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-20">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string; // YYYY-MM-DD
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const dateVal = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    emit('update:modelValue', val);
  }
});
</script>

<style scoped>
/* 將原生日期指示器設為滿版透明，確保使用者點選輸入框的任何角落，都能 100% 觸發喚起原生 iOS 日期滾輪 */
input[type="date"]::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  color: transparent;
  background: transparent;
  cursor: pointer;
  z-index: 30;
}
</style>
