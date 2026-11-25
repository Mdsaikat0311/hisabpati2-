import React, { useMemo, useState } from 'react';
import { Trash2, Search, Check, Plus } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import {
  buildAccountNotesWithMetadata,
  filterBanksAndInstitutions,
  filterMfsProviders,
  getCardNetworkLogoPath,
  getMfsLogoPath,
  parseAccountNotesMetadata,
  SUPPORTED_CARD_NETWORKS,
} from '../data/cardBrandAssets';
import { COLOR_PALETTE_30 } from '../data/categoryCatalog';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import type { AccountEntity, AccountType } from '../types/models';

export function EditAccountScreen({ accountId }: { accountId?: string }) {
  const {
    accounts,
    settings,
    extendedSettings,
    updateExtendedSettings,
    addAccount,
    updateAccount,
    deleteAccount,
    closeSubScreen,
    showSnackbar,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const existing = accountId ? accounts.find((a) => a.id === accountId) : undefined;
  const existingMeta = parseAccountNotesMetadata(existing?.notes ?? '');

  const [type, setType] = useState<AccountType>(existing?.type ?? 'BANK');
  const [name, setName] = useState(existing?.name ?? '');
  const [institution, setInstitution] = useState(existing?.institution ?? '');
  const [balanceStr, setBalanceStr] = useState(
    existing
      ? String(existing.type === 'CREDIT_CARD' ? Math.abs(existing.balance) : existing.balance)
      : '0'
  );
  const [last4, setLast4] = useState(existing?.accountNumberLast4 ?? '');
  const [colorHex, setColorHex] = useState(existing?.colorHex ?? '#0284C7');
  const [network, setNetwork] = useState(existingMeta.network || 'Visa');
  const [subtype, setSubtype] = useState(existingMeta.subtype || '');
  const [creditLimitStr, setCreditLimitStr] = useState(
    existing?.creditLimit ? String(existing.creditLimit) : ''
  );
  const [billingDate, setBillingDate] = useState(existing?.billingDate ?? '');
  const [paymentDueDate, setPaymentDueDate] = useState(existing?.paymentDueDate ?? '');
  const [minPaymentStr, setMinPaymentStr] = useState(
    existing?.minPayment ? String(existing.minPayment) : ''
  );
  const [freeformNotes, setFreeformNotes] = useState(existingMeta.freeformNotes);
  const [includeInTotal, setIncludeInTotal] = useState(existing?.includeInTotal ?? true);

  const [instQuery, setInstQuery] = useState('');
  const [showCustomInstInput, setShowCustomInstInput] = useState(false);
  const [customInstName, setCustomInstName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const bankSuggestions = useMemo(
    () => filterBanksAndInstitutions(instQuery, extendedSettings.customBanks),
    [extendedSettings.customBanks, instQuery]
  );

  const mfsSuggestions = useMemo(
    () => filterMfsProviders(instQuery, extendedSettings.customMfsProviders),
    [extendedSettings.customMfsProviders, instQuery]
  );

  const previewAccount: AccountEntity = {
    id: existing?.id ?? 'preview',
    name: name.trim() || (isBn ? 'অ্যাকাউন্ট প্রিভিউ' : 'Account Preview'),
    type,
    institution: institution.trim(),
    balance:
      type === 'CREDIT_CARD'
        ? -Math.abs(parseFloat(balanceStr) || 0)
        : parseFloat(balanceStr) || 0,
    openingBalance: existing?.openingBalance ?? (parseFloat(balanceStr) || 0),
    accountNumberLast4: last4.slice(0, 4),
    colorHex,
    iconName: type.toLowerCase(),
    isHidden: false,
    sortOrder: 0,
    creditLimit: parseFloat(creditLimitStr) || 0,
    billingDate,
    paymentDueDate,
    minPayment: parseFloat(minPaymentStr) || 0,
    notes: buildAccountNotesWithMetadata({ network, subtype, freeformNotes }),
    includeInTotal,
  };

  const handleSave = () => {
    const cleanName = name.trim() || institution.trim();
    if (!cleanName) {
      showSnackbar(isBn ? 'অ্যাকাউন্টের নাম লিখুন' : 'Please enter an account name');
      return;
    }
    const rawBal = parseFloat(balanceStr) || 0;
    const finalBalance = type === 'CREDIT_CARD' ? -Math.abs(rawBal) : rawBal;
    const notes = buildAccountNotesWithMetadata({
      network: type === 'BANK' || type === 'CREDIT_CARD' ? network : '',
      subtype,
      freeformNotes,
    });

    if (existing) {
      updateAccount({
        ...existing,
        name: cleanName,
        type,
        institution: institution.trim(),
        balance: finalBalance,
        accountNumberLast4: last4.slice(0, 4),
        colorHex,
        creditLimit: type === 'CREDIT_CARD' ? parseFloat(creditLimitStr) || 0 : 0,
        billingDate: type === 'CREDIT_CARD' ? billingDate : '',
        paymentDueDate: type === 'CREDIT_CARD' ? paymentDueDate : '',
        minPayment: type === 'CREDIT_CARD' ? parseFloat(minPaymentStr) || 0 : 0,
        notes,
        includeInTotal,
      });
      showSnackbar(isBn ? 'অ্যাকাউন্ট আপডেট হয়েছে' : 'Account updated');
    } else {
      addAccount({
        name: cleanName,
        type,
        institution: institution.trim(),
        balance: finalBalance,
        openingBalance: finalBalance,
        accountNumberLast4: last4.slice(0, 4),
        colorHex,
        iconName: type.toLowerCase(),
        isHidden: false,
        creditLimit: type === 'CREDIT_CARD' ? parseFloat(creditLimitStr) || 0 : 0,
        billingDate: type === 'CREDIT_CARD' ? billingDate : '',
        paymentDueDate: type === 'CREDIT_CARD' ? paymentDueDate : '',
        minPayment: type === 'CREDIT_CARD' ? parseFloat(minPaymentStr) || 0 : 0,
        notes,
        includeInTotal,
      });
      showSnackbar(isBn ? 'নতুন অ্যাকাউন্ট তৈরি হয়েছে' : 'Account created');
    }
    closeSubScreen();
  };

  const types: Array<{ id: AccountType; label: string }> = [
    { id: 'BANK', label: t('bank', settings.language) },
    { id: 'MFS', label: t('mobile_banking', settings.language) },
    { id: 'CASH', label: t('cash', settings.language) },
    { id: 'CREDIT_CARD', label: t('credit_card', settings.language) },
    { id: 'OTHER', label: t('other', settings.language) },
  ];

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={existing ? t('edit_account', settings.language) : t('add_account', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          existing && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center"
              aria-label={t('delete', settings.language)}
            >
              <Trash2 size={16} />
            </button>
          )
        }
      />

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        <HishabPatiAccountCard
          account={previewAccount}
          currencySymbol={settings.currencySymbol}
          language={settings.language}
          compact
        />

        {/* Account Type Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {types.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setType(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                type === item.id
                  ? 'bg-sky-600 text-white'
                  : 'glass-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <TranslucentCard className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {t('account_name', settings.language)} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isBn ? 'যেমন: সিটি ব্যাংক প্রাইমারি' : 'e.g. City Bank Savings'}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                {type === 'CREDIT_CARD'
                  ? isBn
                    ? 'বর্তমান বকেয়া'
                    : 'Current Outstanding Due'
                  : existing
                  ? t('balance', settings.language)
                  : t('initial_balance', settings.language)}
              </label>
              <input
                type="number"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold font-mono-num outline-none"
              />
            </div>
          </div>

          {/* Institution Selector for BANK / CREDIT_CARD / MFS */}
          {(type === 'BANK' || type === 'CREDIT_CARD') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">
                  {isBn ? 'ব্যাংক / প্রতিষ্ঠান' : 'Bank / Institution'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomInstInput((v) => !v)}
                  className="text-xs font-bold text-sky-600 flex items-center gap-1"
                >
                  <Plus size={12} /> {isBn ? 'কাস্টম যোগ করুন' : 'Add Custom'}
                </button>
              </div>
              {showCustomInstInput && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInstName}
                    onChange={(e) => setCustomInstName(e.target.value)}
                    placeholder={isBn ? 'ব্যাংকের নাম লিখুন' : 'Enter bank name'}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = customInstName.trim();
                      if (!clean) return;
                      updateExtendedSettings({
                        customBanks: [...extendedSettings.customBanks, clean],
                      });
                      setInstitution(clean);
                      setCustomInstName('');
                      setShowCustomInstInput(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
                  >
                    {t('add', settings.language)}
                  </button>
                </div>
              )}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={instQuery || institution}
                  onChange={(e) => {
                    setInstQuery(e.target.value);
                    setInstitution(e.target.value);
                  }}
                  placeholder={isBn ? 'ব্যাংক খুঁজুন (৬০+ বাংলাদেশি ব্যাংক)...' : 'Search 60+ BD banks...'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                {bankSuggestions.slice(0, 12).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setInstitution(b);
                      setInstQuery('');
                      if (!name.trim()) setName(b.replace(' PLC', ''));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      institution === b
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white/70 dark:bg-slate-800 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'MFS' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 block">
                {isBn ? 'মোবাইল ব্যাংকিং প্রোভাইডার' : 'MFS Provider'}
              </label>
              <div className="flex flex-wrap gap-2">
                {mfsSuggestions.map((mfs) => {
                  const logo = getMfsLogoPath(mfs.name);
                  const selected = institution.toLowerCase() === mfs.name.toLowerCase();
                  return (
                    <button
                      key={mfs.name}
                      type="button"
                      onClick={() => {
                        setInstitution(mfs.name);
                        setColorHex(mfs.brandColorHex);
                        if (!name.trim()) setName(mfs.name);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        selected
                          ? 'border-sky-500 bg-sky-500/15'
                          : 'border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-800'
                      }`}
                    >
                      {logo && <img src={logo} alt="" className="w-4 h-4 object-contain rounded-sm" />}
                      <span>{mfs.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card Network & Last 4 */}
          {(type === 'BANK' || type === 'CREDIT_CARD') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  {isBn ? 'কার্ড নেটওয়ার্ক' : 'Card Network'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_CARD_NETWORKS.map((net) => {
                    const logo = getCardNetworkLogoPath(net);
                    return (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setNetwork(net)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                          network === net
                            ? 'border-sky-500 bg-sky-500/15'
                            : 'border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {logo && <img src={logo} alt="" className="h-3.5 w-auto object-contain" />}
                        <span>{net === 'American Express' ? 'Amex' : net}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {isBn ? 'শেষ ৪ ডিজিট' : 'Last 4 Digits'}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={last4}
                    onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4242"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    {isBn ? 'ধরণ (ঐচ্ছিক)' : 'Subtype'}
                  </label>
                  <input
                    type="text"
                    value={subtype}
                    onChange={(e) => setSubtype(e.target.value)}
                    placeholder="Savings / Debit"
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Credit Card Specifics */}
          {type === 'CREDIT_CARD' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'ক্রেডিট লিমিট' : 'Credit Limit'}
                </label>
                <input
                  type="number"
                  value={creditLimitStr}
                  onChange={(e) => setCreditLimitStr(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono-num"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'বিলিং তারিখ' : 'Billing Date'}
                </label>
                <input
                  type="text"
                  value={billingDate}
                  onChange={(e) => setBillingDate(e.target.value)}
                  placeholder="15th"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'পরিশোধের শেষ দিন' : 'Due Date'}
                </label>
                <input
                  type="text"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  placeholder="2026-12-05"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  {isBn ? 'ন্যূনতম পরিশোধ' : 'Min Payment'}
                </label>
                <input
                  type="number"
                  value={minPaymentStr}
                  onChange={(e) => setMinPaymentStr(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono-num"
                />
              </div>
            </div>
          )}

          {/* Color Swatches */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-2">
              {isBn ? 'কার্ডের রঙ' : 'Card Accent Color'}
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE_30.slice(0, 18).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColorHex(hex)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: hex,
                    borderColor: colorHex === hex ? '#fff' : 'transparent',
                  }}
                >
                  {colorHex === hex && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>

          {/* Include in Net Worth */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {isBn ? 'মোট ব্যালেন্সে গণনা করুন' : 'Include in Net Worth'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isBn
                  ? 'হোম স্ক্রিনের মোট ব্যালেন্সে এই ওয়ালেট যুক্ত থাকবে'
                  : 'Include this account in Total Net Worth calculations'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIncludeInTotal((v) => !v)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                includeInTotal ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  includeInTotal ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {t('notes', settings.language)}
            </label>
            <textarea
              rows={2}
              value={freeformNotes}
              onChange={(e) => setFreeformNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
            />
          </div>
        </TranslucentCard>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-extrabold shadow-lg"
        >
          {t('save', settings.language)}
        </button>
      </div>

      {confirmDelete && existing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isBn ? 'অ্যাকাউন্ট মুছে ফেলবেন?' : 'Delete Account?'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'এই অ্যাকাউন্ট ও এর সাথে যুক্ত লেনদেন মুছে যাবে।'
                : 'This will remove the account and its associated transactions.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                {t('cancel', settings.language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAccount(existing.id);
                  setConfirmDelete(false);
                  closeSubScreen();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                {t('delete', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
