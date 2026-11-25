import React from 'react';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { BACKGROUND_TEXTURE_OPTIONS, THEME_COLOR_PRESETS } from '../data/categoryCatalog';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import type { ThemeMode } from '../types/models';

export function ThemeScreen() {
  const { settings, updateSettings, closeSubScreen } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const modes: Array<{ id: ThemeMode; label: string; icon: React.ComponentType<{ size?: number }> }> = [
    { id: 'AUTO', label: isBn ? 'অটো' : 'System Auto', icon: Monitor },
    { id: 'LIGHT', label: isBn ? 'লাইট' : 'Light', icon: Sun },
    { id: 'DARK', label: isBn ? 'ডার্ক' : 'Dark', icon: Moon },
  ];

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={`${t('theme', settings.language)} & ${t('language', settings.language)}`}
        onBack={closeSubScreen}
      />

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        {/* Language */}
        <TranslucentCard className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-500">
            {t('language', settings.language)}
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                ['ENGLISH', 'English', 'BD / Global'],
                ['BANGLA', 'বাংলা (Bangla)', '০-৯ সংখ্যা ও বাংলা টেক্সট'],
              ] as const
            ).map(([id, title, sub]) => (
              <button
                key={id}
                type="button"
                onClick={() => updateSettings({ language: id })}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  settings.language === id
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                <p className="text-[11px] text-slate-500">{sub}</p>
              </button>
            ))}
          </div>
        </TranslucentCard>

        {/* Theme Mode */}
        <TranslucentCard className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-500">
            {isBn ? 'থিম মোড' : 'Appearance Mode'}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => {
              const Icon = m.icon;
              const active = settings.themeMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateSettings({ themeMode: m.id })}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold ${
                    active
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <Icon size={18} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </TranslucentCard>

        {/* Accent Presets */}
        <TranslucentCard className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-500">
            {isBn ? 'থিম অ্যাকসেন্ট রঙ (১৩টি)' : 'Accent Color (13 Presets)'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {THEME_COLOR_PRESETS.map((preset) => {
              const active = settings.themeColor === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateSettings({ themeColor: preset.id })}
                  className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-left ${
                    active
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                  >
                    {active && <Check size={14} />}
                  </span>
                  <span className="text-xs font-bold truncate">
                    {isBn ? preset.labelBn : preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </TranslucentCard>

        {/* Background Texture */}
        <TranslucentCard className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-slate-500">
            {isBn ? 'ব্যাকগ্রাউন্ড টেক্সচার (৭টি)' : 'Background Texture (7 Styles)'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BACKGROUND_TEXTURE_OPTIONS.map((tex) => {
              const active = settings.backgroundTexture === tex.id;
              return (
                <button
                  key={tex.id}
                  type="button"
                  onClick={() => updateSettings({ backgroundTexture: tex.id })}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center ${
                    active
                      ? 'border-sky-500 bg-sky-500/15 text-sky-600'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  {isBn ? tex.labelBn : tex.label}
                </button>
              );
            })}
          </div>
        </TranslucentCard>
      </div>
    </div>
  );
}
