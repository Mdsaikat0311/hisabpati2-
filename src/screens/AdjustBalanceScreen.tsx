import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { formatCurrency } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';

export function AdjustBalanceScreen({ accountId }: { accountId: string }) {
  const { accounts, settings, adjustAccountBalance, closeSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const account = accounts.find((a) => a.id === accountId);

  const [targetBalance, setTargetBalance] = useState(
    account ? String(account.type === 'CREDIT_CARD' ? Math.abs(account.balance) : account.balance) : '0'
  );
  const [createTx, setCreateTx] = useState(true);

  if (!account) {
    return (
      <div>
        <SubScreenHeader title={isBn ? 'ব্যালেন্স সমন্বয়' : 'Adjust Balance'} onBack={closeSubScreen} />
      </div>
    );
  }

  const parsedTarget = parseFloat(targetBalance) || 0;
  const finalBalance = account.type === 'CREDIT_CARD' ? -Math.abs(parsedTarget) : parsedTarget;
  const diff = finalBalance - account.balance;

  const handleSave = () => {
    adjustAccountBalance(account.id, finalBalance, createTx);
    showSnackbar(isBn ? 'ব্যালেন্স সমন্বয় সম্পন্ন হয়েছে' : 'Balance adjusted');
    closeSubScreen();
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={isBn ? 'ব্যালেন্স সমন্বয়' : 'Adjust Balance'}
        subtitle={account.name}
        onBack={closeSubScreen}
      />

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <TranslucentCard className="p-5 space-y-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{isBn ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}</span>
            <strong className="font-mono-num text-slate-900 dark:text-white">
              {formatCurrency(account.balance, settings.currencySymbol, settings.language)}
            </strong>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {account.type === 'CREDIT_CARD'
                ? isBn
                  ? 'নতুন বকেয়া পরিমাণ'
                  : 'New Outstanding Balance'
                : isBn
                ? 'নতুন প্রকৃত ব্যালেন্স'
                : 'New Actual Balance'}
            </label>
            <input
              type="number"
              value={targetBalance}
              onChange={(e) => setTargetBalance(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xl font-black font-mono-num outline-none"
            />
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-slate-500">{isBn ? 'পার্থক্য' : 'Difference'}</span>
            <span
              className={`font-bold font-mono-num ${
                diff >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(diff, settings.currencySymbol, settings.language, true)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {isBn ? 'সমন্বয় লেনদেন হিসেবে রেকর্ড করুন' : 'Log Adjustment Transaction'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isBn
                  ? 'অ্যাক্টিভিটি ইতিহাসে পার্থক্যটি সংরক্ষণ করবে'
                  : 'Records the difference in your Activity history'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateTx((v) => !v)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                createTx ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  createTx ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
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
