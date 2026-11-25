import React, { useMemo, useState } from 'react';
import {
  Plus,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { COLOR_PALETTE_30, ICON_CATALOG_80 } from '../data/categoryCatalog';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import { CategoryIcon } from '../components/CategoryIcon';
import type { CategoryEntity } from '../types/models';

export function CategoriesScreen() {
  const {
    categories,
    subcategories,
    settings,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    restoreDefaultCategories,
    addSubcategory,
    deleteSubcategory,
    closeSubScreen,
    showSnackbar,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [tab, setTab] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [editingCat, setEditingCat] = useState<CategoryEntity | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [colorHex, setColorHex] = useState('#0284C7');
  const [iconName, setIconName] = useState('category');
  const [newSubName, setNewSubName] = useState('');

  const filtered = useMemo(() => {
    return categories
      .filter((c) => {
        if (tab === 'INCOME') return c.isIncome && !c.isTransfer;
        if (tab === 'TRANSFER') return c.isTransfer;
        return !c.isIncome && !c.isTransfer;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, tab]);

  const moveOrder = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= filtered.length) return;
    const ids = filtered.map((c) => c.id);
    const [moved] = ids.splice(idx, 1);
    ids.splice(target, 0, moved);
    reorderCategories(ids);
  };

  const openEditor = (cat?: CategoryEntity) => {
    if (cat) {
      setEditingCat(cat);
      setCreatingNew(false);
      setName(cat.name);
      setNameBn(cat.nameBn);
      setColorHex(cat.colorHex);
      setIconName(cat.iconName);
    } else {
      setEditingCat(null);
      setCreatingNew(true);
      setName('');
      setNameBn('');
      setColorHex('#0284C7');
      setIconName('category');
    }
    setNewSubName('');
  };

  const handleSaveCategory = () => {
    if (!name.trim()) return;
    if (editingCat) {
      updateCategory({
        ...editingCat,
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        colorHex,
        iconName,
      });
      showSnackbar(isBn ? 'ক্যাটাগরি আপডেট হয়েছে' : 'Category updated');
    } else {
      addCategory({
        name: name.trim(),
        nameBn: nameBn.trim() || name.trim(),
        isIncome: tab === 'INCOME',
        isTransfer: tab === 'TRANSFER',
        isActive: true,
        colorHex,
        iconName,
      });
      showSnackbar(isBn ? 'নতুন ক্যাটাগরি তৈরি হয়েছে' : 'Category created');
    }
    setEditingCat(null);
    setCreatingNew(false);
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('customize_categories', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                restoreDefaultCategories();
                showSnackbar(isBn ? 'ডিফল্ট ক্যাটাগরি পুনরুদ্ধার হয়েছে' : 'Default categories restored');
              }}
              className="w-9 h-9 rounded-full glass-card flex items-center justify-center"
              title="Restore Defaults"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => openEditor()}
              className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus size={14} /> {t('add', settings.language)}
            </button>
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-1.5">
          {(
            [
              ['EXPENSE', t('expenses', settings.language)],
              ['INCOME', t('income', settings.language)],
              ['TRANSFER', t('transfers', settings.language)],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                tab === id
                  ? 'bg-sky-600 text-white'
                  : 'glass-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {filtered.map((cat, idx) => {
            const subCount = subcategories.filter((s) => s.categoryId === cat.id).length;
            return (
              <div key={cat.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIcon iconName={cat.iconName} colorHex={cat.colorHex} size={38} iconSize={18} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {isBn && cat.nameBn ? cat.nameBn : cat.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {subCount} {isBn ? 'সাবক্যাটাগরি' : 'subcategories'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveOrder(idx, -1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === filtered.length - 1}
                    onClick={() => moveOrder(idx, 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(cat)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-500/10"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </TranslucentCard>
      </div>

      {(editingCat || creatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingCat ? t('edit', settings.language) : t('add', settings.language)}
              </h3>
              <div className="flex items-center gap-2">
                {editingCat && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteCategory(editingCat.id);
                      setEditingCat(null);
                    }}
                    className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingCat(null);
                    setCreatingNew(false);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex justify-center">
                <CategoryIcon iconName={iconName} colorHex={colorHex} size={56} iconSize={26} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="English Name"
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                />
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="বাংলা নাম (Optional)"
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">
                  {isBn ? 'রঙ (৩০টি)' : 'Color Palette'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE_30.map((hex) => (
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
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">
                  {isBn ? 'আইকন ক্যাটালগ' : 'Icon Catalog'}
                </p>
                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                  {ICON_CATALOG_80.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIconName(ic)}
                      className={`p-1.5 rounded-xl border flex justify-center ${
                        iconName === ic ? 'border-sky-500 bg-sky-500/10' : 'border-transparent'
                      }`}
                    >
                      <CategoryIcon iconName={ic} colorHex={colorHex} size={32} iconSize={16} />
                    </button>
                  ))}
                </div>
              </div>

              {editingCat && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-500">
                    {t('subcategory', settings.language)}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder={isBn ? 'নতুন সাবক্যাটাগরি' : 'New subcategory name'}
                      className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSubName.trim()) return;
                        addSubcategory(editingCat.id, newSubName.trim());
                        setNewSubName('');
                      }}
                      className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {subcategories
                      .filter((s) => s.categoryId === editingCat.id)
                      .map((sub) => (
                        <span
                          key={sub.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs"
                        >
                          {isBn && sub.nameBn ? sub.nameBn : sub.name}
                          <button
                            type="button"
                            onClick={() => deleteSubcategory(sub.id)}
                            className="text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleSaveCategory}
                className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-sm font-bold"
              >
                {t('save', settings.language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
