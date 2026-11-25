import React, { useState } from 'react';
import {
  Download,
  Upload,
  CloudUpload,
  CloudDownload,
  Database,
  Trash2,
  ClipboardPaste,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { formatDateTime } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { BackupRestoreModal } from '../components/BackupRestoreModal';
import type { NormalizedBackupPayload } from '../utils/backup';

export function BackupRestoreScreen() {
  const {
    authUser,
    settings,
    extendedSettings,
    accounts,
    transactions,
    exportJsonBackup,
    exportCsvBackup,
    exportSampleJson,
    parseBackupPreview,
    uploadCloudBackup,
    fetchCloudBackupPreview,
    syncCloudNow,
    clearAllData,
    loadSampleDataset,
    updateExtendedSettings,
    closeSubScreen,
    showSnackbar,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [previewPayload, setPreviewPayload] = useState<NormalizedBackupPayload | null>(null);
  const [previewSource, setPreviewSource] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [includeCloudClear, setIncludeCloudClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupPreview(text);
      setPreviewSource(file.name);
      setPreviewPayload(parsed);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Invalid backup file');
    }
    e.target.value = '';
  };

  const handleCloudUpload = async () => {
    setBusy(true);
    try {
      await uploadCloudBackup();
      showSnackbar(isBn ? 'ক্লাউড ব্যাকআপ সম্পন্ন হয়েছে' : 'Cloud backup uploaded');
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Cloud backup failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCloudRestore = async () => {
    setBusy(true);
    try {
      const res = await fetchCloudBackupPreview();
      if (!res) {
        showSnackbar(isBn ? 'কোনো ক্লাউড ব্যাকআপ পাওয়া যায়নি' : 'No cloud backup found');
        return;
      }
      const parsed = parseBackupPreview(res.jsonString);
      setPreviewSource(`Cloud Snapshot (${res.info.backupDate})`);
      setPreviewPayload(parsed);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to fetch cloud backup');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('backup_restore', settings.language)} onBack={closeSubScreen} />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        <TranslucentCard className="p-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-500">{t('accounts', settings.language)}</p>
            <p className="text-xl font-black font-mono-num">{accounts.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('transactions_label', settings.language)}</p>
            <p className="text-xl font-black font-mono-num">{transactions.length}</p>
          </div>
        </TranslucentCard>

        {/* Local File Export & Import */}
        <TranslucentCard className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-500">
            {isBn ? 'লোকাল ফাইল ব্যাকআপ ও রিস্টোর' : 'Local File Backup & Restore'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                triggerDownload(
                  exportJsonBackup(),
                  `hishab-pati-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  'application/json'
                );
                showSnackbar(isBn ? 'JSON ব্যাকআপ ডাউনলোড হয়েছে' : 'JSON backup downloaded');
              }}
              className="p-3.5 rounded-2xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download size={15} /> {isBn ? 'JSON ব্যাকআপ ডাউনলোড' : 'Export JSON Backup'}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerDownload(
                  exportCsvBackup(),
                  `hishab-pati-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
                  'text/csv'
                );
                showSnackbar(isBn ? 'CSV এক্সপোর্ট ডাউনলোড হয়েছে' : 'CSV export downloaded');
              }}
              className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Download size={15} /> {isBn ? 'CSV স্প্রেডশিট ডাউনলোড' : 'Export CSV Backup'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={15} className="text-sky-600" />
              <span>{isBn ? 'ফাইল থেকে রিস্টোর (JSON/CSV)' : 'Import JSON / CSV File'}</span>
              <input type="file" accept=".json,.csv" onChange={(e) => void handleFilePick(e)} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2"
            >
              <ClipboardPaste size={15} className="text-violet-600" />
              <span>{isBn ? 'টেক্সট পেস্ট করে রিস্টোর' : 'Paste Backup JSON/CSV'}</span>
            </button>
          </div>
        </TranslucentCard>

        {/* Firebase Cloud Backup */}
        <TranslucentCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-500">
              {t('cloud_sync', settings.language)}
            </h3>
            {extendedSettings.lastAutoBackupMillis > 0 && (
              <span className="text-[11px] text-slate-500">
                {formatDateTime(extendedSettings.lastAutoBackupMillis, settings.language)}
              </span>
            )}
          </div>
          {!authUser ? (
            <p className="text-xs text-slate-500">
              {isBn
                ? 'ক্লাউড ব্যাকআপ ব্যবহার করতে সেটিংস থেকে গুগল দিয়ে সাইন ইন করুন।'
                : 'Sign in with Google from Settings to enable encrypted Firestore Cloud Backups.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCloudUpload()}
                  className="p-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CloudUpload size={15} /> {isBn ? 'ক্লাউডে ব্যাকআপ রাখুন' : 'Upload Cloud Backup'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCloudRestore()}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CloudDownload size={15} className="text-sky-600" />{' '}
                  {isBn ? 'সর্বশেষ ক্লাউড রিস্টোর' : 'Restore Latest Cloud'}
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void syncCloudNow()
                    .then(() => showSnackbar(isBn ? 'ক্লাউড সিঙ্ক সম্পন্ন' : 'Real-time cloud sync complete'))
                    .catch((e) => showSnackbar(e instanceof Error ? e.message : 'Sync failed'))
                }
                className="w-full py-2.5 rounded-xl bg-sky-500/15 text-sky-600 text-xs font-bold"
              >
                {isBn ? 'এখনই ফায়ারস্টোর সিঙ্ক করুন' : 'Sync Local Accounts & Transactions Now'}
              </button>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold">
                  {isBn ? 'স্বয়ংক্রিয় ব্যাকআপ রিমাইন্ডার' : 'Auto-backup preference'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateExtendedSettings({
                      autoBackupEnabled: !extendedSettings.autoBackupEnabled,
                    })
                  }
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                    extendedSettings.autoBackupEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      extendedSettings.autoBackupEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </TranslucentCard>

        {/* Sample Data & Danger Zone */}
        <TranslucentCard className="p-4 space-y-2.5">
          <button
            type="button"
            onClick={loadSampleDataset}
            className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Database size={15} className="text-sky-600" />
            <span>{isBn ? 'পূর্ণাঙ্গ নমুনা ডেটাসেট লোড করুন' : 'Load Reconciled Sample Dataset'}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              triggerDownload(exportSampleJson(), 'hishab-pati-sample-template.json', 'application/json')
            }
            className="w-full py-2 text-xs font-semibold text-sky-600 hover:underline"
          >
            {isBn ? 'নমুনা JSON টেমপ্লেট ডাউনলোড' : 'Download Sample JSON Template'}
          </button>
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="w-full p-3 rounded-2xl bg-rose-500/15 text-rose-600 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Trash2 size={15} /> {t('clear_all_data', settings.language)}
          </button>
        </TranslucentCard>
      </div>

      {/* Paste Backup Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {isBn ? 'ব্যাকআপ JSON / CSV পেস্ট করুন' : 'Paste Backup JSON or CSV'}
              </h3>
              <button type="button" onClick={() => setShowPasteModal(false)}>
                <X size={16} />
              </button>
            </div>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs font-mono outline-none"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  const parsed = parseBackupPreview(pasteText);
                  setShowPasteModal(false);
                  setPreviewSource('Pasted Backup Text');
                  setPreviewPayload(parsed);
                } catch (err) {
                  showSnackbar(err instanceof Error ? err.message : 'Invalid backup format');
                }
              }}
              className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              {isBn ? 'প্রিভিউ দেখুন' : 'Inspect Backup'}
            </button>
          </div>
        </div>
      )}

      {/* Clear All Data Confirmation */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-4">
            <h3 className="text-base font-bold text-rose-600">
              {t('clear_all_data', settings.language)}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'এই কাজটি আপনার সকল অ্যাকাউন্ট, লেনদেন, বাজেট, ঋণ এবং সঞ্চয় লক্ষ্য স্থায়ীভাবে মুছে ফেলবে।'
                : 'This permanently deletes all accounts, transactions, budgets, debts, and savings goals.'}
            </p>
            {authUser && (
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCloudClear}
                  onChange={(e) => setIncludeCloudClear(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>
                  {isBn ? 'ক্লাউড ফায়ারস্টোর ডেটাও মুছুন' : 'Also delete Firebase Cloud records'}
                </span>
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                {t('cancel', settings.language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  void clearAllData(includeCloudClear).then(() => {
                    setShowClearModal(false);
                    showSnackbar(isBn ? 'সকল ডেটা মুছে ফেলা হয়েছে' : 'All data cleared');
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                {t('delete', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}

      <BackupRestoreModal
        payload={previewPayload}
        sourceLabel={previewSource}
        onClose={() => setPreviewPayload(null)}
      />
    </div>
  );
}
