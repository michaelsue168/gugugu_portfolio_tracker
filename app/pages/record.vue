<template>
  <div class="space-y-5">
    <div class="px-1">
      <h2 class="text-lg font-bold text-white">記錄交易流水帳</h2>
      <p class="text-[10px] text-slate-500 font-light">新增或維護您的買賣、配股配息及折讓歷史</p>
    </div>

    <!-- 主要表單卡片 -->
    <div class="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      
      <!-- 頂部切換 Segmented Control -->
      <div class="bg-slate-950/80 p-1 rounded-xl border border-slate-850 flex mb-5 relative overflow-x-auto gap-0.5">
        <button 
          v-for="opt in typeOptions" 
          :key="opt.value"
          @click="changeType(opt.value)"
          type="button"
          class="py-2 px-3 text-[11px] font-bold rounded-lg transition-all duration-300 relative z-10 whitespace-nowrap flex-1 text-center"
          :class="[selectedType === opt.value ? 'text-white' : 'text-slate-500 hover:text-slate-300']"
        >
          {{ opt.label }}
          <span 
            v-if="selectedType === opt.value" 
            class="absolute inset-0 bg-slate-800 border border-slate-700/50 rounded-lg -z-10 shadow-sm"
          ></span>
        </button>
      </div>

      <!-- 表單本體 -->
      <form @submit.prevent="submitForm" class="space-y-4" id="record-form">
        
        <!-- 核心共用欄位：股票代號與名稱 (折讓類型不顯示) -->
        <div v-if="selectedType !== 'DISCOUNT'" class="grid grid-cols-2 gap-3 transition-opacity duration-300">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">股票代號</label>
            <input 
              v-model="form.stock_code" 
              type="text" 
              required 
              placeholder="例如: 2330"
              @input="handleStockCodeInput"
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-700 focus:outline-none transition-all duration-300"
            />
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">股票名稱</label>
            <input 
              v-model="form.stock_name" 
              type="text" 
              required 
              placeholder="自動載入或手動輸入"
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-700 focus:outline-none transition-all duration-300"
            />
          </div>
        </div>

        <!-- 股價與股數 (配股/折讓不用股價，折讓不用股數) -->
        <div class="grid grid-cols-2 gap-3">
          <!-- 單價 (買進/賣出/股息需要) -->
          <div v-if="selectedType === 'BUY' || selectedType === 'SELL' || selectedType === 'DIVIDEND'">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              {{ selectedType === 'DIVIDEND' ? '每股配息金額' : '單價 (股價)' }}
            </label>
            <input 
              v-model.number="form.price" 
              type="number" 
              step="any" 
              required 
              placeholder="0.00"
              @input="calculateEstimates"
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-700 focus:outline-none font-mono"
            />
          </div>

          <!-- 股數 / 金額 (折讓直接填金額) -->
          <div v-if="selectedType !== 'DISCOUNT'">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              {{ selectedType === 'DIVIDEND' ? '除息時持股數' : selectedType === 'BONUS_SHARES' ? '配股股數' : '交易股數 (張=1000)' }}
            </label>
            <input 
              v-model.number="form.shares" 
              type="number" 
              required 
              placeholder="股數"
              @input="calculateEstimates"
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-700 focus:outline-none font-mono"
            />
          </div>

          <!-- 折讓金額 (僅折讓需要) -->
          <div v-else class="col-span-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">折讓 / 退佣金額</label>
            <input 
              v-model.number="form.amount" 
              type="number" 
              required 
              placeholder="輸入新台幣金額"
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-700 focus:outline-none font-mono"
            />
          </div>
        </div>

        <!-- 買賣手續費與折讓設定 -->
        <div v-if="selectedType === 'BUY' || selectedType === 'SELL'" class="bg-slate-950/40 p-3.5 border border-slate-850 rounded-2xl space-y-3">
          <div class="flex justify-between items-center text-[10px] text-slate-400">
            <span class="font-bold">券商手續費預估</span>
            <span class="font-mono text-slate-500">預設 0.1425% | 最低 NT$20</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[9px] font-bold text-slate-500 uppercase mb-1">券商折扣 (折讓)</label>
              <select 
                v-model="brokerDiscount" 
                @change="calculateEstimates"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[11px] text-slate-300 focus:outline-none"
              >
                <option :value="1.0">無折扣 (10折)</option>
                <option :value="0.6">6 折 (一般券商)</option>
                <option :value="0.5">5 折</option>
                <option :value="0.4">4 折</option>
                <option :value="0.3">3 折</option>
                <option :value="0.28">2.8 折 (網路開戶)</option>
                <option :value="0.2">2 折</option>
              </select>
            </div>
            <div>
              <label class="block text-[9px] font-bold text-slate-500 uppercase mb-1">手續費淨額</label>
              <input 
                v-model.number="form.fee" 
                type="number" 
                class="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[11px] text-white font-mono"
              />
            </div>
          </div>

          <!-- 賣出時的證交稅 (台股賣出 0.3%，若為 ETF 則 0.1%) -->
          <div v-if="selectedType === 'SELL'" class="pt-2 border-t border-slate-800/40 grid grid-cols-2 gap-3 items-center">
            <div>
              <span class="text-[9px] font-bold text-slate-500">證券交易稅預估</span>
              <p class="text-[8px] text-slate-500/80 mt-0.5" id="tax-explanation">
                {{ isEtf ? '經判定為 ETF：按 0.1% 計算' : '普通股：按 0.3% 計算' }}
              </p>
            </div>
            <div>
              <input 
                v-model.number="form.tax" 
                type="number" 
                class="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-[11px] text-white font-mono"
              />
            </div>
          </div>
        </div>

        <!-- 交易日期與備註 -->
        <div class="grid grid-cols-2 gap-3">
          <div :class="[selectedType === 'DISCOUNT' ? 'col-span-2' : '']">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">交易日期</label>
            <input 
              v-model="form.date" 
              type="date" 
              required 
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
            />
          </div>

          <div v-if="selectedType !== 'DISCOUNT'" class="col-span-1">
            <!-- 股息或配股手續費(如匯費) -->
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              {{ selectedType === 'DIVIDEND' ? '匯費 / 扣稅' : '手續費 (其他)' }}
            </label>
            <input 
              v-model.number="form.fee" 
              type="number" 
              placeholder="0"
              class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2 px-3 text-xs text-white focus:outline-none font-mono"
            />
          </div>
        </div>

        <!-- 獨立折讓的備註 -->
        <div v-if="selectedType === 'DISCOUNT'">
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">備註說明</label>
          <input 
            v-model="form.note" 
            type="text" 
            placeholder="例如: 國泰證券 1 月退佣"
            class="w-full bg-slate-950/50 border border-slate-850 focus:border-rose-500/80 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-700 focus:outline-none transition-all duration-300"
          />
        </div>

        <!-- 提交按鈕 -->
        <button 
          type="submit" 
          :disabled="submitting"
          class="w-full mt-3 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          <span v-if="submitting" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>寫入資料庫</span>
        </button>

      </form>
    </div>

    <!-- 成功提示 Toast -->
    <transition name="toast-fade">
      <div 
        v-if="toast.show" 
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs py-2.5 px-4 rounded-xl shadow-2xl flex items-center gap-2"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{{ toast.msg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';

// 常用台股代號字典
const MOCK_STOCKS: Record<string, string> = {
  '2330': '台積電',
  '2454': '聯發科',
  '2317': '鴻海',
  '2308': '台達電',
  '2881': '富邦金',
  '2882': '國泰金',
  '2603': '長榮',
  '0050': '元大台灣50',
  '0056': '元大高股息',
  '00878': '國泰永續高股息',
  '00919': '群益台灣精選高息',
  '00929': '復華台灣科技優息'
};

const typeOptions = [
  { label: '買進 (BUY)', value: 'BUY' },
  { label: '賣出 (SELL)', value: 'SELL' },
  { label: '股息 (DIV)', value: 'DIVIDEND' },
  { label: '配股 (BONUS)', value: 'BONUS_SHARES' },
  { label: '折讓 (CASH)', value: 'DISCOUNT' }
];

const selectedType = ref('BUY');
const brokerDiscount = ref(0.28); // 預設 2.8 折
const submitting = ref(false);

// 表單值 Ref
const form = ref({
  stock_code: '',
  stock_name: '',
  price: undefined as number | undefined,
  shares: undefined as number | undefined,
  fee: 0,
  tax: 0,
  amount: undefined as number | undefined, // discount amount
  date: new Date().toISOString().split('T')[0],
  note: ''
});

// Toast 提示
const toast = ref({
  show: false,
  msg: ''
});

const isEtf = computed(() => {
  return form.value.stock_code.startsWith('00');
});

const supabase = useSupabaseClient();
const user = useSupabaseUser();

// 切換交易類型
function changeType(type: string) {
  selectedType.value = type;
  resetFormFields();

  // 欄位切換時使用 GSAP 做一個流暢的微動畫效果
  if (process.client) {
    gsap.fromTo('#record-form', 
      { opacity: 0.7, y: 3 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power1.out' }
    );
  }
}

// 重置部分表單欄位
function resetFormFields() {
  form.value.price = undefined;
  form.value.shares = undefined;
  form.value.amount = undefined;
  form.value.fee = 0;
  form.value.tax = 0;
  form.value.note = '';
}

// 監聽代號輸入自動完成股票名稱
function handleStockCodeInput() {
  const code = form.value.stock_code.trim();
  if (MOCK_STOCKS[code]) {
    form.value.stock_name = MOCK_STOCKS[code];
  }
  calculateEstimates();
}

// 核心計算：自動預估台股手續費與證交稅
function calculateEstimates() {
  const price = form.value.price || 0;
  const shares = form.value.shares || 0;
  const volume = price * shares;

  if (volume <= 0) return;

  if (selectedType.value === 'BUY' || selectedType.value === 'SELL') {
    // 台股原始手續費率 0.1425%，最低 NT$20
    const rawFee = volume * 0.001425;
    const finalFee = Math.max(20, Math.floor(rawFee * brokerDiscount.value));
    form.value.fee = finalFee;

    if (selectedType.value === 'SELL') {
      // 台股證交稅：ETF 為 0.1%，普通股為 0.3%
      const taxRate = isEtf.value ? 0.001 : 0.003;
      form.value.tax = Math.floor(volume * taxRate);
    } else {
      form.value.tax = 0;
    }
  }
}

// 送出表單到 Supabase
async function submitForm() {
  if (!user.value) {
    alert('請先進行登入！');
    return;
  }

  submitting.value = true;
  try {
    if (selectedType.value === 'DISCOUNT') {
      // 寫入 cash_flows 資料表
      const { error } = await supabase.from('cash_flows').insert({
        user_id: user.value.id,
        type: 'DISCOUNT',
        amount: Number(form.value.amount) || 0,
        note: form.value.note || '折讓收入',
        record_date: form.value.date
      });
      if (error) throw error;
      showToast('🎉 折讓收入記錄成功！');

    } else {
      // 寫入 transactions 資料表
      // 買進股數為正，賣出股數為負
      const calculatedShares = selectedType.value === 'SELL' 
        ? -Math.abs(form.value.shares || 0) 
        : Math.abs(form.value.shares || 0);

      const { error } = await supabase.from('transactions').insert({
        user_id: user.value.id,
        stock_code: form.value.stock_code.trim(),
        stock_name: form.value.stock_name.trim(),
        action: selectedType.value,
        price: Number(form.value.price) || 0,
        shares: calculatedShares,
        fee: Number(form.value.fee) || 0,
        tax: Number(form.value.tax) || 0,
        transaction_date: form.value.date
      });
      if (error) throw error;
      showToast(`🎉 ${formatAction(selectedType.value)}交易紀錄成功！`);
    }

    // 成功後重置表單
    resetFormFields();
    form.value.stock_code = '';
    form.value.stock_name = '';

  } catch (err: any) {
    console.error('Submit error:', err);
    alert('寫入資料庫失敗：' + (err.message || '未知錯誤'));
  } finally {
    submitting.value = false;
  }
}

// 顯示 Toast
function showToast(msg: string) {
  toast.value.msg = msg;
  toast.value.show = true;
  setTimeout(() => {
    toast.value.show = false;
  }, 2200);
}

function formatAction(action: string): string {
  switch(action) {
    case 'BUY': return '買入';
    case 'SELL': return '賣出';
    case 'DIVIDEND': return '配息';
    case 'BONUS_SHARES': return '配股';
    default: return action;
  }
}
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease-out;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 15px);
}
</style>
