import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CreditCard,
  Edit3,
  Plus,
  RotateCcw,
  Save,
  Wallet,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import {
  buildAccountNotesWithMetadata,
  parseAccountNotesMetadata,
  SUPPORTED_CARD_NETWORKS,
} from '../data/cardBrandAssets';
import { COLOR_PALETTE_30 } from '../data/categoryCatalog';
import { calculateNetWorthSummary } from '../utils/analytics';
import { formatCurrency } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import type { AccountEntity, AccountType } from '../types/models';

export function CardsManagerScreen({ initialAccountId }: { initialAccountId?: string }) {
  const {
    accounts,
    transactions,
    settings,
    updateAccount,
    adjustAccountBalance,
    restoreCoreCards,
    openSubScreen,
    openAddTransaction,
    closeSubScreen,
    showSnackbar,
  } = useWallet();

  const isBn = settings.language === 'BANGLA';
  const netWorth = useMemo(() => calculateNetWorthSummary(accounts), [accounts]);

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );

  // Compute monthly In/Out per card for the current month
  const cardMonthFlows = useMemo(() => {
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const map = new Map<string, { inAmt: number; outAmt: number; txCount: number }>();
    for (const acc of visibleAccounts) {
      map.set(acc.id, { inAmt: 0, outAmt: 0, txCount: 0 });
    }
    for (const tx of transactions) {
      if (tx.timestamp < mStart) continue;
      if (map.has(tx.accountId)) {
        const entry = map.get(tx.accountId)!;
        entry.txCount += 1;
        if (tx.type === 'INCOME' || tx.type === 'BORROW') entry.inAmt += tx.amount;
        else entry.outAmt += tx.amount;
      }
      if (
        tx.toAccountId &&
        map.has(tx.toAccountId) &&
        (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT')
      ) {
        const dest = map.get(tx.toAccountId)!;
        dest.txCount += 1;
        dest.inAmt += tx.amount;
      }
    }
    return map;
  }, [transactions, visibleAccounts]);

  const [editingCard, setEditingCard] = useState<AccountEntity | null>(() =>
    initialAccountId ? accounts.find((a) => a.id === initialAccountId) ?? null : null
  );
  const [editName, setEditName] = useState(editingCard?.name ?? '');
  const [editInstitution, setEditInstitution] = useState(editingCard?.institution ?? '');
  const [editType, setEditType] = useState<AccountType>(editingCard?.type ?? 'BANK');
  const [editBalance, setEditBalance] = useState(
    editingCard
      ? String(
          editingCard.type === 'CREDIT_CARD'
            ? Math.abs(editingCard.balance)
            : editingCard.balance
        )
      : '0'
  );
  const [editLast4, setEditLast4] = useState(editingCard?.accountNumberLast4 ?? '');
  const [editNetwork, setEditNetwork] = useState(
    parseAccountNotesMetadata(editingCard?.notes ?? '').network || 'Visa'
  );
  const [editColor, setEditColor] = useState(editingCard?.colorHex ?? '#1E3A8A');
  const [editIncludeInTotal, setEditIncludeInTotal] = useState(
    editingCard?.includeInTotal ?? true
  );
  const [logAdjustmentTx, setLogAdjustmentTx] = useState(false);

  const openEditorForCard = (acc: AccountEntity) => {
    const meta = parseAccountNotesMetadata(acc.notes);
    setEditingCard(acc);
    setEditName(acc.name);
    setEditInstitution(acc.institution);
    setEditType(acc.type);
    setEditBalance(String(acc.type === 'CREDIT_CARD' ? Math.abs(acc.balance) : acc.balance));
    setEditLast4(acc.accountNumberLast4);
    setEditNetwork(meta.network || 'Visa');
    setEditColor(acc.colorHex || '#0284C7');
    setEditIncludeInTotal(acc.includeInTotal);
    setLogAdjustmentTx(false);
  };

  const handleSaveCardEdit = () => {
    if (!editingCard) return;
    const cleanName = editName.trim() || editingCard.name;
    const rawNum = parseFloat(editBalance);
    const parsedBal = Number.isFinite(rawNum) ? rawNum : 0;
    const finalBalance = editType === 'CREDIT_CARD' ? -Math.abs(parsedBal) : parsedBal;
    const oldMeta = parseAccountNotesMetadata(editingCard.notes);

    const updatedNotes = buildAccountNotesWithMetadata({
      network: editType === 'BANK' || editType === 'CREDIT_CARD' ? editNetwork : '',
      subtype: oldMeta.subtype,
      location: oldMeta.location,
      tier: oldMeta.tier,
      freeformNotes: oldMeta.freeformNotes,
    });

    const balanceChanged = Math.abs(finalBalance - editingCard.balance) > 0.009;

    updateAccount({
      ...editingCard,
      name: cleanName,
      institution: editInstitution.trim(),
      type: editType,
      balance: logAdjustmentTx && balanceChanged ? editingCard.balance : finalBalance,
      accountNumberLast4: editLast4.slice(0, 4),
      colorHex: editColor,
      notes: updatedNotes,
      includeInTotal: editIncludeInTotal,
    });

    if (logAdjustmentTx && balanceChanged) {
      adjustAccountBalance(editingCard.id, finalBalance, true);
    }

    showSnackbar(
      isBn
        ? `${cleanName}-এর কার্ড ও ব্যালেন্স আপডেট হয়েছে`
        : `${cleanName} card & balance updated`
    );
    setEditingCard(null);
  };

  const handleRestoreDefaults = () => {
    const added = restoreCoreCards();
    showSnackbar(
      added > 0
        ? isBn
          ? `${added}টি মূল কার্ড যুক্ত করা হয়েছে`
          : `Restored ${added} core cards`
        : isBn
        ? 'সবগুলো মূল কার্ড ইতোমধ্যে আছে'
        : 'All 4 core cards are already present'
    );
  };

  return (
    <div className="min-h-screen pb-16">
      <SubScreenHeader
        title={isBn ? 'কার্ড ও ব্যালেন্স সেটিংস' : 'Cards & Balance Manager'}
        subtitle={
          isBn
            ? 'কোন কার্ডে কত টাকা আছে দেখুন ও পরিবর্তন করুন'
            : 'Inspect and update balances across all your cards'
        }
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => openSubScreen('EDIT_ACCOUNT')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> {isBn ? 'নতুন কার্ড' : 'New Card'}
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-5">
        {/* Overall Balance Summary */}
        <TranslucentCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isBn ? 'সব কার্ড মিলিয়ে মোট ব্যালেন্স' : 'Total Balance Across Cards'}
              </p>
              <p className="text-2xl sm:text-3xl font-black font-mono-num text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {formatCurrency(netWorth.netWorth, settings.currencySymbol, settings.language)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <p className="text-slate-500">{t('assets', settings.language)}</p>
                <p className="font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(netWorth.assets, settings.currencySymbol, settings.language)}
                </p>
              </div>
              {netWorth.liabilities > 0 && (
                <div>
                  <p className="text-slate-500">{t('liabilities', settings.language)}</p>
                  <p className="font-bold font-mono-num text-rose-600 dark:text-rose-400">
                    {formatCurrency(netWorth.liabilities, settings.currencySymbol, settings.language)}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition whitespace-nowrap"
              >
                <RotateCcw size={13} />
                <span>{isBn ? '৪টি মূল কার্ড' : '4 Core Cards'}</span>
              </button>
            </div>
          </div>
        </TranslucentCard>

        {/* Cards Grid with Bank-Card Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleAccounts.map((acc) => {
            const flow = cardMonthFlows.get(acc.id) ?? { inAmt: 0, outAmt: 0, txCount: 0 };
            return (
              <TranslucentCard key={acc.id} className="p-3.5 space-y-3">
                <HishabPatiAccountCard
                  account={acc}
                  currencySymbol={settings.currencySymbol}
                  language={settings.language}
                  monthlyIn={flow.inAmt}
                  monthlyOut={flow.outAmt}
                  compact
                  onClick={() => openSubScreen('ACCOUNT_DETAIL', { accountId: acc.id })}
                  onQuickEdit={() => openEditorForCard(acc)}
                />

                {/* Card Controls Row */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditorForCard(acc)}
                    className="min-h-[40px] px-2 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-sky-700 transition"
                  >
                    <Edit3 size={12} />
                    <span className="truncate">{isBn ? 'ব্যালেন্স / এডিট' : 'Edit Card'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openAddTransaction({
                        initialType: 'INCOME',
                        preselectedAccountId: acc.id,
                      })
                    }
                    className="min-h-[40px] px-2 py-2 rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/20 transition"
                  >
                    <ArrowDownLeft size={12} />
                    <span className="truncate">{isBn ? 'ইন' : 'In'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openAddTransaction({
                        initialType: 'EXPENSE',
                        preselectedAccountId: acc.id,
                      })
                    }
                    className="min-h-[40px] px-2 py-2 rounded-xl bg-rose-500/12 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-rose-500/20 transition"
                  >
                    <ArrowUpRight size={12} />
                    <span className="truncate">{isBn ? 'আউট' : 'Out'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openAddTransaction({
                        initialType: 'TRANSFER',
                        preselectedAccountId: acc.id,
                      })
                    }
                    className="min-h-[40px] px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <ArrowLeftRight size={12} />
                    <span className="truncate">{isBn ? 'ট্রান্সফার' : 'Transfer'}</span>
                  </button>
                </div>
              </TranslucentCard>
            );
          })}
        </div>

        {/* Full Accounts Archive & Sort Link */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openSubScreen('ACCOUNTS')}
            className="px-4 py-2.5 rounded-xl glass-card text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"
          >
            <Wallet size={14} />
            <span>
              {isBn
                ? 'কার্ডের ক্রম সাজান বা আর্কাইভকৃত কার্ড দেখুন'
                : 'Reorder Cards or View Archived Wallets'}
            </span>
          </button>
        </div>
      </div>

      {/* Bank-Card Balance & Details Editor Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-sky-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isBn ? 'কার্ড ও ব্যালেন্স পরিবর্তন' : 'Edit Card & Balance'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Prominent Amount / Balance Field */}
              <div className="rounded-2xl bg-sky-500/8 border border-sky-500/20 p-4 space-y-1.5">
                <label className="text-xs font-bold text-sky-700 dark:text-sky-300 block">
                  {editType === 'CREDIT_CARD'
                    ? isBn
                      ? 'বর্তমান বকেয়া অ্যামাউন্ট'
                      : 'Current Outstanding Balance'
                    : isBn
                    ? 'কার্ডের বর্তমান ব্যালেন্স / অ্যামাউন্ট'
                    : 'Card Balance / Amount'}
                </label>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-400">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="w-full bg-transparent text-3xl font-black font-mono-num text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 pt-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logAdjustmentTx}
                    onChange={(e) => setLogAdjustmentTx(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>
                    {isBn
                      ? 'ব্যালেন্সের পার্থক্য অ্যাক্টিভিটি লিস্টে সমন্বয় হিসেবে সেভ করুন'
                      : 'Record balance difference in Activity history'}
                  </span>
                </label>
              </div>

              {/* Card Name & Institution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {isBn ? 'কার্ডের নাম' : 'Card Label'}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {isBn ? 'ব্যাংক / প্রোভাইডার' : 'Bank / Provider'}
                  </label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Card Type */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                  {isBn ? 'কার্ডের ধরণ' : 'Card Type'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['MFS', isBn ? 'মোবাইল ব্যাংকিং' : 'MFS'],
                      ['BANK', isBn ? 'ব্যাংক কার্ড' : 'Bank'],
                      ['CASH', isBn ? 'নগদ ক্যাশ' : 'Cash'],
                      ['CREDIT_CARD', isBn ? 'ক্রেডিট কার্ড' : 'Credit Card'],
                    ] as Array<[AccountType, string]>
                  ).map(([tId, label]) => (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => setEditType(tId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        editType === tId
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Last 4 Digits + Card Network (Bank Card Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {isBn ? 'কার্ড / অ্যাকাউন্ট শেষ ৪ ডিজিট' : 'Last 4 Digits'}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editLast4}
                    onChange={(e) => setEditLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4821"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-mono-num outline-none"
                  />
                </div>
                {(editType === 'BANK' || editType === 'CREDIT_CARD') && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      {isBn ? 'কার্ড নেটওয়ার্ক' : 'Card Network'}
                    </label>
                    <select
                      value={editNetwork}
                      onChange={(e) => setEditNetwork(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none"
                    >
                      {SUPPORTED_CARD_NETWORKS.map((net) => (
                        <option key={net} value={net}>
                          {net}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Card Color */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                  {isBn ? 'কার্ডের রঙ' : 'Card Color'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE_30.slice(0, 14).map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setEditColor(hex)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: hex,
                        borderColor: editColor === hex ? '#fff' : 'transparent',
                      }}
                    >
                      {editColor === hex && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include in total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {isBn ? 'মোট ব্যালেন্সে গণনা করুন' : 'Include in Total Balance'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditIncludeInTotal((v) => !v)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                    editIncludeInTotal ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      editIncludeInTotal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 flex gap-2">
              <button
                type="button"
                onClick={() => openSubScreen('EDIT_ACCOUNT', { accountId: editingCard.id })}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                {isBn ? 'বিস্তারিত সেটিংস' : 'Full Options'}
              </button>
              <button
                type="button"
                onClick={handleSaveCardEdit}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <Save size={14} /> {t('save', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
