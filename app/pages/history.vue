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

          <!-- 右側數值與刪除/編輯按鈕 -->
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

            <div class="flex items-center gap-1.5">
              <!-- ✏️ 編輯流水帳按鈕 -->
              <button 
                @click="openEditModal(item)"
                class="p-2 rounded-xl bg-slate-850/50 hover:bg-amber-950/30 text-slate-500 hover:text-amber-400 border border-slate-800/30 hover:border-amber-900/50 transition-all duration-300"
                title="編輯此紀錄"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>

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

    <!-- ✏️ 編輯交易/折讓對話框 (Centered Modal) -->
    <transition name="modal-slide">
      <div v-if="showEditModal && editingItem" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- 遮罩背景 -->
        <div @click="closeEditModal" class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"></div>
        
        <!-- 視窗卡片 -->
        <div class="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-5 space-y-4 max-h-[80vh] overflow-y-auto z-10 transform transition-all select-none">
          
          <div class="flex justify-between items-center pb-2 border-b border-slate-850">
            <div>
              <h3 class="text-sm font-bold text-white">編輯{{ editingItem.isTransaction ? '交易' : '折讓' }}紀錄</h3>
              <p class="text-[9px] text-slate-500 mt-0.5">
                修改後系統將自動即時重新計算持股與總資產成本
              </p>
            </div>
            <span class="px-2 py-0.5 rounded text-[8px] font-bold tracking-wider" :class="[getLabelClass(editingItem)]">
              {{ formatAction(editingItem.action || editingItem.type) }}
            </span>
          </div>

          <form @submit.prevent="saveEdit" class="space-y-4">
            <!-- 唯讀資訊：個股代號名稱 (折讓類型不顯示) -->
            <div v-if="editingItem.isTransaction" class="grid grid-cols-2 gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
              <div>
                <span class="block text-[8px] font-bold text-slate-500 uppercase font-mono">股票代號</span>
                <span class="text-xs text-slate-300 font-mono font-bold">{{ editingItem.stock_code }}</span>
              </div>
              <div>
                <span class="block text-[8px] font-bold text-slate-500 uppercase font-mono">股票名稱</span>
                <span class="text-xs text-slate-300 font-bold">{{ editingItem.stock_name }}</span>
              </div>
            </div>

            <!-- 可編輯欄位：日期 (採用滾輪式選取器) -->
            <div>
              <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">交易日期</label>
              <WheelDatePicker v-model="editingItem.date" />
            </div>

            <!-- 交易類型 (單價與股數) -->
            <div v-if="editingItem.isTransaction" class="grid grid-cols-2 gap-3">
              <!-- 單價 (買進/賣出/股息需要) -->
              <div v-if="editingItem.action === 'BUY' || editingItem.action === 'SELL' || editingItem.action === 'DIVIDEND'">
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  {{ editingItem.action === 'DIVIDEND' ? '每股配息金額' : '單價 (股價)' }}
                </label>
                <input 
                  v-model.number="editingItem.price" 
                  type="number" 
                  step="any" 
                  required 
                  class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <!-- 股數 / 持股數 -->
              <div>
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  {{ editingItem.action === 'DIVIDEND' ? '除息時持股數' : editingItem.action === 'BONUS_SHARES' ? '配股股數' : '交易股數' }}
                </label>
                <input 
                  v-model.number="editingItem.shares" 
                  type="number" 
                  required 
                  class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <!-- 手續費與稅金 (交易類型) -->
            <div v-if="editingItem.isTransaction" class="grid grid-cols-2 gap-3">
              <!-- 費 -->
              <div v-if="editingItem.action === 'BUY' || editingItem.action === 'SELL' || editingItem.action === 'DIVIDEND'">
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  {{ editingItem.action === 'DIVIDEND' ? '匯費 / 扣稅' : '手續費淨額' }}
                </label>
                <input 
                  v-model.number="editingItem.fee" 
                  type="number" 
                  class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <!-- 稅 (僅賣出有) -->
              <div v-if="editingItem.action === 'SELL'">
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">證券交易稅</label>
                <input 
                  v-model.number="editingItem.tax" 
                  type="number" 
                  class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <!-- 折讓欄位：金額與備註 (DISCOUNT 類型) -->
            <div v-if="!editingItem.isTransaction" class="space-y-3.5">
              <div>
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">折讓 / 退佣金額</label>
                <input 
                  v-model.number="editingItem.amount" 
                  type="number" 
                  required 
                  class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">備註說明</label>
                <input 
                  v-model="editingItem.note" 
                  type="text" 
                  class="w-full bg-slate-950/60 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="grid grid-cols-2 gap-3 pt-3">
              <button 
                type="button" 
                @click="closeEditModal"
                class="py-3 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-800"
              >
                取消
              </button>
              <button 
                type="submit" 
                :disabled="editSubmitting"
                class="py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span v-if="editSubmitting" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>儲存修改</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { History as HistoryIcon, Trash2, Pencil } from 'lucide-vue-next';

const portfolio = usePortfolio();
const supabase = useSupabaseClient();

// 編輯 Modal 狀態與變數
const showEditModal = ref(false);
const editSubmitting = ref(false);
const editingItem = ref<any>(null);

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
  if (!item) return 'bg-slate-800 text-slate-400';
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

// 開啟編輯彈出對話框
function openEditModal(item: any) {
  editingItem.value = {
    ...item,
    date: item.date
  };
  
  if (item.isTransaction) {
    editingItem.value.price = Number(item.price);
    // 在前端編輯一律呈現正股數，存檔時會根據 BUY/SELL 自動附加正負號
    editingItem.value.shares = Math.abs(Number(item.shares));
    editingItem.value.fee = Number(item.fee);
    editingItem.value.tax = Number(item.tax);
  } else {
    editingItem.value.amount = Number(item.amount);
    editingItem.value.note = item.note || '';
  }
  showEditModal.value = true;
}

// 關閉編輯對話框
function closeEditModal() {
  showEditModal.value = false;
  editingItem.value = null;
}

// 儲存編輯修改
async function saveEdit() {
  if (!editingItem.value) return;
  editSubmitting.value = true;
  try {
    if (editingItem.value.isTransaction) {
      // 買進股數為正，賣出股數為負
      const calculatedShares = editingItem.value.action === 'SELL' 
        ? -Math.abs(editingItem.value.shares || 0) 
        : Math.abs(editingItem.value.shares || 0);

      const { error } = await supabase
        .from('transactions')
        .update({
          price: Number(editingItem.value.price) || 0,
          shares: calculatedShares,
          fee: Number(editingItem.value.fee) || 0,
          tax: Number(editingItem.value.tax) || 0,
          transaction_date: editingItem.value.date
        })
        .eq('id', editingItem.value.id);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('cash_flows')
        .update({
          amount: Number(editingItem.value.amount) || 0,
          note: editingItem.value.note || '折讓收入',
          record_date: editingItem.value.date
        })
        .eq('id', editingItem.value.id);
      
      if (error) throw error;
    }

    closeEditModal();
    // 重新讀取資產資料，讓所有持股均價與帳戶資產重整
    await portfolio.fetchData();
  } catch (err: any) {
    console.error('儲存修改失敗：', err);
    alert('儲存修改失敗：' + (err.message || '未知錯誤'));
  } finally {
    editSubmitting.value = false;
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

<style scoped>
/* Modal 縮放淡入動畫 */
.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: opacity 0.25s ease;
}

.modal-slide-enter-active .relative,
.modal-slide-leave-active .relative {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  opacity: 0;
}

.modal-slide-enter-from .relative,
.modal-slide-leave-to .relative {
  transform: scale(0.9) translateY(10px);
}
</style>
