import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Pin,
  Wallet,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { formatCurrency, formatDayHeader, formatTime, localizeDigits } from '../utils/formatters';
import {
  PERSONAL_SOURCE_ACCOUNT_ID,
  computePersonalExpenseSummary,
  isPersonalWayLabel,
} from '../utils/analytics';
import { HishabPatiAccountCard } from '../components/HishabPatiAccountCard';
import { TranslucentCard } from '../components/GlassPrimitives';

type EntryMode = 'OUT' | 'IN' | 'SET_BALANCE';
type SourceMode = 'CARD' | 'PERSONAL';

export function HomeScreen() {
  const {
    settings,
    accounts,
    transactions,
    spendingWays,
    addSpendingSubWay,
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
  const [sourceMode, setSourceMode] = useState<SourceMode>('CARD');
  const [entryMode, setEntryMode] = useState<EntryMode>('OUT');
  const [amountInput, setAmountInput] = useState('');
  const [selectedWay, setSelectedWay] = useState<string>(() => spendingWays[0]?.name || (isBn ? 'পার্সোনাল' : 'Personal'));
  const [selectedSubWay, setSelectedSubWay] = useState<string>('');
  const [showQuickSubWayInput, setShowQuickSubWayInput] = useState(false);
  const [quickSubWayInput, setQuickSubWayInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [feedSourceFilter, setFeedSourceFilter] = useState<string>('ALL');
  const [isFeedFilterOpen, setIsFeedFilterOpen] = useState(false);
  const feedFilterMenuRef = useRef<HTMLDivElement | null>(null);

  // Pin Personal khath first in spendingWays
  const orderedWays = useMemo(() => {
    const personal = spendingWays.filter((w) => isPersonalWayLabel(w.name));
    const others = spendingWays.filter((w) => !isPersonalWayLabel(w.name));
    return [...personal, ...others];
  }, [spendingWays]);

  // When spending OUT from Personal pool, pick destination khath (excluding Personal itself).
  // When adding IN to Personal pool, allow all khaths (including Personal pinned first).
  const selectableWays = useMemo(() => {
    if (sourceMode === 'PERSONAL' && entryMode !== 'IN') {
      const nonPersonal = orderedWays.filter((w) => !isPersonalWayLabel(w.name));
      return nonPersonal.length > 0 ? nonPersonal : orderedWays;
    }
    return orderedWays;
  }, [entryMode, orderedWays, sourceMode]);

  const activeWayObj = useMemo(
    () => selectableWays.find((w) => w.name === selectedWay) ?? null,
    [selectableWays, selectedWay]
  );

  const activeSubWays = useMemo(
    () => activeWayObj?.subWays ?? [],
    [activeWayObj]
  );

  const personalSummary = useMemo(
    () => computePersonalExpenseSummary(transactions),
    [transactions]
  );

  // Keep selectedWay valid for the active source mode
  useEffect(() => {
    if (selectableWays.length > 0 && !selectableWays.some((w) => w.name === selectedWay)) {
      setSelectedWay(selectableWays[0].name);
    }
  }, [selectableWays, selectedWay]);

  // Reset selectedSubWay when switching খাত or if it was removed
  useEffect(() => {
    if (selectedSubWay && !activeSubWays.includes(selectedSubWay)) {
      setSelectedSubWay('');
    }
  }, [activeSubWays, selectedSubWay]);

  const selectCard = (idx: number) => {
    setSourceMode('CARD');
    if (visibleAccounts.length === 0) return;
    const clamped = Math.max(0, Math.min(visibleAccounts.length - 1, idx));
    setActiveIndex(clamped);
    setDragOffsetX(0);
    dragOffsetRef.current = 0;
  };

  const selectPersonalSource = () => {
    setSourceMode('PERSONAL');
    if (entryMode === 'SET_BALANCE') {
      setEntryMode('OUT');
    }
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
    if (!Number.isFinite(validNum)) return null;
    if (sourceMode === 'PERSONAL') {
      if (validNum <= 0) return null;
      if (entryMode === 'IN') {
        return {
          nextBalance: Math.round((personalSummary.netPersonalExpense + validNum) * 100) / 100,
          delta: validNum,
          effectiveType: 'INCOME' as const,
        };
      }
      return {
        nextBalance: Math.max(
          0,
          Math.round((personalSummary.netPersonalExpense - validNum) * 100) / 100
        ),
        delta: -validNum,
        effectiveType: 'EXPENSE' as const,
      };
    }
    if (!activeCard) return null;
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
  }, [activeCard, entryMode, personalSummary.netPersonalExpense, sourceMode, validNum]);

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();

    const subName = selectedSubWay.trim();
    const noteText = noteInput.trim();
    const buildEntryTitle = (fallbackWay: string) => {
      if (subName && noteText) return `${subName} · ${noteText}`;
      return subName || noteText || fallbackWay;
    };

    if (sourceMode === 'PERSONAL') {
      if (!Number.isFinite(validNum) || validNum <= 0) {
        showSnackbar(isBn ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Enter a valid amount');
        return;
      }
      const isIn = entryMode === 'IN';
      const fallbackWay = isIn
        ? orderedWays.find((w) => isPersonalWayLabel(w.name))?.name ||
          selectableWays[0]?.name ||
          (isBn ? 'পার্সোনাল' : 'Personal')
        : selectableWays[0]?.name || (isBn ? 'ফ্যামিলি' : 'Family');
      const trimmedWay = selectedWay.trim();
      const wayName = isIn
        ? trimmedWay || fallbackWay
        : trimmedWay && !isPersonalWayLabel(trimmedWay)
        ? trimmedWay
        : fallbackWay;
      const rounded = Math.round(validNum * 100) / 100;

      addTransaction({
        type: isIn ? 'INCOME' : 'EXPENSE',
        amount: rounded,
        title: buildEntryTitle(wayName).slice(0, 200),
        category: isIn ? 'Other Income' : 'Other Expenses',
        subcategory: wayName.slice(0, 100),
        accountId: PERSONAL_SOURCE_ACCOUNT_ID,
        toAccountId: null,
        timestamp: Date.now(),
        notes: noteText.slice(0, 1000),
        isRecurring: false,
        payeeOrPayer: '',
        debtId: null,
      });

      setAmountInput('');
      setNoteInput('');
      setSelectedSubWay('');
      showSnackbar(
        isIn
          ? isBn
            ? `পার্সোনালে (${wayName}) ${formatCurrency(rounded, settings.currencySymbol, settings.language)} যোগ হয়েছে`
            : `Added ${formatCurrency(rounded, settings.currencySymbol, settings.language)} to Personal (${wayName})`
          : isBn
          ? `পার্সোনাল থেকে ${wayName}-এ ${formatCurrency(rounded, settings.currencySymbol, settings.language)} যুক্ত হয়েছে`
          : `Saved ${formatCurrency(rounded, settings.currencySymbol, settings.language)} from Personal to ${wayName}`
      );
      return;
    }

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
        title: buildEntryTitle(wayName).slice(0, 200),
        category: txType === 'INCOME' ? 'Other Income' : 'Other Expenses',
        subcategory: wayName.slice(0, 100),
        accountId: activeCard.id,
        toAccountId: null,
        timestamp: Date.now(),
        notes: noteText.slice(0, 1000),
        isRecurring: false,
        payeeOrPayer: '',
        debtId: null,
      });
      setAmountInput('');
      setNoteInput('');
      setSelectedSubWay('');
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
      title: buildEntryTitle(wayName).slice(0, 200),
      category: txType === 'INCOME' ? 'Other Income' : 'Other Expenses',
      subcategory: wayName.slice(0, 100),
      accountId: activeCard.id,
      toAccountId: null,
      timestamp: Date.now(),
      notes: noteText.slice(0, 1000),
      isRecurring: false,
      payeeOrPayer: '',
      debtId: null,
    });

    setAmountInput('');
    setNoteInput('');
    setSelectedSubWay('');
    showSnackbar(
      isBn
        ? `${activeCard.name} (${wayName}) হিসাব যুক্ত হয়েছে`
        : `Saved to ${activeCard.name} (${wayName})`
    );
  };

  const feedSourceOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string; colorHex?: string; isPersonal?: boolean }> = [
      { id: 'ALL', label: isBn ? 'সব হিসাব' : 'All' },
      {
        id: 'PERSONAL',
        label: isBn ? 'পার্সোনাল থেকে' : 'From Personal',
        isPersonal: true,
      },
    ];
    const seenIds = new Set<string>(['ALL', 'PERSONAL', PERSONAL_SOURCE_ACCOUNT_ID]);
    for (const acc of visibleAccounts) {
      if (!seenIds.has(acc.id)) {
        seenIds.add(acc.id);
        opts.push({ id: acc.id, label: acc.name, colorHex: acc.colorHex });
      }
    }
    for (const tx of transactions) {
      if (!seenIds.has(tx.accountId)) {
        const hiddenAcc = accounts.find((a) => a.id === tx.accountId);
        if (hiddenAcc) {
          seenIds.add(hiddenAcc.id);
          opts.push({ id: hiddenAcc.id, label: hiddenAcc.name, colorHex: hiddenAcc.colorHex });
        }
      }
    }
    return opts;
  }, [accounts, isBn, transactions, visibleAccounts]);

  useEffect(() => {
    if (!feedSourceOptions.some((opt) => opt.id === feedSourceFilter)) {
      setFeedSourceFilter('ALL');
    }
  }, [feedSourceFilter, feedSourceOptions]);

  useEffect(() => {
    if (!isFeedFilterOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        feedFilterMenuRef.current &&
        !feedFilterMenuRef.current.contains(e.target as Node)
      ) {
        setIsFeedFilterOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFeedFilterOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFeedFilterOpen]);

  const activeFeedFilterOption = useMemo(
    () =>
      feedSourceOptions.find((o) => o.id === feedSourceFilter) ??
      feedSourceOptions[0],
    [feedSourceFilter, feedSourceOptions]
  );

  const recentFeed = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);
    if (feedSourceFilter === 'ALL') return sorted;
    if (feedSourceFilter === 'PERSONAL') {
      return sorted.filter((tx) => tx.accountId === PERSONAL_SOURCE_ACCOUNT_ID);
    }
    return sorted.filter(
      (tx) => tx.accountId === feedSourceFilter || tx.toAccountId === feedSourceFilter
    );
  }, [feedSourceFilter, transactions]);

  const filteredFeedStats = useMemo(() => {
    let totalOut = 0;
    let totalIn = 0;
    for (const tx of recentFeed) {
      if (tx.type === 'EXPENSE' || tx.type === 'LEND') {
        totalOut += tx.amount;
      } else if (tx.type === 'INCOME' || tx.type === 'BORROW') {
        totalIn += tx.amount;
      } else if (
        (tx.type === 'TRANSFER' || tx.type === 'CC_PAYMENT') &&
        feedSourceFilter !== 'ALL' &&
        feedSourceFilter !== 'PERSONAL'
      ) {
        if (tx.accountId === feedSourceFilter) totalOut += tx.amount;
        if (tx.toAccountId === feedSourceFilter) totalIn += tx.amount;
      }
    }
    return {
      totalOut: Math.round(totalOut * 100) / 100,
      totalIn: Math.round(totalIn * 100) / 100,
    };
  }, [feedSourceFilter, recentFeed]);

  const groupedRecentFeed = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      dayLabel: string;
      dayOut: number;
      items: typeof recentFeed;
    }> = [];
    const groupMap = new Map<string, (typeof groups)[number]>();

    for (const tx of recentFeed) {
      const d = new Date(tx.timestamp);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      let group = groupMap.get(dateKey);
      if (!group) {
        group = {
          dateKey,
          dayLabel: formatDayHeader(tx.timestamp, settings.language),
          dayOut: 0,
          items: [],
        };
        groupMap.set(dateKey, group);
        groups.push(group);
      }
      group.items.push(tx);
      if (tx.type === 'EXPENSE' || tx.type === 'LEND') {
        group.dayOut += tx.amount;
      }
    }
    return groups;
  }, [recentFeed, settings.language]);

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

      {/* Scrollable Card Carousel / Dedicated Personal Source Mode */}
      <section className="space-y-3">
        {/* div:nth-of-type(1) — Visual Deck (hidden bank/MFS selection when Personal mode is active) */}
        <div className="relative">
          {sourceMode === 'PERSONAL' ? (
            <div className="rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 text-white p-5 shadow-lg border border-white/20 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide bg-white/20 px-2.5 py-1 rounded-xl">
                  <Wallet size={14} />
                  <span>{isBn ? 'আলাদা পার্সোনাল উৎস' : 'Own Personal Money'}</span>
                </span>
                <span className="text-[11px] font-bold bg-black/20 px-2.5 py-1 rounded-xl">
                  {isBn ? 'কার্ড / ব্যাংক ছাড়া' : 'No Bank / MFS'}
                </span>
              </div>
              <div className="pt-1 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-white/85 font-semibold">
                    {isBn
                      ? 'পার্সোনালে বর্তমান মোট'
                      : 'Current Personal Total'}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black font-mono-num tabular-nums">
                    {formatCurrency(
                      personalSummary.netPersonalExpense,
                      settings.currencySymbol,
                      settings.language
                    )}
                  </p>
                </div>
                <p className="text-[11px] text-white/90 text-right max-w-[205px] leading-snug">
                  {entryMode === 'IN'
                    ? isBn
                      ? 'এখান থেকে টাকা ঢুকালে ব্যাংক/কার্ড ছাড়াই সরাসরি পার্সোনালে যোগ হবে'
                      : 'Adding here increases Personal without touching Bank/MFS cards'
                    : isBn
                    ? 'নিচের যেকোনো খাতে খরচ করলে পার্সোনাল থেকে কমে সেই খাতে যোগ হবে'
                    : 'Spending into a way subtracts from Personal and adds there'}
                </p>
              </div>
            </div>
          ) : visibleAccounts.length === 0 ? (
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
            <div className="space-y-2">
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
            </div>
          )}
        </div>

        {/* div:nth-of-type(2) — Source Switcher Row: Pinned 'From Personal' + Bank/MFS Cards */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Pinned Personal Source Pill (button:nth-of-type(1)) */}
            <button
              type="button"
              onClick={selectPersonalSource}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                sourceMode === 'PERSONAL'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50'
                  : 'glass-card text-amber-700 dark:text-amber-300 border border-amber-400/40'
              }`}
            >
              <Pin size={12} className="shrink-0" />
              <span>{isBn ? 'পার্সোনাল থেকে' : 'From Personal'}</span>
            </button>

            {visibleAccounts.map((acc, idx) => {
              const active = sourceMode === 'CARD' && idx === safeIndex;
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
      </section>

      {/* Direct Money In / Out & Balance Update Section (or Personal Reallocation Form) */}
      {(sourceMode === 'PERSONAL' || activeCard) && (
        <TranslucentCard className="p-4 sm:p-5">
          <form onSubmit={handleSubmitEntry} className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {sourceMode === 'PERSONAL'
                  ? entryMode === 'IN'
                    ? isBn
                      ? 'পার্সোনালে টাকা ঢুকান (ইন)'
                      : 'Add Money to Personal'
                    : isBn
                    ? 'পার্সোনাল থেকে অন্য খাতে খরচ করুন'
                    : 'Spend from Personal Money'
                  : `${activeCard?.name} — ${isBn ? 'হিসাব আপডেট করুন' : 'Update Flow & Balance'}`}
              </h2>
              <span className="text-xs font-mono-num font-bold text-slate-500 dark:text-slate-400 shrink-0">
                {sourceMode === 'PERSONAL'
                  ? formatCurrency(
                      personalSummary.netPersonalExpense,
                      settings.currencySymbol,
                      settings.language
                    )
                  : activeCard
                  ? formatCurrency(activeCard.balance, settings.currencySymbol, settings.language)
                  : ''}
              </span>
            </div>

            {/* Mode Segmented Switch: 2-way (OUT / IN) for Personal, 3-way for Bank/MFS cards */}
            {sourceMode === 'PERSONAL' ? (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEntryMode('OUT')}
                  className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition whitespace-nowrap ${
                    entryMode !== 'IN'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <ArrowUpRight size={14} />
                  <span>{isBn ? 'বের হয়েছে' : 'Money Out'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('IN');
                    const personalWay = orderedWays.find((w) => isPersonalWayLabel(w.name));
                    if (personalWay) {
                      setSelectedWay(personalWay.name);
                      setSelectedSubWay('');
                    }
                  }}
                  className={`min-h-[42px] px-2 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition whitespace-nowrap ${
                    entryMode === 'IN'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <ArrowDownLeft size={14} />
                  <span>{isBn ? 'ঢুকেছে (ইন)' : 'Money In'}</span>
                </button>
              </div>
            ) : (
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
            )}

            {/* Amount Input */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 px-4 py-3 space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                {sourceMode === 'PERSONAL'
                  ? entryMode === 'IN'
                    ? isBn
                      ? 'পার্সোনালে কত টাকা ঢুকেছে? (কোনো ব্যাংক/বিকাশ থেকে কাটবে না)'
                      : 'Amount added to Personal (no Bank/MFS card affected)'
                    : isBn
                    ? 'পার্সোনাল থেকে কত টাকা খরচ করেছেন? (কোনো ব্যাংক/বিকাশ থেকে কাটবে না)'
                    : 'Amount spent from Personal (no Bank/MFS card affected)'
                  : entryMode === 'SET_BALANCE'
                  ? isBn
                    ? `${activeCard?.name}-এ বর্তমানে কত টাকা আছে লিখুন`
                    : `Enter current balance in ${activeCard?.name}`
                  : entryMode === 'IN'
                  ? isBn
                    ? `${activeCard?.name}-এ কত টাকা ঢুকেছে?`
                    : `Amount received in ${activeCard?.name}`
                  : isBn
                  ? `${activeCard?.name} থেকে কত টাকা বের হয়েছে?`
                  : `Amount spent from ${activeCard?.name}`}
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
                  {sourceMode === 'PERSONAL' ? (
                    entryMode === 'IN' ? (
                      <>
                        {isBn
                          ? 'পার্সোনালে যোগ হবে · মোট হবে:'
                          : 'Adds to Personal · New Personal total:'}{' '}
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(
                            previewInfo.nextBalance,
                            settings.currencySymbol,
                            settings.language
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        {isBn
                          ? `${selectedWay} খাতে যোগ হবে · পার্সোনালে থাকবে:`
                          : `Adds to ${selectedWay} · Personal remaining:`}{' '}
                        <span className="font-extrabold text-amber-700 dark:text-amber-300">
                          {formatCurrency(
                            previewInfo.nextBalance,
                            settings.currencySymbol,
                            settings.language
                          )}
                        </span>
                      </>
                    )
                  ) : entryMode === 'SET_BALANCE' ? (
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

            {/* Spending/Earning Ways (Personal pinned first in Card/Personal-IN mode; destination khaths in Personal-OUT mode) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {sourceMode === 'PERSONAL'
                    ? entryMode === 'IN'
                      ? isBn
                        ? 'কোন খাতে / উৎস থেকে ঢুকেছে?'
                        : 'Which category/source?'
                      : isBn
                      ? 'কোন খাতে ব্যবহার করেছেন?'
                      : 'Which category/way did you spend on?'
                    : isBn
                    ? 'কোন খাতে / রাস্তায়? (সাব-ক্যাটাগরি)'
                    : 'Category / Way'}
                </span>
                <div className="flex items-center gap-3">
                  {activeWayObj && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickSubWayInput((v) => !v);
                        setQuickSubWayInput('');
                      }}
                      className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      {isBn ? '+ সাবখাত' : '+ Sub-way'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigateToTab('SETTINGS')}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {isBn ? '+ নতুন খাত' : '+ Add Way'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectableWays.map((way) => {
                  const active = selectedWay === way.name;
                  const pinnedPersonal = isPersonalWayLabel(way.name);
                  return (
                    <button
                      key={way.id}
                      type="button"
                      onClick={() => {
                        setSelectedWay(way.name);
                        setSelectedSubWay('');
                      }}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1 ${
                        active
                          ? pinnedPersonal
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-sky-600 text-white shadow-sm'
                          : pinnedPersonal
                          ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40 hover:bg-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pinnedPersonal && <Pin size={11} className="shrink-0" />}
                      <span>{way.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Automatic Sub-Khath Buttons for Selected Khath */}
              {(activeSubWays.length > 0 || showQuickSubWayInput) && activeWayObj && (
                <div className="rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {isBn
                        ? `${activeWayObj.name}-এর সাবখাতসমূহ:`
                        : `${activeWayObj.name} sub-ways:`}
                    </span>
                    {selectedSubWay && (
                      <button
                        type="button"
                        onClick={() => setSelectedSubWay('')}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        {isBn ? 'বাতিল' : 'Clear'}
                      </button>
                    )}
                  </div>

                  {activeSubWays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeSubWays.map((sub) => {
                        const subActive = selectedSubWay === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSelectedSubWay(subActive ? '' : sub)}
                            className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold transition ${
                              subActive
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {showQuickSubWayInput && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <input
                        type="text"
                        autoFocus
                        value={quickSubWayInput}
                        maxLength={80}
                        onChange={(e) => setQuickSubWayInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const clean = quickSubWayInput.trim();
                            if (!clean) return;
                            const ok = addSpendingSubWay(activeWayObj.id, clean);
                            if (ok) {
                              setSelectedSubWay(clean);
                              setQuickSubWayInput('');
                              setShowQuickSubWayInput(false);
                              showSnackbar(
                                isBn
                                  ? `${activeWayObj.name}-এ "${clean}" সাবখাত যোগ হয়েছে`
                                  : `Added "${clean}" under ${activeWayObj.name}`
                              );
                            } else {
                              showSnackbar(
                                isBn ? 'এই সাবখাতটি আগে থেকেই আছে' : 'Sub-way already exists'
                              );
                            }
                          }
                        }}
                        placeholder={
                          isBn
                            ? `${activeWayObj.name}-এর নতুন সাবখাত লিখুন...`
                            : `New sub-way for ${activeWayObj.name}...`
                        }
                        className="flex-1 min-h-[36px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-900 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const clean = quickSubWayInput.trim();
                          if (!clean) return;
                          const ok = addSpendingSubWay(activeWayObj.id, clean);
                          if (ok) {
                            setSelectedSubWay(clean);
                            setQuickSubWayInput('');
                            setShowQuickSubWayInput(false);
                            showSnackbar(
                              isBn
                                ? `${activeWayObj.name}-এ "${clean}" সাবখাত যোগ হয়েছে`
                                : `Added "${clean}" under ${activeWayObj.name}`
                            );
                          } else {
                            showSnackbar(
                              isBn ? 'এই সাবখাতটি আগে থেকেই আছে' : 'Sub-way already exists'
                            );
                          }
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-sky-600 text-white text-xs font-bold shrink-0"
                      >
                        {isBn ? 'যোগ' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuickSubWayInput(false)}
                        aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
                        className="w-9 h-9 rounded-xl bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
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
                  sourceMode === 'PERSONAL'
                    ? entryMode === 'IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                    : entryMode === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : entryMode === 'SET_BALANCE'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Plus size={16} />
                <span>
                  {sourceMode === 'PERSONAL'
                    ? entryMode === 'IN'
                      ? isBn
                        ? 'পার্সোনালে যোগ করুন'
                        : 'Add to Personal'
                      : isBn
                      ? 'পার্সোনাল থেকে খরচ'
                      : 'Spend from Personal'
                    : entryMode === 'SET_BALANCE'
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
      <section className="space-y-3">
        {/* div:nth-of-type(1) — Header + Compact Corner Source Toggle Dropdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isBn ? 'যুক্ত করা হিসাবসমূহ' : 'Added Entries'}
              <span className="ml-1.5 text-xs font-mono-num text-slate-500">
                ({localizeDigits(recentFeed.length, settings.language)})
              </span>
            </h3>

            {/* Corner Toggle Dropdown (Always defaults to 'সব হিসাব') */}
            <div className="relative shrink-0" ref={feedFilterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFeedFilterOpen((v) => !v)}
                aria-expanded={isFeedFilterOpen}
                aria-haspopup="listbox"
                className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition border ${
                  feedSourceFilter === 'ALL'
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                    : activeFeedFilterOption?.isPersonal
                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                }`}
              >
                {activeFeedFilterOption?.isPersonal ? (
                  <Pin size={11} className="shrink-0" />
                ) : activeFeedFilterOption?.colorHex ? (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: activeFeedFilterOption.colorHex }}
                  />
                ) : null}
                <span className="max-w-[130px] truncate">
                  {activeFeedFilterOption?.label}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${
                    isFeedFilterOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFeedFilterOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 mt-1.5 w-56 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 shadow-xl p-1.5 z-50 space-y-0.5"
                >
                  {feedSourceOptions.map((opt) => {
                    const active = feedSourceFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setFeedSourceFilter(opt.id);
                          setIsFeedFilterOpen(false);
                        }}
                        className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition text-left ${
                          active
                            ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {opt.isPersonal ? (
                            <Pin size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                          ) : opt.colorHex ? (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: opt.colorHex }}
                            />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {active && <Check size={14} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {feedSourceFilter !== 'ALL' && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <div className="flex items-center gap-2 flex-wrap font-mono-num">
                <span className="font-sans font-bold text-slate-700 dark:text-slate-200">
                  {activeFeedFilterOption?.label}:
                </span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {isBn ? 'মোট খরচ' : 'Total Spent'}{' '}
                  {formatCurrency(
                    filteredFeedStats.totalOut,
                    settings.currencySymbol,
                    settings.language
                  )}
                </span>
                {filteredFeedStats.totalIn > 0 && (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    · {isBn ? 'ইন' : 'In'}{' '}
                    {formatCurrency(
                      filteredFeedStats.totalIn,
                      settings.currencySymbol,
                      settings.language
                    )}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFeedSourceFilter('ALL')}
                className="text-[11px] font-extrabold text-sky-700 dark:text-sky-300 hover:underline shrink-0"
              >
                {isBn ? 'সব দেখুন' : 'Show All'}
              </button>
            </div>
          )}
        </div>

        {/* Chronological Date-Divided Entries List (আজ, গতকাল, older dates) */}
        {groupedRecentFeed.length === 0 ? (
          <TranslucentCard className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {feedSourceFilter === 'ALL'
              ? isBn
                ? 'এখনো কোনো হিসাব যোগ করা হয়নি। উপরের ফর্ম থেকে আপনার টাকা ইন বা আউট যোগ করুন।'
                : 'No entries yet. Use the form above to add money in or out.'
              : isBn
              ? 'এই ব্যাংক বা উৎসে কোনো হিসাব পাওয়া যায়নি।'
              : 'No entries found for this source.'}
          </TranslucentCard>
        ) : (
          <div className="space-y-3">
            {groupedRecentFeed.map((group) => (
              <TranslucentCard key={group.dateKey} className="overflow-hidden">
                {/* Date Divider Header */}
                <div className="px-3.5 py-2 bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {group.dayLabel}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                    <span>
                      {localizeDigits(group.items.length, settings.language)}{' '}
                      {isBn ? 'টি' : 'items'}
                    </span>
                    {group.dayOut > 0 && (
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        -{formatCurrency(group.dayOut, settings.currencySymbol, settings.language)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Transactions for this Date */}
                <div className="divide-y divide-slate-200/60 dark:divide-white/10">
                  {group.items.map((tx) => {
                    const isPersonalPool = tx.accountId === PERSONAL_SOURCE_ACCOUNT_ID;
                    const acc = isPersonalPool
                      ? undefined
                      : accounts.find((a) => a.id === tx.accountId);
                    const sourceLabel = isPersonalPool
                      ? isBn
                        ? 'পার্সোনাল থেকে'
                        : 'From Personal'
                      : acc?.name || (isBn ? 'কার্ড' : 'Card');
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
                            <span
                              className={`font-semibold ${
                                isPersonalPool
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {sourceLabel}
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>{formatTime(tx.timestamp, settings.language)}</span>
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
                  })}
                </div>
              </TranslucentCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
