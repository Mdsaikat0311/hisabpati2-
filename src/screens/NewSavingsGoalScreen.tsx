import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { COLOR_PALETTE_30 } from '../data/categoryCatalog';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';

const GOAL_ICONS = ['savings', 'flight', 'home', 'directions_car', 'laptop_mac', 'diamond', 'medical_services', 'star'];

export function NewSavingsGoalScreen() {
  const { settings, addSavingsGoal, closeSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [savedStr, setSavedStr] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [colorHex, setColorHex] = useState('#10B981');
  const [iconName, setIconName] = useState('savings');

  const handleSave = () => {
    const target = parseFloat(targetStr);
    if (!name.trim() || !target || target <= 0) {
      showSnackbar(isBn ? 'লক্ষ্যের নাম ও সঠিক পরিমাণ দিন' : 'Enter goal name and target amount');
      return;
    }
    addSavingsGoal({
      name: name.trim(),
      targetAmount: target,
      savedAmount: Math.max(0, parseFloat(savedStr) || 0),
      themeColorHex: colorHex,
      iconName,
      targetDeadline: deadline ? new Date(deadline).getTime() : null,
      targetDeadlineStr: deadline,
    });
    showSnackbar(isBn ? 'নতুন সঞ্চয় লক্ষ্য তৈরি হয়েছে' : 'Savings goal created');
    closeSubScreen();
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('savings_goals', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <TranslucentCard className="p-5 space-y-4">
          <div className="flex justify-center">
            <CategoryIcon iconName={iconName} colorHex={colorHex} size={60} iconSize={28} />
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isBn ? 'লক্ষ্যের নাম (যেমন: জরুরি তহবিল)' : 'Goal Name (e.g. Emergency Fund)'}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {t('target', settings.language)} ({settings.currencySymbol})
              </label>
              <input
                type="number"
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-bold font-mono-num"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {t('saved', settings.language)} ({settings.currencySymbol})
              </label>
              <input
                type="number"
                value={savedStr}
                onChange={(e) => setSavedStr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-bold font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {isBn ? 'লক্ষ্যমাত্রার তারিখ (ঐচ্ছিক)' : 'Target Deadline (Optional)'}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIconName(ic)}
                className={`p-1.5 rounded-xl border ${
                  iconName === ic ? 'border-sky-500 bg-sky-500/10' : 'border-transparent'
                }`}
              >
                <CategoryIcon iconName={ic} colorHex={colorHex} size={34} iconSize={16} />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
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
          className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-extrabold shadow-lg"
        >
          {t('save', settings.language)}
        </button>
      </div>
    </div>
  );
}
