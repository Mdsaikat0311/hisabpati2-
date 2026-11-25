import React, { useMemo, useState } from 'react';
import { X, Plus, ChevronRight, Search } from 'lucide-react';
import type { CategoryEntity, SubcategoryEntity, TransactionType } from '../types/models';
import { useWallet } from '../context/WalletContext';
import { CategoryIcon } from './CategoryIcon';
import { t } from '../data/appStrings';

export function CategorySelectionSheet({
  open,
  txType,
  selectedCategoryName,
  selectedSubcategoryName,
  onSelect,
  onClose,
  onCreateCategory,
}: {
  open: boolean;
  txType: TransactionType;
  selectedCategoryName: string;
  selectedSubcategoryName: string;
  onSelect: (categoryName: string, subcategoryName: string) => void;
  onClose: () => void;
  onCreateCategory?: () => void;
}) {
  const { categories, subcategories, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [search, setSearch] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const isIncome = txType === 'INCOME' || txType === 'BORROW';
    const isTransfer = txType === 'TRANSFER' || txType === 'CC_PAYMENT';

    return categories
      .filter((c) => {
        if (!c.isActive) return false;
        if (isTransfer) return c.isTransfer;
        if (isIncome) return c.isIncome && !c.isTransfer;
        return !c.isIncome && !c.isTransfer;
      })
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.nameBn.toLowerCase().includes(q);
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, search, txType]);

  if (!open) return null;

  const getSubs = (cat: CategoryEntity): SubcategoryEntity[] =>
    subcategories
      .filter((s) => s.categoryId === cat.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('select_category', settings.language)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn ? 'ক্যাটাগরি বা সাবক্যাটাগরি বেছে নিন' : 'Choose category or expand subcategories'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCreateCategory && (
              <button
                type="button"
                onClick={onCreateCategory}
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} /> {t('add', settings.language)}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isBn ? 'ক্যাটাগরি খুঁজুন...' : 'Search categories...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCategories.map((cat) => {
            const subs = getSubs(cat);
            const isSelected = cat.name.toLowerCase() === selectedCategoryName.toLowerCase();
            const isExpanded = expandedCatId === cat.id || isSelected;
            return (
              <div
                key={cat.id}
                className={`rounded-2xl border transition ${
                  isSelected
                    ? 'border-sky-500/50 bg-sky-50/70 dark:bg-sky-950/30'
                    : 'border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between p-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(cat.name, '');
                      onClose();
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <CategoryIcon iconName={cat.iconName} colorHex={cat.colorHex} size={38} iconSize={18} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {isBn && cat.nameBn ? cat.nameBn : cat.name}
                      </p>
                      {subs.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {subs.length} {isBn ? 'টি সাবক্যাটাগরি' : 'subcategories'}
                        </p>
                      )}
                    </div>
                  </button>
                  {subs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                      className="w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-700/60 flex items-center justify-center text-slate-500"
                    >
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  )}
                </div>
                {isExpanded && subs.length > 0 && (
                  <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                    {subs.map((sub) => {
                      const subSelected =
                        isSelected &&
                        sub.name.toLowerCase() === selectedSubcategoryName.toLowerCase();
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            onSelect(cat.name, sub.name);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            subSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-sky-400'
                          }`}
                        >
                          {isBn && sub.nameBn ? sub.nameBn : sub.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
