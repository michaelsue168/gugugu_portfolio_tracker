<template>
  <div class="space-y-6">
    <!-- 載入中狀態遮罩 -->
    <div v-if="portfolio.loading.value" class="py-12 flex flex-col justify-center items-center gap-3">
      <span class="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></span>
      <p class="text-xs text-slate-400 font-light">正在同步雲端投資組合...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- 總資產頂級發光卡片 -->
      <div class="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <!-- 裝飾背景發光 -->
        <div class="absolute -right-16 -top-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest font-mono">Total Assets Value / 總資產市值</p>
        
        <!-- GSAP 數字滾動顯示 -->
        <h2 class="text-3xl font-extrabold tracking-tight mt-1.5 font-mono text-white flex items-baseline gap-1">
          <span class="text-slate-500 text-lg font-light">$</span>
          <span>{{ formatNumber(displayedTotalAssets) }}</span>
        </h2>

        <!-- 綜合損益區塊 (台股邏輯：紅升綠跌) -->
        <div class="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
          <div>
            <p class="text-[10px] text-slate-500 font-medium">綜合投資淨利 (含股息、折讓)</p>
            <div 
              class="text-base font-bold font-mono mt-0.5 flex items-center gap-1 transition-colors duration-300"
              :class="[portfolio.summary.value.net_profit >= 0 ? 'text-rose-500' : 'text-emerald-500']"
            >
              <span>{{ portfolio.summary.value.net_profit >= 0 ? '▲ +' : '▼ -' }}</span>
              <span>${{ formatNumber(Math.abs(displayedNetProfit)) }}</span>
            </div>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-slate-500 font-medium">未實現報酬率 (ROI)</p>
            <div 
              class="text-xs font-semibold font-mono mt-1 px-2.5 py-0.5 rounded-full inline-block"
              :class="[portfolio.summary.value.unrealized_roi >= 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20']"
            >
              {{ portfolio.summary.value.unrealized_roi >= 0 ? '+' : '' }}{{ portfolio.summary.value.unrealized_roi.toFixed(2) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- 資產配置視覺化比例條 -->
      <div class="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
        <h3 class="text-xs font-bold text-slate-300 tracking-wider">資產配置比例</h3>
        
        <!-- 比例進度條 -->
        <div class="h-3 rounded-full bg-slate-950 overflow-hidden flex">
          <div 
            class="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500" 
            :style="{ width: `${weights.stock}%` }"
            title="持股市值"
          ></div>
          <div 
            class="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500" 
            :style="{ width: `${weights.dividend}%` }"
            title="股息收入"
          ></div>
          <div 
            class="h-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-500" 
            :style="{ width: `${weights.realized}%` }"
            title="已實現利潤"
          ></div>
          <div 
            class="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500" 
            :style="{ width: `${weights.cashFlow}%` }"
            title="退佣折讓"
          ></div>
        </div>

        <!-- 比例圖例說明 -->
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded bg-rose-500"></span>
            <div>
              <p class="text-[9px] text-slate-500">當前持股市值</p>
              <p class="text-xs font-bold font-mono">${{ formatNumber(portfolio.summary.value.total_market_value) }} ({{ weights.stock.toFixed(1) }}%)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded bg-amber-500"></span>
            <div>
              <p class="text-[9px] text-slate-500">累計股息收入</p>
              <p class="text-xs font-bold font-mono">${{ formatNumber(displayedDividend) }} ({{ weights.dividend.toFixed(1) }}%)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded bg-sky-500"></span>
            <div>
              <p class="text-[9px] text-slate-500">歷史已實現損益</p>
              <p class="text-xs font-bold font-mono" :class="[portfolio.summary.value.total_realized_gain >= 0 ? 'text-rose-400' : 'text-emerald-400']">
                ${{ formatNumber(displayedRealized) }} ({{ weights.realized.toFixed(1) }}%)
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded bg-purple-500"></span>
            <div>
              <p class="text-[9px] text-slate-500">退佣折讓/其他</p>
              <p class="text-xs font-bold font-mono">${{ formatNumber(portfolio.summary.value.total_cash_flow) }} ({{ weights.cashFlow.toFixed(1) }}%)</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 熱門持股快捷清單 -->
      <div class="space-y-3">
        <div class="flex justify-between items-center px-1">
          <h3 class="text-xs font-bold text-slate-300 tracking-wider">持股庫存焦點</h3>
          <NuxtLink to="/portfolio" class="text-[10px] font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-0.5">
            查看全部庫存 <ArrowRight class="w-3 h-3" />
          </NuxtLink>
        </div>

        <div v-if="portfolio.activePositions.value.length === 0" class="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-6 text-center">
          <TrendingUp class="w-7 h-7 mx-auto mb-2 text-slate-600" />
          <p class="text-xs text-slate-400">目前庫存中尚無持股記錄</p>
          <NuxtLink to="/record" class="text-[10px] text-rose-400 font-semibold underline mt-1.5 inline-block">
            前往新增第一筆交易 ➔
          </NuxtLink>
        </div>

        <div v-else class="space-y-2.5">
          <NuxtLink 
            v-for="pos in portfolio.activePositions.value.slice(0, 3)" 
            :key="pos.stock_code"
            to="/portfolio"
            class="flex items-center justify-between p-3.5 bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 hover:border-slate-700/55 rounded-2xl transition-all duration-300 hover:translate-x-1"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-200">
                {{ pos.stock_code }}
              </div>
              <div>
                <p class="text-xs font-bold text-slate-200">{{ pos.stock_name }}</p>
                <p class="text-[10px] text-slate-500 mt-0.5">{{ pos.shares }} 股 | 均價 ${{ pos.average_cost.toFixed(1) }}</p>
              </div>
            </div>

            <div class="text-right">
              <p class="text-xs font-bold font-mono text-slate-200">${{ formatNumber(pos.market_value) }}</p>
              <span 
                class="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full inline-block mt-1"
                :class="[pos.unrealized_gain >= 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400']"
              >
                {{ pos.unrealized_gain >= 0 ? '+' : '' }}{{ pos.unrealized_roi.toFixed(1) }}%
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { ArrowRight, TrendingUp } from 'lucide-vue-next';

const portfolio = usePortfolio();

// GSAP 動畫顯示的數值 Ref
const displayedTotalAssets = ref(0);
const displayedNetProfit = ref(0);
const displayedRealized = ref(0);
const displayedDividend = ref(0);

// 千分位格式化
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('zh-TW');
}

// 計算資產比例分佈
const weights = computed(() => {
  const sum = portfolio.summary.value.total_assets || 1;
  const mkt = Math.max(0, portfolio.summary.value.total_market_value);
  const div = Math.max(0, portfolio.summary.value.total_dividend);
  const cf = Math.max(0, portfolio.summary.value.total_cash_flow);
  const rlz = Math.max(0, portfolio.summary.value.total_realized_gain);
  
  const totalPositive = mkt + div + cf + rlz || 1;
  
  return {
    stock: (mkt / totalPositive) * 100,
    dividend: (div / totalPositive) * 100,
    realized: (rlz / totalPositive) * 100,
    cashFlow: (cf / totalPositive) * 100
  };
});

let gsapCtx: gsap.Context | null = null;

// 觸發 GSAP 滾動數字動畫
const animateNumbers = () => {
  if (process.client) {
    if (gsapCtx) gsapCtx.revert();
    
    gsapCtx = gsap.context(() => {
      gsap.to(displayedTotalAssets, {
        duration: 1.0,
        value: portfolio.summary.value.total_assets || 0,
        ease: 'power2.out',
        roundProps: 'value'
      });
      gsap.to(displayedNetProfit, {
        duration: 1.0,
        value: portfolio.summary.value.net_profit || 0,
        ease: 'power2.out',
        roundProps: 'value'
      });
      gsap.to(displayedRealized, {
        duration: 1.0,
        value: portfolio.summary.value.total_realized_gain || 0,
        ease: 'power2.out',
        roundProps: 'value'
      });
      gsap.to(displayedDividend, {
        duration: 1.0,
        value: portfolio.summary.value.total_dividend || 0,
        ease: 'power2.out',
        roundProps: 'value'
      });
    });
  }
};

// 監聽統計值變化重新觸發動畫
watch(() => portfolio.summary.value, () => {
  animateNumbers();
}, { deep: true });

onMounted(async () => {
  await portfolio.fetchData();
  animateNumbers();
});

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert();
  }
});
</script>
