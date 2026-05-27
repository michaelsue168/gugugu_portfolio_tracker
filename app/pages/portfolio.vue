<template>
  <div class="space-y-4">
    <!-- 頂部與更新按鈕 -->
    <div class="flex justify-between items-center px-1">
      <div>
        <h2 class="text-lg font-bold text-white">資產持股庫存</h2>
        <p class="text-[10px] text-slate-500 font-light">
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

      <!-- 庫存列表卡片 -->
      <div v-else class="space-y-3">
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
                <p class="text-[10px] text-slate-500 mt-1 font-mono">
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
              <div class="grid grid-cols-2 gap-3 py-3 border-b border-slate-800/40 text-[10px] text-slate-400">
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
                  class="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 hover:border-rose-500/50 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  ➕ 快速買進
                </button>
                <button 
                  @click="quickRecord(pos, 'SELL')"
                  class="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 active:scale-[0.98]"
                >
                  ➖ 快速賣出
                </button>
              </div>

              <!-- 個股關聯流水帳紀錄 -->
              <div class="mt-3">
                <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">交易紀錄 (由舊至新)</p>
                <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  <div 
                    v-for="tx in pos.transactions" 
                    :key="tx.id"
                    class="flex justify-between items-center p-2 bg-slate-950/40 border border-slate-850/50 rounded-xl text-[10px] text-slate-400"
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
                      <span class="font-mono text-[9px] text-slate-500">{{ tx.transaction_date }}</span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { RefreshCw, Briefcase, ChevronDown } from 'lucide-vue-next';

const portfolio = usePortfolio();

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
</style>
