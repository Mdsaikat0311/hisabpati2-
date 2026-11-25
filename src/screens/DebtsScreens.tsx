import React, { useMemo, useState } from 'react';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { getDebtRemaining } from '../utils/analytics';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import type { DebtType } from '../types/models';

export function ManageDebtsScreen() {
  const { debts, settings, closeSubScreen, openSubScreen } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [tab, setTab] = useState<'ALL' | DebtType>('ALL');
  const [includeSettled, setIncludeSettled] = useState(false);

  const summary = useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    for (const d of debts) {
      if (d.isSettled) continue;
      const rem = getDebtRemaining(d);
      if (d.type === 'LENT') lent += rem;
      else borrowed += rem;
    }
    return { lent, borrowed, net: lent - borrowed };
  }, [debts]);

  const filtered = useMemo(
    () =>
      debts.filter((d) => {
        if (!includeSettled && d.isSettled) return false;
        if (tab !== 'ALL' && d.type !== tab) return false;
        return true;
      }),
    [debts, includeSettled, tab]
  );

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('manage_debts', settings.language)}
        subtitle={t('borrowed_and_lent_tracking', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => openSubScreen('ADD_DEBT')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus size={14} /> {t('add', settings.language)}
          </button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('net_debt_position', settings.language)}
          </p>
          <p
            className={`text-2xl font-black font-mono-num ${
              summary.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(summary.net, settings.currencySymbol, settings.language, true)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                {t('lent_to_receive', settings.language)}
              </span>
              <span className="text-sm font-extrabold font-mono-num text-emerald-600">
                {formatCurrency(summary.lent, settings.currencySymbol, settings.language)}
              </span>
            </div>
            <div className="rounded-2xl bg-rose-500/10 p-3">
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold block">
                {t('borrowed_to_pay', settings.language)}
              </span>
              <span className="text-sm font-extrabold font-mono-num text-rose-600">
                {formatCurrency(summary.borrowed, settings.currencySymbol, settings.language)}
              </span>
            </div>
          </div>
        </TranslucentCard>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(
              [
                ['ALL', t('all', settings.language)],
                ['LENT', t('receivable', settings.language)],
                ['BORROWED', t('payable', settings.language)],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  tab === id
                    ? 'bg-sky-600 text-white'
                    : 'glass-card text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSettled}
              onChange={(e) => setIncludeSettled(e.target.checked)}
              className="accent-sky-600"
            />
            <span>{t('incl_settled', settings.language)}</span>
          </label>
        </div>

        {filtered.length === 0 ? (
          <TranslucentCard className="p-8 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {t('no_debts', settings.language)}
            </p>
            <button
              type="button"
              onClick={() => openSubScreen('ADD_DEBT')}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              {t('add_debt', settings.language)}
            </button>
          </TranslucentCard>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => {
              const rem = getDebtRemaining(d);
              const pct =
                d.totalAmount > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100)) : 0;
              return (
                <TranslucentCard
                  key={d.id}
                  onClick={() => openSubScreen('DEBT_DETAILS', { debtId: d.id })}
                  className="p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            d.type === 'LENT'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-rose-500/15 text-rose-600'
                          }`}
                        >
                          {d.type === 'LENT'
                            ? t('receivable', settings.language)
                            : t('payable', settings.language)}
                        </span>
                        {d.isSettled && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-500/15 text-slate-500 text-[10px] font-bold">
                            {t('settled', settings.language)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {d.personName}
                      </h3>
                      {d.reason && <p className="text-xs text-slate-500">{d.reason}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{t('remaining', settings.language)}</p>
                      <p className="text-base font-extrabold font-mono-num text-slate-900 dark:text-white">
                        {formatCurrency(rem, settings.currencySymbol, settings.language)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: d.type === 'LENT' ? '#10B981' : '#EF4444',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      {pct}% {isBn ? 'পরিশোধিত' : 'paid'}
                    </span>
                    <span>{d.dueDate || t('no_due_date', settings.language)}</span>
                  </div>
                </TranslucentCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function DebtDetailsScreen({ debtId }: { debtId: string }) {
  const {
    debts,
    transactions,
    settings,
    closeSubScreen,
    openSubScreen,
    markDebtSettled,
    deleteDebt,
  } = useWallet();
  const debt = debts.find((d) => d.id === debtId);
  const linkedTxs = useMemo(
    () =>
      transactions
        .filter((tx) => tx.debtId === debtId)
        .sort((a, b) => b.timestamp - a.timestamp),
    [debtId, transactions]
  );

  if (!debt) {
    return (
      <div>
        <SubScreenHeader title={t('debt_details', settings.language)} onBack={closeSubScreen} />
      </div>
    );
  }

  const rem = getDebtRemaining(debt);
  const pct =
    debt.totalAmount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100)) : 0;

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={debt.personName}
        subtitle={
          debt.type === 'LENT'
            ? t('lent_to_receive', settings.language)
            : t('borrowed_to_pay', settings.language)
        }
        onBack={closeSubScreen}
        rightAction={
          <button
            type="button"
            onClick={() => {
              deleteDebt(debt.id);
              closeSubScreen();
            }}
            className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        }
      />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <TranslucentCard className="p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500">{t('remaining', settings.language)}</p>
              <p className="text-3xl font-black font-mono-num text-slate-900 dark:text-white">
                {formatCurrency(rem, settings.currencySymbol, settings.language)}
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-sky-500/15 text-sky-600 text-xs font-bold">
              {pct}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-600"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-slate-500 block">{t('total_debt', settings.language)}</span>
              <strong className="font-mono-num">
                {formatCurrency(debt.totalAmount, settings.currencySymbol, settings.language)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">{t('amount_paid', settings.language)}</span>
              <strong className="font-mono-num">
                {formatCurrency(debt.paidAmount, settings.currencySymbol, settings.language)}
              </strong>
            </div>
          </div>
          {debt.notes && (
            <p className="text-xs text-slate-500 border-t border-slate-200/60 dark:border-white/10 pt-2">
              {debt.notes}
            </p>
          )}
        </TranslucentCard>

        {!debt.isSettled && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openSubScreen('ADD_DEBT_TRANSACTION', { debtId: debt.id })}
              className="flex-1 py-3 rounded-2xl bg-sky-600 text-white text-xs font-extrabold"
            >
              {t('pay_collect', settings.language)}
            </button>
            <button
              type="button"
              onClick={() => markDebtSettled(debt.id)}
              className="px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1"
            >
              <CheckCircle2 size={15} /> {t('mark_settled', settings.language)}
            </button>
          </div>
        )}

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          <div className="px-4 py-3 text-xs font-bold uppercase text-slate-500">
            {t('transactions_label', settings.language)}
          </div>
          {linkedTxs.length === 0 ? (
            <div className="p-5 text-xs text-slate-500 text-center">
              {t('no_transactions_yet', settings.language)}
            </div>
          ) : (
            linkedTxs.map((tx) => (
              <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{tx.title}</p>
                  <p className="text-slate-500">{formatDateTime(tx.timestamp, settings.language)}</p>
                </div>
                <span className="font-mono-num font-extrabold">
                  {formatCurrency(tx.amount, settings.currencySymbol, settings.language)}
                </span>
              </div>
            ))
          )}
        </TranslucentCard>
      </div>
    </div>
  );
}

export function AddDebtScreen() {
  const { accounts, settings, addDebt, closeSubScreen, showSnackbar } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [type, setType] = useState<DebtType>('LENT');
  const [personName, setPersonName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState<string>(accounts.find((a) => !a.isHidden)?.id ?? '');
  const [logWalletTx, setLogWalletTx] = useState(true);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const amt = parseFloat(amountStr);
    if (!personName.trim() || !amt || amt <= 0) {
      showSnackbar(isBn ? 'নাম ও সঠিক পরিমাণ দিন' : 'Enter person name and valid amount');
      return;
    }
    addDebt(
      {
        personName: personName.trim(),
        amount: amt,
        totalAmount: amt,
        paidAmount: 0,
        type,
        dueDate,
        notes: notes.trim(),
        isSettled: false,
        accountId: accountId || null,
        reason: reason.trim(),
        colorHex: type === 'LENT' ? '#10B981' : '#EF4444',
        tentativeCloseDateStr: dueDate,
        tags: '',
      },
      logWalletTx
    );
    showSnackbar(isBn ? 'ঋণ রেকর্ড যুক্ত হয়েছে' : 'Debt record added');
    closeSubScreen();
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('add_debt', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <TranslucentCard className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['LENT', t('lent_to_receive', settings.language)],
                ['BORROWED', t('borrowed_to_pay', settings.language)],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                className={`py-2.5 rounded-xl text-xs font-bold border ${
                  type === id
                    ? 'border-sky-500 bg-sky-500/15 text-sky-600'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder={isBn ? 'ব্যক্তির নাম' : 'Person / Counterparty Name'}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none"
          />

          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder={`${t('amount', settings.language)} (${settings.currencySymbol})`}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-lg font-bold font-mono-num outline-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isBn ? 'কারণ (ঐচ্ছিক)' : 'Reason (Optional)'}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {t('wallet_account', settings.language)}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">{isBn ? 'কোনো ওয়ালেট নয়' : 'No wallet linked'}</option>
              {accounts
                .filter((a) => !a.isHidden)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={logWalletTx}
              onChange={(e) => setLogWalletTx(e.target.checked)}
              className="accent-sky-600"
            />
            <span>
              {isBn ? 'ওয়ালেট ব্যালেন্সে প্রভাব ফেলুন' : 'Update wallet balance & log transaction'}
            </span>
          </label>

          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notes', settings.language)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
          />
        </TranslucentCard>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-sky-600 text-white text-sm font-extrabold"
        >
          {t('save', settings.language)}
        </button>
      </div>
    </div>
  );
}

export function AddDebtTransactionScreen({ debtId }: { debtId: string }) {
  const { debts, accounts, settings, recordDebtTransaction, closeSubScreen, showSnackbar } =
    useWallet();
  const isBn = settings.language === 'BANGLA';
  const debt = debts.find((d) => d.id === debtId);

  const [action, setAction] = useState<'PAYMENT' | 'BORROW_MORE' | 'LEND_MORE' | 'INTEREST'>(
    'PAYMENT'
  );
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState<string>(
    debt?.accountId || accounts.find((a) => !a.isHidden)?.id || ''
  );
  const [notes, setNotes] = useState('');

  if (!debt) {
    return (
      <div>
        <SubScreenHeader title={t('record_payment', settings.language)} onBack={closeSubScreen} />
      </div>
    );
  }

  const handleSave = () => {
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0) {
      showSnackbar(isBn ? 'সঠিক পরিমাণ দিন' : 'Enter a valid amount');
      return;
    }
    recordDebtTransaction({
      debtId: debt.id,
      action,
      amount: amt,
      accountId: action === 'INTEREST' ? null : accountId || null,
      notes,
    });
    showSnackbar(isBn ? 'লেনদেন সংরক্ষিত হয়েছে' : 'Debt transaction recorded');
    closeSubScreen();
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('pay_collect', settings.language)}
        subtitle={debt.personName}
        onBack={closeSubScreen}
      />
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <TranslucentCard className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['PAYMENT', t('record_payment', settings.language)],
                debt.type === 'BORROWED'
                  ? ['BORROW_MORE', t('borrow_more', settings.language)]
                  : ['LEND_MORE', t('lend_more', settings.language)],
                ['INTEREST', t('add_interest', settings.language)],
              ] as Array<['PAYMENT' | 'BORROW_MORE' | 'LEND_MORE' | 'INTEREST', string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAction(id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                  action === id
                    ? 'border-sky-500 bg-sky-500/15 text-sky-600'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="number"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder={`${t('amount', settings.language)} (${settings.currencySymbol})`}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-3 text-xl font-black font-mono-num outline-none"
          />

          {action !== 'INTEREST' && (
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">{isBn ? 'ওয়ালেট ছাড়া রেকর্ড' : 'Do not modify wallet balance'}</option>
              {accounts
                .filter((a) => !a.isHidden)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          )}

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notes', settings.language)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs outline-none"
          />
        </TranslucentCard>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-sky-600 text-white text-sm font-extrabold"
        >
          {t('save', settings.language)}
        </button>
      </div>
    </div>
  );
}
