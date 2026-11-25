import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { formatCurrency, formatDayHeader, formatTime, localizeDigits } from '../utils/formatters';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import { TranslucentCard } from '../components/GlassPrimitives';

type EntryMode = 'OUT' | 'IN' | 'SET_BALANCE';

export function HomeScreen() {
  const {
    settings,
    accounts,
    transactions,
    spendingWays,
    addTransaction,
    deleteTransaction,
    navigateToTab,
    showSnackbar,
  } = useWallet();

  const isBn = settings.language === 'BANGLA';

  const visibleAccounts = useMemo(
    () => accounts.filter((a) => !a.isHidden).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const wheelLockRef = useRef(false);
  const dragOffsetRef = useRef(0);

  const safeIndex = visibleAccounts.length > 0 ? Math.min(activeIndex, visibleAccounts.length - 1) : 0;
  const activeCard = visibleAccounts[safeIndex] ?? null;

  const totalBalance = useMemo(
    () =>
      visibleAccounts
        .filter((a) => a.includeInTotal)
        .reduce((sum, a) => sum + a.balance, 0),
    [visibleAccounts]
  );

  // Entry form state
  const [entryMode, setEntryMode] = useState<EntryMode>('OUT');
  const [amountInput, setAmountInput] = useState('');
  const [selectedWay, setSelectedWay] = useState<string>(() => spendingWays[0]?.name || (isBn ? 'পার্সোনাল' : 'Personal'));
  const [noteInput, setNoteInput] = useState('');
  const [feedScope, setFeedScope] = useState<'ALL' | 'CARD'>('ALL');

  // Keep selectedWay valid if user updates ways in Settings
  useEffect(() => {
    if (spendingWays.length > 0 && !spendingWays.some((w) => w.name === selectedWay)) {
      setSelectedWay(spendingWays[0].name);
    }
  }, [selectedWay, spendingWays]);

  const selectCard = (idx: number) => {
    if (visibleAccounts.length === 0) return;
    const clamped = Math.max(0, Math.min(visibleAccounts.length - 1, idx));
    setActiveIndex(clamped);
    setDragOffsetX(0);
    dragOffsetRef.current = 0;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (!hasDraggedRef.current && Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) || hasDraggedRef.current) {
        hasDraggedRef.current = true;
        const atStartEdge = safeIndex === 0 && dx > 0;
        const atEndEdge = safeIndex >= visibleAccounts.length - 1 && dx < 0;
        const resisted = atStartEdge || atEndEdge ? dx * 0.3 : dx;
        const clamped = Math.max(-150, Math.min(150, resisted));
        dragOffsetRef.current = clamped;
        setDragOffsetX(clamped);
      }
    };

    const handlePointerUp = () => {
      const dx = dragOffsetRef.current;
      if (dx < -40 && safeIndex < visibleAccounts.length - 1) {
        setActiveIndex((prev) => Math.min(visibleAccounts.length - 1, prev + 1));
      } else if (dx > 40 && safeIndex > 0) {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
      dragStartRef.current = null;
      dragOffsetRef.current = 0;
      setDragOffsetX(0);
      setIsDragging(false);
      window.setTimeout(() => {
        hasDraggedRef.current = false;
      }, 40);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, safeIndex, visibleAccounts.length]);

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (visibleAccounts.length <= 1) return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    dragOffsetRef.current = 0;
    setIsDragging(true);
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (visibleAccounts.length <= 1 || wheelLockRef.current) return;
    if (Math.abs(e.deltaX) > 22 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      wheelLockRef.current = true;
      if (e.deltaX > 0 && safeIndex < visibleAccounts.length - 1) {
        selectCard(safeIndex + 1);
      } else if (e.deltaX < 0 && safeIndex > 0) {
        selectCard(safeIndex - 1);
      }
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 320);
    }
  };

  const parsedNum = parseFloat(amountInput);
  const validNum = Number.isFinite(parsedNum) ? parsedNum : NaN;

  const previewInfo = useMemo(() => {
    if (!activeCard || !Number.isFinite(validNum)) return null;
    if (entryMode === 'OUT') {
      if (validNum <= 0) return null;
      return {
        nextBalance: Math.round((activeCard.balance - validNum) * 100) / 100,
        delta: -validNum,
        effectiveType: 'EXPENSE' as const,
      };
    }
    if (entryMode === 'IN') {
      if (validNum <= 0) return null;
      return {
        nextBalance: Math.round((activeCard.balance + validNum) * 100) / 100,
        delta: validNum,
        effectiveType: 'INCOME' as const,
      };
    }
    const diff = Math.round((validNum - activeCard.balance) * 100) / 100;
    if (Math.abs(diff) < 0.01) return null;
    return {
      nextBalance: validNum,
      delta: diff,
      effectiveType: diff >= 0 ? ('INCOME' as const) : ('EXPENSE' as const),
    };
  }, [activeCard, entryMode, validNum]);

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCard) {
      showSnackbar(isBn ? 'প্রথমে সেটিং থেকে একটি কার্ড যোগ করুন' : 'Please add a card in Settings first');
      return;
    }

    if (entryMode === 'SET_BALANCE') {
      if (!Number.isFinite(validNum)) {
        showSnackbar(isBn ? 'সঠিক নতুন ব্যালেন্স লিখুন' : 'Enter a valid new balance');
        return;
      }
      const diff = Math.round((validNum - activeCard.balance) * 100) / 100;
      if (Math.abs(diff) < 0.01) {
        showSnackbar(isBn ? 'ব্যালেন্স আগের মতোই আছে' : 'Balance is unchanged');
        return;
      }
      const txType = diff >= 0 ? 'INCOME' : 'EXPENSE';
      const wayName = selectedWay.trim() || (isBn ? 'অন্যান্য' : 'Other');
      addTransaction({
        type: txType,
        amount: Math.abs(diff),
        title: (noteInput.trim() || wayName).slice(0, 200),
        category: txType === 'INCOME' ? 'Other Income' : 'Other Expenses',
        subcategory: wayName.slice(0, 100),
        accountId: activeCard.id,
        toAccountId: null,
        timestamp: Date.now(),
        notes: noteInput.trim().slice(0, 1000),
        isRecurring: false,
        payeeOrPayer: '',
        debtId: null,
      });
      setAmountInput('');
      setNoteInput('');
      showSnackbar(
        isBn
          ? `${activeCard.name}-এর ব্যালেন্স আপডেট হয়েছে`
          : `${activeCard.name} balance updated`
      );
      return;
    }

    if (!Number.isFinite(validNum) || validNum <= 0) {
      showSnackbar(isBn ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Enter a valid amount');
      return;
    }

    const txType = entryMode === 'IN' ? 'INCOME' : 'EXPENSE';
    const wayName = selectedWay.trim() || (isBn ? 'অন্যান্য' : 'Other');

    addTransaction({
      type: txType,
      amount: Math.round(validNum * 100) / 100,
      title: (noteInput.trim() || wayName).slice(0, 200),
      category: txType === 'INCOME' ? 'Other Income' : 'Other Expenses',
      subcategory: wayName.slice(0, 100),
      accountId: activeCard.id,
      toAccountId: null,
      timestamp: Date.now(),
      notes: noteInput.trim().slice(0, 1000),
      isRecurring: false,
      payeeOrPayer: '',
      debtId: null,
    });

    setAmountInput('');
    setNoteInput('');
    showSnackbar(
      isBn
        ? `${activeCard.name} (${wayName}) হিসাব যুক্ত হয়েছে`
        : `Saved to ${activeCard.name} (${wayName})`
    );
  };

  const recentFeed = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);
    if (feedScope === 'CARD' && activeCard) {
      return sorted
        .filter((tx) => tx.accountId === activeCard.id || tx.toAccountId === activeCard.id)
        .slice(0, 40);
    }
    return sorted.slice(0, 40);
  }, [activeCard, feedScope, transactions]);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-5 pb-28 space-y-5">
      {/* Minimal Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/ic_app_logo.png"
            alt="Hishab Pati"
            className="w-9 h-9 rounded-xl object-contain shrink-0"
          />
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
            {isBn ? 'হিসাব পাতি' : 'Hishab Pati'}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {isBn ? 'মোট ব্যালেন্স' : 'Total Balance'}
          </p>
          <p className="text-base font-extrabold font-mono-num text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(totalBalance, settings.currencySymbol, settings.language)}
          </p>
        </div>
      </header>

      {/* Scrollable Card Carousel (Balance Only on Cards) */}
      {visibleAccounts.length === 0 ? (
        <TranslucentCard className="p-6 text-center space-y-3">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isBn ? 'কোনো কার্ড বা অ্যাকাউন্ট নেই' : 'No cards added yet'}
          </p>
          <button
            type="button"
            onClick={() => navigateToTab('SETTINGS')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>{isBn ? 'সেটিং থেকে কার্ড যোগ করুন' : 'Add Cards in Settings'}</span>
          </button>
        </TranslucentCard>
      ) : (
        <section className="space-y-3">
          {/* NexusPay-Inspired 3D Angled Physical Card Deck */}
          <div className="relative">
            <div
              onPointerDown={handleStagePointerDown}
              onWheel={handleStageWheel}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') selectCard(safeIndex - 1);
                if (e.key === 'ArrowRight') selectCard(safeIndex + 1);
              }}
              tabIndex={0}
              aria-label={isBn ? 'কার্ড পরিবর্তনের ডেক' : 'Card switcher deck'}
              style={{ perspective: '1150px' }}
              className="relative h-[206px] sm:h-[242px] flex items-center justify-center overflow-hidden touch-pan-y select-none outline-none cursor-grab active:cursor-grabbing"
            >
              {/* Left Flanking Switch Button */}
              {visibleAccounts.length > 1 && (
                <button
                  type="button"
                  onClick={() => selectCard(safeIndex - 1)}
                  disabled={safeIndex === 0}
                  aria-label={isBn ? 'আগের কার্ড' : 'Previous card'}
                  className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full glass-card border border-slate-300/60 dark:border-white/15 shadow-md flex items-center justify-center text-slate-700 dark:text-white disabled:opacity-0 disabled:pointer-events-none transition hover:scale-105 active:scale-95"
                >
                  <ChevronLeft size={18} />
                </button>
              )}

              {/* Card Deck */}
              <div className="relative w-full h-full flex items-center justify-center">
                {visibleAccounts.map((acc, idx) => {
                  const offset = idx - safeIndex;
                  const abs = Math.abs(offset);
                  const dir = Math.sign(offset);
                  const isActive = offset === 0;

                  // Distinct subtle resting angle & tilt for every individual card
                  const restingZAngles = [-1.8, 1.5, -1.2, 2.0, -1.5, 1.1];
                  const restingYAngles = [1.8, -1.6, 1.2, -2.0, 1.4, -1.1];
                  const microZ = restingZAngles[idx % restingZAngles.length];
                  const microY = restingYAngles[idx % restingYAngles.length];

                  const dragProgress = dragOffsetX / 150;
                  const shiftX = isActive
                    ? dragOffsetX * 0.85
                    : offset * 110 + dragOffsetX * 0.34;
                  const shiftY = isActive
                    ? Math.abs(dragProgress) * 4
                    : abs * 9;
                  const scale = isActive
                    ? 1 - Math.abs(dragProgress) * 0.04
                    : Math.max(0.76, 1 - abs * 0.13);
                  const rotZ = isActive
                    ? microZ + dragOffsetX * 0.032
                    : dir * (4.8 + abs * 1.8) + microZ * 0.65 + dragOffsetX * 0.018;
                  const rotY = isActive
                    ? microY - dragOffsetX * 0.045
                    : -dir * 16 + microY * 0.5;
                  const opacity = isActive ? 1 : abs === 1 ? 0.88 : abs === 2 ? 0.42 : 0;

                  return (
                    <div
                      key={acc.id}
                      onClick={() => {
                        if (!hasDraggedRef.current && !isActive) {
                          selectCard(idx);
                        }
                      }}
                      style={{
                        transform: `translate3d(${shiftX}px, ${shiftY}px, 0) scale(${scale}) rotateZ(${rotZ}deg) rotateY(${rotY}deg)`,
                        zIndex: 30 - abs,
                        opacity,
                        pointerEvents: abs <= 1 ? 'auto' : 'none',
                        transition: isDragging
                          ? 'none'
                          : 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease',
                        transformStyle: 'preserve-3d',
                      }}
                      className={`absolute w-[258px] sm:w-[310px] ${
                        isActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                      }`}
                    >
                      <HishabPatiAccountCard
                        account={acc}
                        currencySymbol={settings.currencySymbol}
                        language={settings.language}
                        minimalBalanceOnly
                      />
                    </div>
                  );
                })}
              </div>

              {/* Right Flanking Switch Button */}
              {visibleAccounts.length > 1 && (
                <button
                  type="button"
                  onClick={() => selectCard(safeIndex + 1)}
                  disabled={safeIndex >= visibleAccounts.length - 1}
                  aria-label={isBn ? 'পরের কার্ড' : 'Next card'}
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full glass-card border border-slate-300/60 dark:border-white/15 shadow-md flex items-center justify-center text-slate-700 dark:text-white disabled:opacity-0 disabled:pointer-events-none transition hover:scale-105 active:scale-95"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Sleek Card Deck Dots + Direct Card Switcher + Quick Add */}
          <div className="space-y-2">
            {visibleAccounts.length > 1 && (
              <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
                {visibleAccounts.map((acc, idx) => {
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => selectCard(idx)}
                      aria-label={acc.name}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        active
                          ? 'w-6 bg-slate-900 dark:bg-white'
                          : 'w-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {visibleAccounts.map((acc, idx) => {
                  const active = idx === safeIndex;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => selectCard(idx)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                        active
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                          : 'glass-card text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: acc.colorHex || '#0284C7' }}
                      />
                      <span>{acc.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => navigateToTab('SETTINGS')}
                aria-label={isBn ? 'নতুন কার্ড যোগ করুন' : 'Add new card'}
                title={isBn ? 'নতুন কার্ড' : 'Add card'}
                className="min-h-[40px] px-3 py-1.5 rounded-xl glass-card text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 shrink-0 whitespace-nowrap hover:bg-sky-500/10 transition"
              >
                <Plus size={14} />
                <span>{isBn ? 'কার্ড' : 'Card'}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Direct Money In / Out & Balance Update Section */}
      {activeCard && (
        <TranslucentCard className="p-4 sm:p-5">
          <form onSubmit={handleSubmitEntry} className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {activeCard.name} — {isBn ? 'হিসাব আপডেট করুন' : 'Update Flow & Balance'}
              </h2>
              <span className="text-xs font-mono-num font-bold text-slate-500 dark:text-slate-400 shrink-0">
                {formatCurrency(activeCard.balance, settings.currencySymbol, settings.language)}
              </span>
            </div>

            {/* 3-way Mode Segmented Switch */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setEntryMode('OUT')}
                className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition whitespace-nowrap ${
                  entryMode === 'OUT'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <ArrowUpRight size={14} />
                <span>{isBn ? 'বের হয়েছে' : 'Money Out'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('IN')}
                className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition whitespace-nowrap ${
                  entryMode === 'IN'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <ArrowDownLeft size={14} />
                <span>{isBn ? 'ঢুকেছে (ইন)' : 'Money In'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('SET_BALANCE')}
                className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition whitespace-nowrap ${
                  entryMode === 'SET_BALANCE'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <RefreshCw size={13} />
                <span>{isBn ? 'বর্তমান ব্যালেন্স' : 'New Balance'}</span>
              </button>
            </div>

            {/* Amount Input */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 px-4 py-3 space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {entryMode === 'SET_BALANCE'
                  ? isBn
                    ? `${activeCard.name}-এ বর্তমানে কত টাকা আছে লিখুন`
                    : `Enter current balance in ${activeCard.name}`
                  : entryMode === 'IN'
                  ? isBn
                    ? `${activeCard.name}-এ কত টাকা ঢুকেছে?`
                    : `Amount received in ${activeCard.name}`
                  : isBn
                  ? `${activeCard.name} থেকে কত টাকা বের হয়েছে?`
                  : `Amount spent from ${activeCard.name}`}
              </label>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-400">{settings.currencySymbol}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-3xl font-black font-mono-num text-slate-900 dark:text-white outline-none tabular-nums"
                />
              </div>

              {previewInfo && (
                <p className="text-xs font-semibold font-mono-num pt-1 text-slate-600 dark:text-slate-300">
                  {entryMode === 'SET_BALANCE' ? (
                    <>
                      {isBn ? 'হিসাবের পার্থক্য:' : 'Difference:'}{' '}
                      <span
                        className={
                          previewInfo.delta >= 0
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-rose-600 dark:text-rose-400 font-bold'
                        }
                      >
                        {formatCurrency(
                          previewInfo.delta,
                          settings.currencySymbol,
                          settings.language,
                          true
                        )}{' '}
                        ({previewInfo.delta >= 0 ? (isBn ? 'ঢুকেছে' : 'In') : isBn ? 'বের হয়েছে' : 'Out'})
                      </span>
                    </>
                  ) : (
                    <>
                      {isBn ? 'আপডেটের পর ব্যালেন্স হবে:' : 'Balance after update:'}{' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(
                          previewInfo.nextBalance,
                          settings.currencySymbol,
                          settings.language
                        )}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Spending/Earning Ways (Subcategories from Settings) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isBn ? 'কোন খাতে / রাস্তায়? (সাব-ক্যাটাগরি)' : 'Category / Way'}
                </span>
                <button
                  type="button"
                  onClick={() => navigateToTab('SETTINGS')}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  {isBn ? '+ নতুন খাত' : '+ Add Way'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {spendingWays.map((way) => {
                  const active = selectedWay === way.name;
                  return (
                    <button
                      key={way.id}
                      type="button"
                      onClick={() => setSelectedWay(way.name)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                        active
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {way.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note + Submit Button */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={noteInput}
                maxLength={120}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  isBn ? 'ছোট নোট (ঐচ্ছিক, যেমন: বাজার / ভাড়া)' : 'Short note (optional)'
                }
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white outline-none"
              />
              <button
                type="submit"
                className={`min-h-[46px] px-6 py-2.5 rounded-xl text-white text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-md shrink-0 transition active:scale-[0.98] ${
                  entryMode === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : entryMode === 'SET_BALANCE'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Plus size={16} />
                <span>
                  {entryMode === 'SET_BALANCE'
                    ? isBn
                      ? 'ব্যালেন্স আপডেট'
                      : 'Update Balance'
                    : isBn
                    ? 'যুক্ত করুন'
                    : 'Add Entry'}
                </span>
              </button>
            </div>
          </form>
        </TranslucentCard>
      )}

      {/* Live Added Entries Feed */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            {isBn ? 'যুক্ত করা হিসাবসমূহ' : 'Added Entries'}
            <span className="ml-1.5 text-xs font-mono-num text-slate-500">
              ({localizeDigits(recentFeed.length, settings.language)})
            </span>
          </h3>

          {activeCard && (
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFeedScope('ALL')}
                className={`min-h-[32px] px-3 py-1 rounded-lg font-bold transition ${
                  feedScope === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {isBn ? 'সব কার্ড' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setFeedScope('CARD')}
                className={`min-h-[32px] px-3 py-1 rounded-lg font-bold transition ${
                  feedScope === 'CARD'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {activeCard.name}
              </button>
            </div>
          )}
        </div>

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {recentFeed.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? 'এখনো কোনো হিসাব যোগ করা হয়নি। উপরের ফর্ম থেকে আপনার টাকা ইন বা আউট যোগ করুন।'
                : 'No entries yet. Use the form above to add money in or out.'}
            </div>
          ) : (
            recentFeed.map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isIn = tx.type === 'INCOME' || tx.type === 'BORROW';
              const wayLabel = tx.subcategory || tx.category;
              const mainTitle =
                tx.title && tx.title.toLowerCase() !== wayLabel.toLowerCase()
                  ? tx.title
                  : wayLabel;

              return (
                <div
                  key={tx.id}
                  className="p-3.5 flex items-center justify-between gap-3 min-h-[60px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {mainTitle}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      <span>{wayLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {acc?.name || (isBn ? 'কার্ড' : 'Card')}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {formatDayHeader(tx.timestamp, settings.language)},{' '}
                        {formatTime(tx.timestamp, settings.language)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-sm font-extrabold font-mono-num tabular-nums ${
                        isIn
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIn ? '+' : '-'}
                      {formatCurrency(tx.amount, settings.currencySymbol, settings.language)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      aria-label={isBn ? 'মুছুন' : 'Delete'}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </TranslucentCard>
      </section>
    </div>
  );
}
