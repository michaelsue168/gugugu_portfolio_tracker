<template>
  <div class="space-y-4">
    <!-- 頂部與更新按鈕 -->
    <div class="flex justify-between items-center px-1">
      <div>
        <h2 class="text-lg font-bold text-white">資產持股庫存</h2>
        <p class="text-xs text-slate-400 font-light">
          共持有 {{ portfolio.activePositions.value.length }} 檔個股
        </p>
      </div>

      <!-- 🔄 刷新價格按鈕 -->
      <button 
        @click="triggerRefresh" 
        :disabled="portfolio.loading.value"
        class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-850 rounded-xl text-xs font-medium shadow-lg hover:shadow-rose-500/5 active:scale-95 transition-all duration-300 disabled:opacity-50"
      >
        <RefreshCw id="refresh-icon" class="w-3.5 h-3.5" />
        <span>刷新現價</span>
      </button>
    </div>

    <!-- 載入中遮罩 -->
    <div v-if="portfolio.loading.value" class="py-16 flex flex-col justify-center items-center gap-3">
      <span class="w-7 h-7 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></span>
      <p class="text-xs text-slate-400 font-light">正在更新最新股市價格...</p>
    </div>

    <div v-else class="space-y-3">
      <!-- 庫存為空提示 -->
      <div v-if="portfolio.activePositions.value.length === 0" class="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-12 text-center">
        <Briefcase class="w-10 h-10 mx-auto mb-3 text-slate-700" />
        <h3 class="text-sm font-bold text-slate-400">目前尚無庫存股票</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
          點擊下方導覽列的「新增」以記錄您的第一筆台股買進流水帳吧！
        </p>
        <NuxtLink to="/record" class="mt-4 px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all inline-block shadow-lg shadow-rose-500/10">
          立即新增交易
        </NuxtLink>
      </div>

      <!-- 庫存主內容區 (有持股時顯示) -->
      <template v-else>
        <!-- 📈 損益排名直方圖區塊 (全新功能) -->
        <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 md:p-5 space-y-4">
          <!-- 標題與切換鈕 -->
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-bold text-slate-300 tracking-wider flex items-center gap-1.5 uppercase font-sans">
                <BarChart3 class="w-4 h-4 text-rose-500" />
                <span>個股損益績效排名</span>
              </h3>
              <button 
                @click="isChartExpanded = !isChartExpanded" 
                class="text-slate-400 hover:text-slate-200 transition-colors p-1"
                :title="isChartExpanded ? '收合圖表' : '展開圖表'"
              >
                <ChevronDown 
                  class="w-3.5 h-3.5 transition-transform duration-300"
                  :class="[isChartExpanded ? 'rotate-180 text-rose-450' : '']"
                />
              </button>
            </div>

            <!-- 切換按鈕 (Tabs) -->
            <div v-show="isChartExpanded" class="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
              <button 
                @click="chartType = 'unrealized'"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                :class="[chartType === 'unrealized' ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/10' : 'text-slate-400 hover:text-slate-200']"
              >
                未實現損益
              </button>
              <button 
                @click="chartType = 'realized'"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                :class="[chartType === 'realized' ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/10' : 'text-slate-400 hover:text-slate-200']"
              >
                已實現損益
              </button>
            </div>
          </div>

          <!-- 圖表主體 -->
          <transition 
            name="expand"
            @enter="enterAnimation"
            @leave="leaveAnimation"
          >
            <div v-show="isChartExpanded" class="pt-1">
              <div v-if="chartData.length === 0" class="py-12 text-center text-xs text-slate-500 font-light">
                目前尚無該類型的損益統計數據
              </div>
              <div v-else class="w-full overflow-x-auto no-scrollbar">
                <!-- 圖表畫布區，設定固定高度與最小寬度防止擠壓 -->
                <div class="h-64 flex gap-2 px-4 pt-6 pb-2 min-w-max relative select-none">
                  
                  <!-- 背景水平參考線 (Grid Lines) -->
                  <div class="absolute left-0 right-0 top-6 h-44 pointer-events-none z-0">
                    <div class="absolute left-0 right-0 top-[25%] h-px border-t border-dashed border-slate-800/40"></div>
                    <div class="absolute left-0 right-0 top-[50%] h-px border-t border-solid border-slate-800/80"></div>
                    <!-- 0 水平線標籤 -->
                    <span class="absolute left-1.5 top-[50%] -translate-y-1/2 text-[10px] text-slate-400 font-bold bg-slate-950/95 px-1.5 py-0.5 rounded border border-slate-850/60 z-10 font-mono">0</span>
                    <div class="absolute left-0 right-0 top-[75%] h-px border-t border-dashed border-slate-800/40"></div>
                  </div>

                  <!-- 每一個個股垂直 Column -->
                  <div 
                    v-for="item in chartData" 
                    :key="item.code" 
                    class="w-14 flex flex-col items-center relative group z-10"
                  >
                    <!-- 柱狀圖高度區 (176px) -->
                    <div class="w-full h-44 relative">
                      <!-- 正向 Profit Bar -->
                      <template v-if="item.value >= 0">
                        <!-- 金額數值標籤 (置於柱狀圖上方) -->
                        <span 
                          class="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold text-rose-400 whitespace-nowrap mb-1 transition-all duration-300 group-hover:scale-105"
                          :style="{ bottom: `calc(50% + ${getBarHeightPercentage(item.value)}% + 2px)` }"
                        >
                          {{ formatChartValue(item.value) }}
                        </span>
                        <!-- 柱狀圖 -->
                        <div 
                          class="absolute left-1/2 -translate-x-1/2 w-5 bg-gradient-to-t from-rose-600 to-rose-455 hover:from-rose-500 hover:to-rose-350 rounded-t-md transition-all duration-500 shadow-md shadow-rose-950/20 group-hover:brightness-110"
                          :style="{ 
                            bottom: '50%', 
                            height: `${getBarHeightPercentage(item.value)}%` 
                          }"
                        ></div>
                      </template>

                      <!-- 負向 Loss Bar -->
                      <template v-else>
                        <!-- 金額數值標籤 (置於柱狀圖下方) -->
                        <span 
                          class="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold text-emerald-450 whitespace-nowrap mt-1 transition-all duration-300 group-hover:scale-105"
                          :style="{ top: `calc(50% + ${getBarHeightPercentage(item.value)}% + 2px)` }"
                        >
                          {{ formatChartValue(item.value) }}
                        </span>
                        <!-- 柱狀圖 -->
                        <div 
                          class="absolute left-1/2 -translate-x-1/2 w-5 bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-350 hover:to-emerald-500 rounded-b-md transition-all duration-500 shadow-md shadow-emerald-950/20 group-hover:brightness-110"
                          :style="{ 
                            top: '50%', 
                            height: `${getBarHeightPercentage(item.value)}%` 
                          }"
                        ></div>
                      </template>
                    </div>

                    <!-- 底部個股代號名稱標籤 -->
                    <div class="mt-2.5 text-center flex flex-col items-center justify-center pointer-events-none">
                      <span class="text-xs font-bold text-slate-200 font-mono">{{ item.code }}</span>
                      <span class="text-[10px] text-slate-400 font-medium truncate max-w-[54px] mt-0.5">{{ item.name }}</span>
                    </div>

                    <!-- ROI 浮動提示 (若有 ROI 顯示於上方) -->
                    <span 
                      v-if="item.roi !== null" 
                      class="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/90 border border-slate-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full z-20 pointer-events-none whitespace-nowrap"
                      :class="[item.value >= 0 ? 'text-rose-450 border-rose-950/40' : 'text-emerald-450 border-emerald-950/40']"
                    >
                      ROI {{ item.value >= 0 ? '+' : '' }}{{ item.roi.toFixed(1) }}%
                    </span>
                  </div>

                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 庫存列表卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        <div 
          v-for="pos in portfolio.activePositions.value" 
          :key="pos.stock_code"
          class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 relative"
          :class="[expandedCard === pos.stock_code ? 'ring-1 ring-rose-500/30 bg-slate-900/60' : '']"
        >
          <!-- 卡片頂部概覽 (點擊可展開明細) -->
          <div 
            @click="toggleExpand(pos.stock_code)"
            class="p-4 cursor-pointer hover:bg-slate-850/20 select-none flex justify-between items-center transition-colors"
          >
            <!-- 股票代號名稱 -->
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-850 flex items-center justify-center font-bold text-xs text-slate-300">
                {{ pos.stock_code }}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <h4 class="text-xs font-bold text-white">{{ pos.stock_name }}</h4>
                  <ChevronDown 
                    class="w-3.5 h-3.5 text-slate-500 transition-transform duration-300"
                    :class="[expandedCard === pos.stock_code ? 'rotate-180 text-rose-400' : '']"
                  />
                </div>
                <p class="text-xs text-slate-400 mt-1 font-mono">
                  {{ pos.shares }} 股 | 均價 ${{ pos.average_cost.toFixed(1) }} | 現價 ${{ pos.current_price.toFixed(1) }}
                </p>
              </div>
            </div>

            <!-- 市值與未實現損益 -->
            <div class="text-right">
              <p class="text-xs font-bold font-mono text-slate-200">
                ${{ formatNumber(pos.market_value) }}
              </p>
              <div class="flex items-center justify-end gap-1.5 mt-1 font-mono flex-wrap">
                <span v-if="pos.price_fetch_failed" class="text-[8px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15">
                  獲取失敗
                </span>
                <!-- 台股邏輯：紅色為獲利、綠色為虧損 -->
                <span 
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="[pos.unrealized_gain >= 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400']"
                >
                  {{ pos.unrealized_gain >= 0 ? '▲ +' : '▼ ' }}{{ pos.unrealized_roi.toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>

          <!-- 展開的交易流水帳詳細資料 -->
          <transition 
            name="expand"
            @enter="enterAnimation"
            @leave="leaveAnimation"
          >
            <div v-show="expandedCard === pos.stock_code" class="px-4 pb-4 border-t border-slate-800/40 bg-slate-950/20">
              <!-- 詳細庫存計算解析 -->
              <div class="grid grid-cols-2 gap-3 py-3 border-b border-slate-800/40 text-xs text-slate-300">
                <div>
                  <p>持股總成本：<span class="font-bold text-slate-300 font-mono">${{ formatNumber(pos.total_cost) }}</span></p>
                  <p class="mt-1 flex items-center gap-1 flex-wrap">
                    當前股票現價：
                    <span class="font-bold text-slate-300 font-mono">${{ pos.current_price.toFixed(1) }}</span>
                    <span v-if="pos.price_fetch_failed" class="px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-bold border border-amber-500/20">
                      ⚠️ 獲取失敗 (暫以成本計算)
                    </span>
                  </p>
                </div>
                <div>
                  <p>未實現損益：
                    <span 
                      class="font-bold font-mono"
                      :class="[pos.unrealized_gain >= 0 ? 'text-rose-400' : 'text-emerald-400']"
                    >
                      {{ pos.unrealized_gain >= 0 ? '+' : '' }}{{ formatNumber(pos.unrealized_gain) }}
                    </span>
                  </p>
                  <p class="mt-1">已領現金股利：<span class="font-bold text-amber-400 font-mono">${{ formatNumber(pos.dividend_received) }}</span></p>
                </div>
              </div>

              <!-- 快速新增紀錄動作 -->
              <div class="flex gap-2 py-3 border-b border-slate-800/40">
                <button 
                  @click="quickRecord(pos, 'BUY')"
                  class="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 hover:border-rose-500/50 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-0.5 active:scale-[0.98]"
                >
                  買進
                </button>
                <button 
                  @click="quickRecord(pos, 'SELL')"
                  class="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-0.5 active:scale-[0.98]"
                >
                  賣出
                </button>
                <button 
                  @click="quickRecord(pos, 'DIVIDEND')"
                  class="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 hover:border-amber-500/50 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-0.5 active:scale-[0.98]"
                >
                  新增股息
                </button>
              </div>

              <!-- 個股關聯流水帳紀錄 -->
              <div class="mt-3">
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">交易紀錄 (由舊至新)</p>
                <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  <div 
                    v-for="tx in pos.transactions" 
                    :key="tx.id"
                    class="flex justify-between items-center p-2 bg-slate-950/40 border border-slate-850/50 rounded-xl text-xs text-slate-300"
                  >
                    <div class="flex items-center gap-2">
                      <span 
                        class="px-1.5 py-0.5 rounded text-[8px] font-bold"
                        :class="[
                          tx.action === 'BUY' ? 'bg-rose-500/10 text-rose-400' : 
                          tx.action === 'SELL' ? 'bg-emerald-500/10 text-emerald-400' : 
                          tx.action === 'DIVIDEND' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                        ]"
                      >
                        {{ formatAction(tx.action) }}
                      </span>
                      <span class="font-mono text-[11px] text-slate-400">{{ tx.transaction_date }}</span>
                    </div>

                    <div class="text-right font-mono">
                      <!-- 買賣顯示價格與股數 -->
                      <span v-if="tx.action === 'BUY' || tx.action === 'SELL'">
                        {{ Math.abs(tx.shares) }}股 @ ${{ tx.price.toFixed(1) }}
                      </span>
                      <!-- 配股 -->
                      <span v-else-if="tx.action === 'BONUS_SHARES'" class="text-sky-400">
                        +{{ tx.shares }}股
                      </span>
                      <!-- 現金股利 -->
                      <span v-else class="text-amber-400">
                        ${{ formatNumber(tx.price * (tx.shares || 1) - tx.fee) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { RefreshCw, Briefcase, ChevronDown, BarChart3 } from 'lucide-vue-next';

const portfolio = usePortfolio();

// 損益排名圖表類型：'unrealized' (未實現) | 'realized' (已實現)
const chartType = ref<'unrealized' | 'realized'>('unrealized');
const isChartExpanded = ref(true); // 預設展開

// 計算直方圖所需數據
const chartData = computed(() => {
  if (chartType.value === 'unrealized') {
    // 未實現損益排名：僅針對當前持股 (shares > 0)
    return Object.values(portfolio.allPositions.value)
      .filter(pos => pos.shares > 0)
      .map(pos => ({
        code: pos.stock_code,
        name: pos.stock_name,
        value: pos.unrealized_gain,
        roi: pos.unrealized_roi,
        displayValue: pos.unrealized_gain >= 0 ? `+$${formatNumber(pos.unrealized_gain)}` : `-$${formatNumber(Math.abs(pos.unrealized_gain))}`
      }))
      .sort((a, b) => b.value - a.value);
  } else {
    // 已實現損益排名：針對所有歷史交易過且有已實現損益的個股 (不限持股中)
    return Object.values(portfolio.allPositions.value)
      .filter(pos => pos.realized_gain !== 0)
      .map(pos => ({
        code: pos.stock_code,
        name: pos.stock_name,
        value: pos.realized_gain,
        roi: null,
        displayValue: pos.realized_gain >= 0 ? `+$${formatNumber(pos.realized_gain)}` : `-$${formatNumber(Math.abs(pos.realized_gain))}`
      }))
      .sort((a, b) => b.value - a.value);
  }
});

// 取得直方圖的百分比高度 (相對於最大絕對值，單側最大高度為 50% 容器佔比)
function getBarHeightPercentage(val: number): number {
  if (chartData.value.length === 0) return 0;
  const maxAbs = Math.max(...chartData.value.map(item => Math.abs(item.value)), 1);
  return (Math.abs(val) / maxAbs) * 50;
}

// 格式化直方圖上方的數值 (千元/萬元簡寫)
function formatChartValue(val: number): string {
  const abs = Math.max(0, Math.round(Math.abs(val)));
  const sign = val >= 0 ? '+' : '-';
  if (abs >= 10000) {
    return `${sign}${(abs / 10000).toFixed(1)}萬`;
  } else if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}${abs}`;
}

// 當前點擊展開明細的個股代號
const expandedCard = ref<string | null>(null);

// 千分位格式化
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('zh-TW');
}

// 切換展開狀態
function toggleExpand(code: string) {
  if (expandedCard.value === code) {
    expandedCard.value = null;
  } else {
    expandedCard.value = code;
  }
}

// 交易類型翻譯
function formatAction(action: string): string {
  switch(action) {
    case 'BUY': return '買入';
    case 'SELL': return '賣出';
    case 'DIVIDEND': return '配息';
    case 'BONUS_SHARES': return '配股';
    default: return action;
  }
}

// GSAP 旋轉刷新按鈕動畫與拉取資料
async function triggerRefresh() {
  if (process.client) {
    // 播放 360 度旋轉動畫
    gsap.to('#refresh-icon', {
      rotation: '+=360',
      duration: 0.8,
      ease: 'power2.inOut'
    });
  }

  // 觸發重新整理價格
  await portfolio.refreshPrices();
}

const router = useRouter();

function quickRecord(pos: any, action: 'BUY' | 'SELL') {
  router.push({
    path: '/record',
    query: {
      code: pos.stock_code,
      name: pos.stock_name,
      type: action
    }
  });
}

// GSAP 卡片高度展開動畫
function enterAnimation(el: Element, done: () => void) {
  if (process.client) {
    gsap.fromTo(el, 
      { height: 0, opacity: 0 },
      { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out', onComplete: done }
    );
  } else {
    done();
  }
}

// GSAP 卡片折疊動畫
function leaveAnimation(el: Element, done: () => void) {
  if (process.client) {
    gsap.to(el, {
      height: 0,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.inOut',
      onComplete: done
    });
  } else {
    done();
  }
}

onMounted(async () => {
  await portfolio.fetchData();
});
</script>

<style scoped>
/* 展開折疊時的過渡裁剪 */
.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
}

/* 隱藏橫向滾動條 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
