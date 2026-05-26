<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex justify-center selection:bg-rose-500 selection:text-white">
    <!-- 行動端模擬外殼 (在桌機端居中限寬，手機端滿版) -->
    <div class="w-full max-w-md min-h-screen flex flex-col bg-slate-900/40 backdrop-blur-md relative border-x border-slate-800/40 shadow-2xl pb-24 overflow-x-hidden">
      <!-- 頂部 Header -->
      <header class="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-lg border-b border-slate-800/50 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <span class="text-white font-bold text-sm">咕</span>
          </div>
          <div>
            <h1 class="text-sm font-semibold tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">顧股咕</h1>
            <p class="text-[9px] text-slate-400/80 uppercase tracking-widest font-mono">Portfolio Tracker</p>
          </div>
        </div>

        <div v-if="user" class="flex items-center gap-3">
          <span class="text-[11px] text-slate-400 max-w-[100px] truncate">{{ user.email }}</span>
          <button 
            @click="handleLogout" 
            class="p-1.5 rounded-lg bg-slate-800/50 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-700/30 hover:border-rose-900/50 transition-all duration-300"
            title="登出"
          >
            <LogOut class="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <!-- 主要內容區 -->
      <main class="flex-1 p-4 overflow-y-auto">
        <slot />
      </main>

      <!-- 底部導覽列 (Bottom Navigation Bar) -->
      <nav v-if="user" class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(448px-2rem)] z-50">
        <div class="bg-slate-950/85 backdrop-blur-xl border border-slate-800/60 rounded-2xl px-2 py-2.5 shadow-2xl shadow-slate-950/50 flex justify-around items-center relative">
          <!-- 導覽項目 -->
          <NuxtLink 
            v-for="item in navItems" 
            :key="item.path" 
            :to="item.path"
            class="flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all duration-300 relative group flex-1"
            :class="[route.path === item.path ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200']"
          >
            <!-- 作用中的微發光背景 -->
            <span 
              v-if="route.path === item.path" 
              class="absolute inset-0 bg-rose-500/5 rounded-xl border border-rose-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] shadow-rose-500/5"
            ></span>

            <component :is="item.icon" class="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" />
            <span class="text-[10px] font-medium tracking-wide relative z-10 font-mono">{{ item.name }}</span>

            <!-- 小紅點指示器 -->
            <span 
              v-if="route.path === item.path" 
              class="absolute -top-0.5 w-1 h-1 rounded-full bg-rose-500 shadow-lg shadow-rose-500"
            ></span>
          </NuxtLink>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  LayoutDashboard, 
  Briefcase, 
  History, 
  PlusCircle, 
  LogOut 
} from 'lucide-vue-next';

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const route = useRoute();

// 導覽列項目定義
const navItems = [
  { name: '總覽', path: '/', icon: LayoutDashboard },
  { name: '庫存', path: '/portfolio', icon: Briefcase },
  { name: '新增', path: '/record', icon: PlusCircle },
  { name: '明細', path: '/history', icon: History }
];

// 登出處理
async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigateTo('/login');
  } catch (err: any) {
    alert('登出失敗：' + err.message);
  }
}

// 全域路由守衛：未登入跳轉至登入頁面
watchEffect(() => {
  if (process.client) {
    if (!user.value && route.path !== '/login') {
      navigateTo('/login');
    } else if (user.value && route.path === '/login') {
      navigateTo('/');
    }
  }
});
</script>

<style scoped>
/* 底部導覽列模糊微發光 */
nav > div {
  box-shadow: 0 -4px 20px -5px rgba(244, 63, 94, 0.03), 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}
</style>
