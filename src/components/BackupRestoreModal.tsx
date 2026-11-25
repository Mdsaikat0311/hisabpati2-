import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, X, Loader2, ArrowRight } from 'lucide-react';
import type { NormalizedBackupPayload, RestoreStage } from '../utils/backup';
import { useWallet } from '../context/WalletContext';

export function BackupRestoreModal({
  payload,
  sourceLabel,
  onClose,
}: {
  payload: NormalizedBackupPayload | null;
  sourceLabel: string;
  onClose: () => void;
}) {
  const { applyRestoredBackup, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [step, setStep] = useState<'PREVIEW' | 'RESTORING' | 'DONE' | 'ERROR'>('PREVIEW');
  const [progress, setProgress] = useState(0);
  const [stageMsg, setStageMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!payload) return null;

  const handleConfirmRestore = async () => {
    setStep('RESTORING');
    setProgress(25);
    setStageMsg(isBn ? 'রিস্টোর শুরু হচ্ছে...' : 'Starting restore...');
    try {
      await applyRestoredBackup(payload, (_stage: RestoreStage, pct: number, msg: string) => {
        setProgress(pct);
        setStageMsg(msg);
      });
      setStep('DONE');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Restore failed');
      setStep('ERROR');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isBn ? 'ব্যাকআপ রিস্টোর প্রিভিউ' : 'Backup Restore Preview'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        {step === 'PREVIEW' && (
          <>
            <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-3 text-xs space-y-1">
              <p className="font-bold text-sky-700 dark:text-sky-300">{sourceLabel}</p>
              <p className="text-slate-600 dark:text-slate-400">
                Format: {payload.formatType} • Schema v{payload.schemaVersion}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500 block">{isBn ? 'অ্যাকাউন্ট' : 'Accounts'}</span>
                <span className="text-base font-extrabold">{payload.accounts.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500 block">{isBn ? 'লেনদেন' : 'Transactions'}</span>
                <span className="text-base font-extrabold">{payload.transactions.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500 block">{isBn ? 'বাজেট ও সঞ্চয়' : 'Budgets & Goals'}</span>
                <span className="text-base font-extrabold">
                  {payload.budgets.length + payload.savingsGoals.length}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-500 block">{isBn ? 'ঋণ ও দেনা' : 'Debts'}</span>
                <span className="text-base font-extrabold">{payload.debts.length}</span>
              </div>
            </div>

            {payload.skippedDuplicatesCount > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {payload.skippedDuplicatesCount} duplicate records automatically deduplicated.
              </p>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? 'রিস্টোর করলে আপনার বর্তমান লোকাল ডেটা এই ব্যাকআপ দ্বারা প্রতিস্থাপিত হবে।'
                : 'Restoring will replace your current local wallet records with this snapshot.'}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRestore()}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-bold flex items-center justify-center gap-1"
              >
                {isBn ? 'রিস্টোর করুন' : 'Restore Now'} <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {step === 'RESTORING' && (
          <div className="py-6 text-center space-y-4">
            <Loader2 size={32} className="animate-spin text-sky-600 mx-auto" />
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{stageMsg}</p>
          </div>
        )}

        {step === 'DONE' && (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 size={38} className="text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {isBn ? 'সফলভাবে রিস্টোর হয়েছে!' : 'Restore Complete!'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? `${payload.accounts.length}টি অ্যাকাউন্ট ও ${payload.transactions.length}টি লেনদেন রিস্টোর করা হয়েছে।`
                : `Restored ${payload.accounts.length} accounts and ${payload.transactions.length} transactions.`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              {isBn ? 'সম্পন্ন' : 'Done'}
            </button>
          </div>
        )}

        {step === 'ERROR' && (
          <div className="py-4 text-center space-y-3">
            <ShieldAlert size={36} className="text-red-500 mx-auto" />
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{errorMsg}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
