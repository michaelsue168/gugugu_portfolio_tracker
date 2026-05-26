<template>
  <div class="min-h-[calc(100vh-6rem)] flex flex-col justify-center items-center py-6 px-4 relative overflow-hidden">
    <!-- 背景流光發光裝飾 (Fintech Glow) -->
    <div class="absolute w-60 h-60 -top-10 -left-10 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none"></div>
    <div class="absolute w-60 h-60 -bottom-10 -right-10 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>

    <!-- 登入卡片容器 -->
    <div class="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative z-10">
      
      <!-- Logo 區塊 -->
      <div class="text-center mb-6">
        <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <span class="text-white font-extrabold text-2xl font-mono">咕</span>
        </div>
        <h2 class="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">歡迎來到 顧股咕</h2>
        <p class="text-xs text-slate-400 mt-1 font-light">您的智慧股票交易與移動平均成本管理大師</p>
      </div>

      <!-- 登入 / 註冊 切換 Segmented Control -->
      <div class="bg-slate-950/80 p-1 rounded-xl border border-slate-800/40 flex mb-6 relative">
        <button 
          @click="isSignUp = false" 
          class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 relative z-10"
          :class="[!isSignUp ? 'text-white' : 'text-slate-400 hover:text-slate-200']"
        >
          會員登入
        </button>
        <button 
          @click="isSignUp = true" 
          class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 relative z-10"
          :class="[isSignUp ? 'text-white' : 'text-slate-400 hover:text-slate-200']"
        >
          註冊帳號
        </button>
        
        <!-- 動態滑塊背景 -->
        <div 
          class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-slate-800 border border-slate-700/50 rounded-lg transition-all duration-300 shadow-md"
          :style="{ transform: isSignUp ? 'translateX(100%)' : 'translateX(0)' }"
        ></div>
      </div>

      <!-- 表單區 -->
      <form @submit.prevent="handleAuth" class="space-y-4">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Email Address</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
              <Mail class="w-4 h-4" />
            </span>
            <input 
              v-model="email" 
              type="email" 
              required 
              placeholder="name@example.com"
              class="w-full bg-slate-950/50 border border-slate-800 focus:border-rose-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-300 focus:ring-1 focus:ring-rose-500/30"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Password</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
              <Lock class="w-4 h-4" />
            </span>
            <input 
              v-model="password" 
              type="password" 
              required 
              placeholder="••••••••"
              class="w-full bg-slate-950/50 border border-slate-800 focus:border-rose-500/80 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none transition-all duration-300 focus:ring-1 focus:ring-rose-500/30"
            />
          </div>
        </div>

        <!-- 錯誤或成功提示 -->
        <transition name="fade">
          <div v-if="feedback" class="p-3 rounded-xl text-[11px] border" :class="[isError ? 'bg-rose-950/20 text-rose-400 border-rose-900/50' : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/50']">
            {{ feedback }}
          </div>
        </transition>

        <!-- 提交按鈕 -->
        <button 
          type="submit" 
          :disabled="loading"
          class="w-full mt-2 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          <span v-if="loading" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span v-else>{{ isSignUp ? '確認註冊並登入' : '安全登入' }}</span>
          <ArrowRight v-if="!loading" class="w-3.5 h-3.5" />
        </button>
      </form>

      <!-- 快速說明資訊 -->
      <div class="mt-6 pt-4 border-t border-slate-800/40 text-center">
        <p class="text-[10px] text-slate-500 leading-relaxed font-light">
          提示：初次使用請選擇「註冊帳號」，輸入電子郵件與自訂密碼即可完成開戶。
        </p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail, Lock, ArrowRight } from 'lucide-vue-next';

// 狀態定義
const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const loading = ref(false);
const feedback = ref('');
const isError = ref(false);

const supabase = useSupabaseClient();
const user = useSupabaseUser();

// 當用戶已經登入時，自動跳轉到主頁
watchEffect(() => {
  if (user.value) {
    navigateTo('/');
  }
});

// 處理登入或註冊
async function handleAuth() {
  loading.value = true;
  feedback.value = '';
  isError.value = false;

  try {
    if (isSignUp.value) {
      // 註冊
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      });
      if (error) throw error;
      
      // 檢查是否需要郵件驗證
      if (data.session) {
        feedback.value = '註冊成功！已自動登入。';
        setTimeout(() => navigateTo('/'), 1000);
      } else {
        feedback.value = '註冊成功！請至您的信箱收取驗證信以啟用帳號。';
      }
    } else {
      // 登入
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      });
      if (error) throw error;
      
      feedback.value = '登入成功，正在為您整理資產帳簿...';
      setTimeout(() => navigateTo('/'), 1000);
    }
  } catch (err: any) {
    isError.value = true;
    feedback.value = err.message || '認證程序發生錯誤，請稍後再試。';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
