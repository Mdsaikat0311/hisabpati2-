import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, ShieldCheck } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';
import { formatDateTime } from '../utils/formatters';
import { SubScreenHeader, TranslucentCard } from '../components/GlassPrimitives';
import type { SmartNotificationType } from '../types/models';

export function NotificationsScreen() {
  const {
    notifications,
    settings,
    markNotificationRead,
    markAllNotificationsRead,
    closeSubScreen,
  } = useWallet();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | SmartNotificationType>('ALL');

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'UNREAD') return !n.isRead;
      if (filter !== 'ALL') return n.type === filter;
      return true;
    });
  }, [filter, notifications]);

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader
        title={t('notifications', settings.language)}
        onBack={closeSubScreen}
        rightAction={
          notifications.length > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1"
            >
              <CheckCheck size={14} /> {t('mark_all_read', settings.language)}
            </button>
          )
        }
      />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(
            [
              ['ALL', t('all', settings.language)],
              ['UNREAD', t('unread', settings.language)],
              ['BILL_DUE', t('bills', settings.language)],
              ['BUDGET_ALERT', t('alerts', settings.language)],
              ['INSIGHT', t('insights', settings.language)],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                filter === id ? 'bg-sky-600 text-white' : 'glass-card'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <TranslucentCard className="p-8 text-center space-y-2">
            <Bell size={28} className="mx-auto text-slate-400" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {t('no_notifications', settings.language)}
            </p>
          </TranslucentCard>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((n) => (
              <TranslucentCard
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-4 space-y-1 ${!n.isRead ? 'border-l-4 border-l-sky-500' : 'opacity-80'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {n.title}
                  </span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                <p className="text-[10px] text-slate-400">
                  {formatDateTime(n.timestamp, settings.language)}
                </p>
              </TranslucentCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationManagerScreen() {
  const { settings, extendedSettings, updateSettings, updateExtendedSettings, closeSubScreen } =
    useWallet();
  const isBn = settings.language === 'BANGLA';

  const toggles: Array<{
    label: string;
    enabled: boolean;
    onToggle: () => void;
  }> = [
    {
      label: isBn ? 'সকল স্মার্ট বিজ্ঞপ্তি (মাস্টার সুইচ)' : 'Master Smart Notifications',
      enabled: settings.notificationsEnabled,
      onToggle: () => updateSettings({ notificationsEnabled: !settings.notificationsEnabled }),
    },
    {
      label: isBn ? 'বাজেট সতর্কতা' : 'Budget Threshold Alerts',
      enabled: extendedSettings.budgetAlertEnabled,
      onToggle: () =>
        updateExtendedSettings({ budgetAlertEnabled: !extendedSettings.budgetAlertEnabled }),
    },
    {
      label: isBn ? 'ক্রেডিট কার্ড বিল রিমাইন্ডার' : 'Credit Card Due Reminders',
      enabled: extendedSettings.creditCardDueEnabled,
      onToggle: () =>
        updateExtendedSettings({ creditCardDueEnabled: !extendedSettings.creditCardDueEnabled }),
    },
    {
      label: isBn ? 'ঋণ ও দেনা পরিশোধ সতর্কতা' : 'Debt & Loan Due Alerts',
      enabled: extendedSettings.debtAlertEnabled,
      onToggle: () =>
        updateExtendedSettings({ debtAlertEnabled: !extendedSettings.debtAlertEnabled }),
    },
    {
      label: isBn ? 'নিয়মিত বিল রিমাইন্ডার' : 'Recurring Bill Reminders',
      enabled: extendedSettings.billReminderEnabled,
      onToggle: () =>
        updateExtendedSettings({ billReminderEnabled: !extendedSettings.billReminderEnabled }),
    },
  ];

  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('notifications', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-xl mx-auto px-4 pt-4">
        <TranslucentCard className="divide-y divide-slate-200/60 dark:divide-white/10">
          {toggles.map((item) => (
            <div key={item.label} className="p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</span>
              <button
                type="button"
                onClick={item.onToggle}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                  item.enabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    item.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </TranslucentCard>
      </div>
    </div>
  );
}

export function AboutScreen() {
  const { settings, closeSubScreen } = useWallet();
  return (
    <div className="min-h-screen pb-14">
      <SubScreenHeader title={t('about_app', settings.language)} onBack={closeSubScreen} />
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        <TranslucentCard className="p-6 text-center space-y-4">
          <img
            src="/assets/ic_app_logo.png"
            alt="Hishab Pati"
            className="w-20 h-20 rounded-3xl mx-auto object-contain shadow-md"
          />
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {t('app_name', settings.language)}
            </h2>
            <p className="text-xs font-semibold text-sky-600 mt-0.5">
              {t('version', settings.language)} 2.6.0
            </p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('app_description', settings.language)}
          </p>
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-1 text-xs">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold">
              <ShieldCheck size={15} />
              <span>{t('app_tagline', settings.language)}</span>
            </div>
            <p className="text-slate-500">
              {t('developer', settings.language)}:{' '}
              <strong className="text-slate-900 dark:text-white">
                {t('app_developer', settings.language)}
              </strong>
            </p>
            <p className="text-slate-400">{t('app_footer', settings.language)}</p>
          </div>
        </TranslucentCard>
      </div>
    </div>
  );
}
