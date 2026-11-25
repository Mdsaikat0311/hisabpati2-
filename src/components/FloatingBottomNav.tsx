import React from 'react';
import { Home, BarChart3, Settings } from 'lucide-react';
import type { PrimaryTab } from '../types/models';
import { useWallet } from '../context/WalletContext';
import { getThemeColors } from '../data/categoryCatalog';

export function FloatingBottomNav() {
  const { activeTab, navigateToTab, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const accent = getThemeColors(settings.themeColor);

  const items: Array<{
    id: PrimaryTab;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
  }> = [
    { id: 'HOME', label: isBn ? 'হোম' : 'Home', icon: Home },
    { id: 'REPORT', label: isBn ? 'রিপোর্ট' : 'Report', icon: BarChart3 },
    { id: 'SETTINGS', label: isBn ? 'সেটিং' : 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 px-4 pointer-events-none no-print">
      <div className="max-w-md mx-auto">
        <nav
          aria-label="Primary Navigation"
          className="pointer-events-auto crystal-nav-pill rounded-full px-2 py-1.5 grid grid-cols-3 items-center gap-1"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToTab(item.id)}
                className={`min-h-[46px] flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all whitespace-nowrap ${
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
                <Icon size={19} />
                <span className="text-[11px] font-semibold mt-0.5 leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
