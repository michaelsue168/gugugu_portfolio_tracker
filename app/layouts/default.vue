<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row selection:bg-rose-500 selection:text-white">
    <!-- 桌機/平板側邊導覽列 Sidebar (md 以上且登入時顯示) -->
    <aside v-if="user" class="hidden md:flex md:w-64 md:flex-col bg-slate-900/60 backdrop-blur-md border-r border-slate-800/60 p-5 h-screen sticky top-0 shrink-0">
      <!-- Logo -->
      <div class="flex items-center gap-3 mb-8">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <span class="text-white font-extrabold text-base">咕</span>
        </div>
        <div>
          <h1 class="text-sm font-bold tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">顧股咕</h1>
          <p class="text-[11px] text-slate-350 uppercase tracking-widest font-mono">Portfolio Tracker</p>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 space-y-2">
        <NuxtLink 
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group"
          :class="[route.path === item.path ? 'text-rose-400 bg-rose-500/5 border border-rose-500/10' : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40']"
        >
          <component :is="item.icon" class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          <span class="text-xs font-semibold tracking-wide font-mono">{{ item.name }}</span>
        </NuxtLink>
      </nav>

      <!-- User profile & Logout -->
      <div class="pt-4 border-t border-slate-800/60 flex flex-col gap-3">
        <div class="flex flex-col">
          <span class="text-xs text-slate-300 uppercase tracking-wider font-mono">會員帳號</span>
          <span class="text-xs text-slate-300 truncate mt-0.5" :title="user.email">{{ user.email }}</span>
        </div>
        <button 
          @click="handleLogout" 
          class="w-full py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800/30 hover:border-rose-900/50 transition-all duration-300 flex items-center justify-center gap-2 text-xs font-bold"
        >
          <LogOut class="w-4 h-4" />
          <span>安全登出</span>
        </button>
      </div>
    </aside>

    <!-- 主要內容區外殼 -->
    <div 
      class="flex-1 flex flex-col min-h-screen relative"
      :class="[user ? 'w-full md:h-screen md:overflow-hidden' : 'w-full max-w-md mx-auto justify-center']"
    >
      <!-- 行動端 Header (僅在 md 以下，且已登入時顯示) -->
      <header v-if="user" class="md:hidden sticky top-0 z-40 bg-slate-950/70 backdrop-blur-lg border-b border-slate-800/50 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <span class="text-white font-bold text-sm">咕</span>
          </div>
          <div>
            <h1 class="text-sm font-semibold tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">顧股咕</h1>
            <p class="text-[11px] text-slate-350 uppercase tracking-widest font-mono">Portfolio Tracker</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-300 max-w-[100px] truncate">{{ user.email }}</span>
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
      <main 
        class="flex-1 p-4 overflow-y-auto"
        :class="[user ? 'pb-28 md:pb-6 md:p-6 lg:p-8 w-full mx-auto max-w-7xl' : '']"
      >
        <slot />
      </main>

      <!-- 行動端底部導覽列 (僅在 md 以下，且已登入時顯示) -->
      <nav v-if="user" class="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(448px-2rem)] z-50">
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
            <span class="text-xs font-semibold tracking-wide relative z-10 font-mono">{{ item.name }}</span>

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
