<template>
  <div class="relative bg-slate-950/90 border border-slate-850/90 rounded-2xl p-3.5 flex gap-2 h-[140px] items-center overflow-hidden select-none">
    <!-- 頂部與底部的立體漸層淡出遮罩 (3D 滾輪視覺效果) -->
    <div class="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none z-10"></div>
    <div class="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10"></div>

    <!-- 中間選定高亮區域框線 -->
    <div class="absolute left-2.5 right-2.5 top-[50px] bottom-[50px] border-t border-b border-rose-500/25 bg-rose-500/5 rounded-lg pointer-events-none z-10"></div>
    
    <!-- 年滾輪 -->
    <div 
      class="flex-1 h-full overflow-y-auto scroll-smooth scroll-snap-y scroll-none relative" 
      ref="yearScrollEl" 
      @scroll="onYearScroll"
    >
      <div class="h-[50px] pointer-events-none"></div>
      <div 
        v-for="y in years" 
        :key="y" 
        @click="selectYear(y)"
        class="h-[40px] flex items-center justify-center font-mono text-xs cursor-pointer select-none transition-all duration-200"
        :class="[year === y ? 'text-rose-400 font-extrabold text-sm scale-110 z-20' : 'text-slate-500 hover:text-slate-300 font-medium scale-95 opacity-60']"
        style="scroll-snap-align: center;"
      >
        {{ y }}年
      </div>
      <div class="h-[50px] pointer-events-none"></div>
    </div>

    <span class="text-slate-700 font-mono text-[10px] select-none z-20">/</span>

    <!-- 月滾輪 -->
    <div 
      class="flex-1 h-full overflow-y-auto scroll-smooth scroll-snap-y scroll-none relative" 
      ref="monthScrollEl" 
      @scroll="onMonthScroll"
    >
      <div class="h-[50px] pointer-events-none"></div>
      <div 
        v-for="m in months" 
        :key="m" 
        @click="selectMonth(m)"
        class="h-[40px] flex items-center justify-center font-mono text-xs cursor-pointer select-none transition-all duration-200"
        :class="[month === m ? 'text-rose-400 font-extrabold text-sm scale-110 z-20' : 'text-slate-500 hover:text-slate-300 font-medium scale-95 opacity-60']"
        style="scroll-snap-align: center;"
      >
        {{ String(m).padStart(2, '0') }}月
      </div>
      <div class="h-[50px] pointer-events-none"></div>
    </div>

    <span class="text-slate-700 font-mono text-[10px] select-none z-20">/</span>

    <!-- 日滾輪 -->
    <div 
      class="flex-1 h-full overflow-y-auto scroll-smooth scroll-snap-y scroll-none relative" 
      ref="dayScrollEl" 
      @scroll="onDayScroll"
    >
      <div class="h-[50px] pointer-events-none"></div>
      <div 
        v-for="d in days" 
        :key="d" 
        @click="selectDay(d)"
        class="h-[40px] flex items-center justify-center font-mono text-xs cursor-pointer select-none transition-all duration-200"
        :class="[day === d ? 'text-rose-400 font-extrabold text-sm scale-110 z-20' : 'text-slate-500 hover:text-slate-300 font-medium scale-95 opacity-60']"
        style="scroll-snap-align: center;"
      >
        {{ String(d).padStart(2, '0') }}日
      </div>
      <div class="h-[50px] pointer-events-none"></div>
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

const year = ref(new Date().getFullYear());
const month = ref(new Date().getMonth() + 1);
const day = ref(new Date().getDate());

// 滾動元素 Ref
const yearScrollEl = ref<HTMLElement | null>(null);
const monthScrollEl = ref<HTMLElement | null>(null);
const dayScrollEl = ref<HTMLElement | null>(null);

let isProgrammaticScroll = false;

// 資料範圍設定
const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 8 + i); // 8 年前到 2 年後
const months = Array.from({ length: 12 }, (_, i) => i + 1);

// 動態月份天數
const days = computed(() => {
  const daysInMonth = new Date(year.value, month.value, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
});

// 監聽父組件傳入的 modelValue 並解析
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const parts = newVal.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      
      let changed = false;
      if (year.value !== y) { year.value = y; changed = true; }
      if (month.value !== m) { month.value = m; changed = true; }
      
      // 確保日不會超出該月最大值
      const maxDay = new Date(y, m, 0).getDate();
      const safeD = Math.min(d, maxDay);
      if (day.value !== safeD) { day.value = safeD; changed = true; }
      
      if (changed) {
        nextTick(() => {
          syncScrollPositions();
        });
      }
    }
  }
}, { immediate: true });

// 更新並回傳 modelValue
function emitUpdate() {
  const yStr = String(year.value);
  const mStr = String(month.value).padStart(2, '0');
  const dStr = String(day.value).padStart(2, '0');
  emit('update:modelValue', `${yStr}-${mStr}-${dStr}`);
}

// 監聽本地數值改變，觸發回傳
watch([year, month, day], () => {
  // 自動校正：如果月天數改變導致日超出上限
  const maxDay = new Date(year.value, month.value, 0).getDate();
  if (day.value > maxDay) {
    day.value = maxDay;
  }
  emitUpdate();
});

// 滾動特定列到指定索引
function scrollColumnTo(el: HTMLElement, index: number) {
  if (!el) return;
  isProgrammaticScroll = true;
  el.scrollTop = index * 40;
  setTimeout(() => {
    isProgrammaticScroll = false;
  }, 150);
}

// 同步滾動條位置至當前狀態值
function syncScrollPositions() {
  isProgrammaticScroll = true;
  
  if (yearScrollEl.value) {
    const yIdx = years.indexOf(year.value);
    if (yIdx !== -1) yearScrollEl.value.scrollTop = yIdx * 40;
  }
  
  if (monthScrollEl.value) {
    const mIdx = months.indexOf(month.value);
    if (mIdx !== -1) monthScrollEl.value.scrollTop = mIdx * 40;
  }
  
  if (dayScrollEl.value) {
    const dIdx = days.value.indexOf(day.value);
    if (dIdx !== -1) dayScrollEl.value.scrollTop = dIdx * 40;
  }
  
  setTimeout(() => {
    isProgrammaticScroll = false;
  }, 150);
}

// 點擊事件：直接點選並滑動
function selectYear(y: number) {
  year.value = y;
  const idx = years.indexOf(y);
  if (yearScrollEl.value && idx !== -1) scrollColumnTo(yearScrollEl.value, idx);
}

function selectMonth(m: number) {
  month.value = m;
  const idx = months.indexOf(m);
  if (monthScrollEl.value && idx !== -1) scrollColumnTo(monthScrollEl.value, idx);
}

function selectDay(d: number) {
  day.value = d;
  const idx = days.value.indexOf(d);
  if (dayScrollEl.value && idx !== -1) scrollColumnTo(dayScrollEl.value, idx);
}

// 滾動監聽：手勢拖曳結束對齊後觸發
function onYearScroll(e: Event) {
  if (isProgrammaticScroll) return;
  const el = e.target as HTMLElement;
  const idx = Math.round(el.scrollTop / 40);
  if (idx >= 0 && idx < years.length) {
    const newVal = years[idx];
    if (year.value !== newVal) {
      year.value = newVal;
    }
  }
}

function onMonthScroll(e: Event) {
  if (isProgrammaticScroll) return;
  const el = e.target as HTMLElement;
  const idx = Math.round(el.scrollTop / 40);
  if (idx >= 0 && idx < months.length) {
    const newVal = months[idx];
    if (month.value !== newVal) {
      month.value = newVal;
    }
  }
}

function onDayScroll(e: Event) {
  if (isProgrammaticScroll) return;
  const el = e.target as HTMLElement;
  const idx = Math.round(el.scrollTop / 40);
  if (idx >= 0 && idx < days.value.length) {
    const newVal = days.value[idx];
    if (day.value !== newVal) {
      day.value = newVal;
    }
  }
}

onMounted(() => {
  // 元件掛載後延遲對齊位置，確保 Layout 計算完畢
  setTimeout(() => {
    syncScrollPositions();
  }, 200);
});
</script>

<style scoped>
/* 滾輪專屬滾動容器樣式 */
.scroll-snap-y {
  scroll-snap-type: y mandatory;
}

.scroll-none {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
}

.scroll-none::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>
