import React from 'react';
import { Home, ListOrdered, PieChart, BarChart3, Plus } from 'lucide-react';
import type { PrimaryTab } from '../types/models';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { getThemeColors } from '../data/categoryCatalog';

export function FloatingBottomNav() {
  const { activeTab, navigateToTab, openAddTransaction, settings } = useWallet();
  const lang = settings.language;
  const accent = getThemeColors(settings.themeColor);

  const items: Array<{ id: PrimaryTab; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: 'HOME', label: t('nav_home', lang), icon: Home },
    { id: 'ACTIVITY', label: t('nav_activity', lang), icon: ListOrdered },
    { id: 'PLAN', label: t('nav_plan', lang), icon: PieChart },
    { id: 'INSIGHTS', label: t('nav_insights', lang), icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none no-print">
      <div className="max-w-md mx-auto flex items-center justify-center gap-2.5">
        <nav
          aria-label="Primary Navigation"
          className="pointer-events-auto crystal-nav-pill rounded-full px-2 py-1.5 flex items-center gap-1 flex-1"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToTab(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-full transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`,
                      }
                    : undefined
                }
              >
                <Icon size={18} />
                <span className="text-[10.5px] font-semibold mt-0.5 leading-tight truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => openAddTransaction()}
          aria-label="Quick Add Transaction"
          className="pointer-events-auto w-13 h-13 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform shrink-0"
          style={{
            background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`,
            boxShadow: `0 10px 26px -4px ${accent.primary}66`,
          }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
