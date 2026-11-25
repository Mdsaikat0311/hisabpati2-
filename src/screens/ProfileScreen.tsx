import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { COLOR_PALETTE_30 } from '../data/categoryCatalog';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';

export function ProfileScreen() {
  const {
    settings,
    extendedSettings,
    accounts,
    updateSettings,
    updateExtendedSettings,
    closeSubScreen,
    showSnackbar,
  } = useWallet();
  const isBn = settings.language === 'BANGLA';

  const [displayName, setDisplayName] = useState(
    extendedSettings.profileCustomName || settings.userName
  );
  const [avatarBg, setAvatarBg] = useState(extendedSettings.profileAvatarBgHex || '#0284C7');
  const [defaultWalletId, setDefaultWalletId] = useState(
    extendedSettings.defaultWalletId ?? ''
  );
  const [newBank, setNewBank] = useState('');
  const [newMfs, setNewMfs] = useState('');

  const handleSave = () => {
    const clean = displayName.trim() || 'User';
    updateSettings({ userName: clean });
    updateExtendedSettings({
      profileCustomName: clean,
      profileAvatarBgHex: avatarBg,
      defaultWalletId: defaultWalletId || null,
    });
    showSnackbar(isBn ? 'প্রোফাইল সংরক্ষিত হয়েছে' : 'Profile saved');
    closeSubScreen();
  };

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('profile', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        <TranslucentCard className="p-5 space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg"
              style={{ backgroundColor: avatarBg }}
            >
              {(displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {COLOR_PALETTE_30.slice(0, 10).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setAvatarBg(hex)}
                  className="w-6 h-6 rounded-full border-2"
                  style={{
                    backgroundColor: hex,
                    borderColor: avatarBg === hex ? '#fff' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {isBn ? 'প্রদর্শন নাম' : 'Display Name'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {isBn ? 'ডিফল্ট ওয়ালেট' : 'Default Transaction Wallet'}
            </label>
            <select
              value={defaultWalletId}
              onChange={(e) => setDefaultWalletId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">{isBn ? 'প্রথম সক্রিয় ওয়ালেট' : 'First active wallet'}</option>
              {accounts
                .filter((a) => !a.isHidden)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        </TranslucentCard>

        {/* Custom BD Banks & MFS Directory */}
        <TranslucentCard className="p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isBn ? 'কাস্টম ব্যাংক ও এমএফএস তালিকা' : 'Custom Banks & MFS Providers'}
          </h3>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                placeholder={isBn ? 'কাস্টম ব্যাংকের নাম' : 'Add custom bank name'}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBank.trim()) return;
                  updateExtendedSettings({
                    customBanks: [...extendedSettings.customBanks, newBank.trim()],
                  });
                  setNewBank('');
                }}
                className="px-3 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {extendedSettings.customBanks.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                >
                  {b}
                  <button
                    type="button"
                    onClick={() =>
                      updateExtendedSettings({
                        customBanks: extendedSettings.customBanks.filter((x) => x !== b),
                      })
                    }
                    className="text-rose-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMfs}
                onChange={(e) => setNewMfs(e.target.value)}
                placeholder={isBn ? 'কাস্টম এমএফএস নাম' : 'Add custom MFS provider'}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMfs.trim()) return;
                  updateExtendedSettings({
                    customMfsProviders: [
                      ...extendedSettings.customMfsProviders,
                      { name: newMfs.trim(), brandColorHex: '#0284C7' },
                    ],
                  });
                  setNewMfs('');
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {extendedSettings.customMfsProviders.map((m) => (
                <span
                  key={m.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                >
                  {m.name}
                  <button
                    type="button"
                    onClick={() =>
                      updateExtendedSettings({
                        customMfsProviders: extendedSettings.customMfsProviders.filter(
                          (x) => x.name !== m.name
                        ),
                      })
                    }
                    className="text-rose-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
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
