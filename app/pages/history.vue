<template>
  <div class="space-y-4">
    <!-- 標題與簡介 -->
    <div class="px-1 flex justify-between items-center">
      <div>
        <h2 class="text-lg font-bold text-white">交易明細流水帳</h2>
        <p class="text-[10px] text-slate-500 font-light">
          目前共有 {{ sortedTimeline.length }} 筆歷史紀錄
        </p>
      </div>
    </div>

    <!-- 載入中遮罩 -->
    <div v-if="portfolio.loading.value" class="py-16 flex flex-col justify-center items-center gap-3">
      <span class="w-7 h-7 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></span>
      <p class="text-xs text-slate-400 font-light">正在讀取明細紀錄...</p>
    </div>

    <div v-else class="space-y-3">
      <!-- 流水帳為空提示 -->
      <div v-if="sortedTimeline.length === 0" class="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-12 text-center">
        <HistoryIcon class="w-10 h-10 mx-auto mb-3 text-slate-700" />
        <h3 class="text-sm font-bold text-slate-400">目前無交易歷史明細</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
          當您在「新增」頁面寫入買進、賣出、股利或折讓紀錄後，這裡將會呈現您完整的資產帳簿。
        </p>
      </div>

      <!-- 流水帳列表卡片 -->
      <div v-else class="space-y-2.5">
        <div 
          v-for="item in sortedTimeline" 
          :key="item.timelineId"
          class="bg-slate-900/40 backdrop-blur-sm border border-slate-850/60 rounded-2xl p-3.5 flex justify-between items-center relative overflow-hidden transition-all duration-300 hover:border-slate-750"
          :class="[getBorderClass(item)]"
        >
          <!-- 左側資訊 (類型、日期、個股代號名稱) -->
          <div class="flex items-center gap-3">
            <!-- 左側醒目顏色邊線 -->
            <div class="absolute left-0 top-0 bottom-0 w-1" :class="[getBarBgClass(item)]"></div>
            
            <div>
              <div class="flex items-center gap-2">
                <span 
                  class="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
                  :class="[getLabelClass(item)]"
                >
                  {{ formatAction(item.action || item.type) }}
                </span>
                <span class="text-[10px] text-slate-500 font-mono font-medium">{{ item.date }}</span>
              </div>

              <h4 class="text-xs font-bold text-white mt-1">
                {{ item.stock_code ? `${item.stock_code} ${item.stock_name}` : item.note }}
              </h4>
            </div>
          </div>

          <!-- 右側數值與刪除按鈕 -->
          <div class="flex items-center gap-3">
            <div class="text-right font-mono">
              <!-- 顯示詳細算式數值 -->
              <p class="text-xs font-bold text-slate-200" :class="[getValueClass(item)]">
                {{ getValueString(item) }}
              </p>
              
              <!-- 顯示手續費與稅金細節 (折讓不顯示) -->
              <p v-if="item.stock_code" class="text-[9px] text-slate-500 mt-0.5">
                <span v-if="item.fee">費:${{ item.fee }}</span>
                <span v-if="item.tax"> 稅:${{ item.tax }}</span>
              </p>
            </div>

            <!-- 🗑️ 刪除流水帳按鈕 -->
            <button 
              @click="deleteItem(item)"
              class="p-2 rounded-xl bg-slate-850/50 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 border border-slate-800/30 hover:border-rose-900/50 transition-all duration-300"
              title="刪除此紀錄"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { History as HistoryIcon, Trash2 } from 'lucide-vue-next';

const portfolio = usePortfolio();
const supabase = useSupabaseClient();

// 合併 transactions 與 cash_flows 為一個時間軸列表 (由新至舊)
const sortedTimeline = computed(() => {
  const list: any[] = [];

  // 1. 加入交易紀錄
  for (const tx of portfolio.transactions.value) {
    list.push({
      ...tx,
      timelineId: `tx-${tx.id}`,
      date: tx.transaction_date,
      isTransaction: true
    });
  }

  // 2. 加入獨立折讓現金流
  for (const cf of portfolio.cashFlows.value) {
    list.push({
      ...cf,
      timelineId: `cf-${cf.id}`,
      date: cf.record_date,
      isTransaction: false
    });
  }

  // 3. 排序 (由新至舊)
  return list.sort((a, b) => b.date.localeCompare(a.date));
});

// 千分位格式化
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('zh-TW');
}

// 根據類型取得邊線樣式
function getBorderClass(item: any): string {
  if (!item.isTransaction) return 'hover:border-purple-900/50';
  switch (item.action) {
    case 'BUY': return 'hover:border-rose-900/50';
    case 'SELL': return 'hover:border-emerald-900/50';
    case 'DIVIDEND': return 'hover:border-amber-900/50';
    case 'BONUS_SHARES': return 'hover:border-sky-900/50';
    default: return '';
  }
}

// 根據類型取得邊條底色
function getBarBgClass(item: any): string {
  if (!item.isTransaction) return 'bg-purple-500/80';
  switch (item.action) {
    case 'BUY': return 'bg-rose-500/80';
    case 'SELL': return 'bg-emerald-500/80';
    case 'DIVIDEND': return 'bg-amber-500/80';
    case 'BONUS_SHARES': return 'bg-sky-500/80';
    default: return 'bg-slate-700';
  }
}

// 標籤樣式
function getLabelClass(item: any): string {
  if (!item.isTransaction) return 'bg-purple-500/10 text-purple-400';
  switch (item.action) {
    case 'BUY': return 'bg-rose-500/10 text-rose-400';
    case 'SELL': return 'bg-emerald-500/10 text-emerald-400';
    case 'DIVIDEND': return 'bg-amber-500/10 text-amber-400';
    case 'BONUS_SHARES': return 'bg-sky-500/10 text-sky-400';
    default: return 'bg-slate-800 text-slate-400';
  }
}

// 數值文字樣式
function getValueClass(item: any): string {
  if (!item.isTransaction) return 'text-purple-400';
  switch (item.action) {
    case 'BUY': return 'text-rose-400';
    case 'SELL': return 'text-emerald-400';
    case 'DIVIDEND': return 'text-amber-400';
    case 'BONUS_SHARES': return 'text-sky-400';
    default: return 'text-slate-350';
  }
}

// 類型翻譯
function formatAction(action: string): string {
  switch(action) {
    case 'BUY': return '買入';
    case 'SELL': return '賣出';
    case 'DIVIDEND': return '配息';
    case 'BONUS_SHARES': return '配股';
    case 'DISCOUNT': return '折讓';
    default: return action;
  }
}

// 拼湊數值明細說明字串
function getValueString(item: any): string {
  if (!item.isTransaction) {
    return `+$${formatNumber(item.amount)}`;
  }
  const shares = Math.abs(item.shares);
  switch (item.action) {
    case 'BUY':
      return `-${formatNumber(shares * item.price + item.fee)} (${shares}股)`;
    case 'SELL':
      return `+${formatNumber(shares * item.price - item.fee - item.tax)} (${shares}股)`;
    case 'DIVIDEND':
      return `+$${formatNumber((item.price * (item.shares || 1)) - item.fee)}`;
    case 'BONUS_SHARES':
      return `+${item.shares} 股 (配股)`;
    default:
      return '';
  }
}

// 刪除交易或現金流
async function deleteItem(item: any) {
  const confirmMsg = item.isTransaction
    ? `您確定要刪除「${item.stock_name}」的${formatAction(item.action)}紀錄嗎？這會重新計算持股均價與總資產。`
    : `您確定要刪除「${item.note}」的折讓紀錄嗎？`;

  if (!confirm(confirmMsg)) return;

  try {
    if (item.isTransaction) {
      // 刪除 transactions 表中的一列
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', item.id);
      if (error) throw error;
    } else {
      // 刪除 cash_flows 表中的一列
      const { error } = await supabase
        .from('cash_flows')
        .delete()
        .eq('id', item.id);
      if (error) throw error;
    }

    // 重新拉取最新的組合資料
    await portfolio.fetchData();
  } catch (err: any) {
    alert('刪除失敗：' + (err.message || '未知錯誤'));
  }
}

onMounted(async () => {
  await portfolio.fetchData();
});
</script>
