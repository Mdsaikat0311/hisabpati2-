import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { COLOR_PALETTE_30 } from '../data/categoryCatalog';
import { getMonthKey } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';

export function AddBudgetScreen({
  budgetId,
  initialCategoryName,
  initialOverall,
}: {
  budgetId?: string;
  initialCategoryName?: string;
  initialOverall?: boolean;
}) {
  const { budgets, categories, settings, saveBudget, deleteBudget, closeSubScreen, showSnackbar } =
    useWallet();
  const isBn = settings.language === 'BANGLA';
  const existing = budgetId ? budgets.find((b) => b.id === budgetId) : undefined;
  const expenseCategories = categories.filter((c) => !c.isIncome && !c.isTransfer);

  const [isOverall, setIsOverall] = useState<boolean>(
    existing?.isOverall ?? initialOverall ?? false
  );
  const [categoryName, setCategoryName] = useState<string>(
    existing?.categoryName || initialCategoryName || expenseCategories[0]?.name || 'Food & Drinks'
  );
  const [name, setName] = useState<string>(existing?.name ?? '');
  const [limitStr, setLimitStr] = useState<string>(
    existing?.monthlyLimit ? String(existing.monthlyLimit) : ''
  );
  const [alertPct, setAlertPct] = useState<number>(existing?.alertPercentage ?? 80);
  const [rolloverEnabled, setRolloverEnabled] = useState<boolean>(
    existing?.rolloverEnabled ?? false
  );
  const [colorHex, setColorHex] = useState<string>(
    existing?.colorHex ??
      expenseCategories.find((c) => c.name === categoryName)?.colorHex ??
      '#0284C7'
  );

  const handleSave = () => {
    const limit = parseFloat(limitStr);
    if (!limit || limit <= 0) {
      showSnackbar(isBn ? 'সঠিক বাজেট পরিমাণ দিন' : 'Enter a valid monthly budget amount');
      return;
    }
    const catMeta = expenseCategories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    saveBudget({
      id: existing?.id,
      categoryName: isOverall ? '' : categoryName,
      monthlyLimit: limit,
      monthYear: existing?.monthYear || getMonthKey(),
      isOverall,
      rolloverEnabled,
      name: name.trim() || (isOverall ? t('monthly_budget', settings.language) : categoryName),
      subcategoryName: existing?.subcategoryName ?? '',
      iconName: isOverall ? 'wallet' : catMeta?.iconName || 'category',
      colorHex,
      alertPercentage: alertPct,
    });
    showSnackbar(isBn ? 'বাজেট সংরক্ষিত হয়েছে' : 'Budget saved');
    closeSubScreen();
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={existing ? (isBn ? 'বাজেট সম্পাদনা' : 'Edit Budget') : t('set_budget', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          existing && (
            <button
              type="button"
              onClick={() => {
                deleteBudget(existing.id);
                closeSubScreen();
              }}
              className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          )
        }
      />

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <TranslucentCard className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsOverall(false)}
              className={`py-2.5 rounded-xl text-xs font-bold border ${
                !isOverall
                  ? 'border-sky-500 bg-sky-500/15 text-sky-600'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              {t('category', settings.language)}
            </button>
            <button
              type="button"
              onClick={() => setIsOverall(true)}
              className={`py-2.5 rounded-xl text-xs font-bold border ${
                isOverall
                  ? 'border-sky-500 bg-sky-500/15 text-sky-600'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              {isBn ? 'সামগ্রিক বাজেট' : 'Overall Budget'}
            </button>
          </div>

          {!isOverall && (
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {t('category', settings.language)}
              </label>
              <select
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  const found = expenseCategories.find((c) => c.name === e.target.value);
                  if (found) setColorHex(found.colorHex);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm outline-none"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {isBn && c.nameBn ? c.nameBn : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {isBn ? 'মাসিক সীমা' : 'Monthly Limit'} ({settings.currencySymbol})
            </label>
            <input
              type="number"
              value={limitStr}
              onChange={(e) => setLimitStr(e.target.value)}
              placeholder="10000"
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-2xl font-black font-mono-num outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {isBn ? 'বাজেটের নাম (ঐচ্ছিক)' : 'Label (Optional)'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isOverall ? 'Monthly Overall' : categoryName}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>{isBn ? 'সতর্কতা সীমা' : 'Alert Threshold'}</span>
              <span className="font-bold text-sky-600">{alertPct}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={alertPct}
              onChange={(e) => setAlertPct(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {isBn ? 'অবশিষ্ট বাজেট রোলওভার' : 'Rollover Unspent Amount'}
            </span>
            <button
              type="button"
              onClick={() => setRolloverEnabled((v) => !v)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                rolloverEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  rolloverEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {COLOR_PALETTE_30.slice(0, 12).map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColorHex(hex)}
                className="w-7 h-7 rounded-full border-2"
                style={{
                  backgroundColor: hex,
                  borderColor: colorHex === hex ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
        </TranslucentCard>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-sky-600 text-white text-sm font-extrabold shadow-lg"
        >
          {t('save', settings.language)}
        </button>
      </div>
    </div>
  );
}
