import React from 'react';
import { Wifi, Landmark, Smartphone, Banknote, CreditCard, SlidersHorizontal } from 'lucide-react';
import type { AccountEntity, AppLanguage } from '../types/models';
import {
  getCardNetworkLogoPath,
  getMfsLogoPath,
  parseAccountNotesMetadata,
} from '../data/cardBrandAssets';
import { t } from '../data/appStrings';
import { formatCurrency } from '../utils/formatters';

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(2, 132, 199, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function EmvChipSvg({ style = 'GOLD' }: { style?: 'GOLD' | 'SILVER_GOLD' }) {
  const gradId = style === 'GOLD' ? 'emvGold' : 'emvSilver';
  const strokeColor = style === 'GOLD' ? '#6B4B04' : '#334155';
  return (
    <svg width="34" height="24" viewBox="0 0 34 24" className="shrink-0 drop-shadow-sm">
      <defs>
        <linearGradient id="emvGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFEEA0" />
          <stop offset="45%" stopColor="#E5B745" />
          <stop offset="100%" stopColor="#BA8618" />
        </linearGradient>
        <linearGradient id="emvSilver" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#E3DEC8" />
          <stop offset="100%" stopColor="#9CA3AF" />
        </linearGradient>
      </defs>
      <rect x="0.6" y="0.6" width="32.8" height="22.8" rx="4.5" fill={`url(#${gradId})`} stroke="rgba(255,255,255,0.65)" strokeWidth="0.9" />
      <rect x="9.5" y="6" width="15" height="12" rx="2" fill="none" stroke={strokeColor} strokeOpacity="0.78" strokeWidth="0.9" />
      <line x1="0.8" y1="12" x2="9.5" y2="12" stroke={strokeColor} strokeOpacity="0.78" strokeWidth="0.9" />
      <line x1="24.5" y1="12" x2="33.2" y2="12" stroke={strokeColor} strokeOpacity="0.78" strokeWidth="0.9" />
      <line x1="17" y1="0.8" x2="17" y2="6" stroke={strokeColor} strokeOpacity="0.78" strokeWidth="0.9" />
      <line x1="17" y1="18" x2="17" y2="23.2" stroke={strokeColor} strokeOpacity="0.78" strokeWidth="0.9" />
    </svg>
  );
}

export function HishabPatiAccountCard({
  account,
  currencySymbol,
  language,
  onClick,
  onQuickEdit,
  monthlyIn,
  monthlyOut,
  compact = false,
  minimalBalanceOnly = false,
  className = '',
}: {
  account: AccountEntity;
  currencySymbol: string;
  language: AppLanguage;
  onClick?: () => void;
  onQuickEdit?: () => void;
  monthlyIn?: number;
  monthlyOut?: number;
  compact?: boolean;
  minimalBalanceOnly?: boolean;
  className?: string;
}) {
  const isBn = language === 'BANGLA';
  const meta = parseAccountNotesMetadata(account.notes);
  const baseHex = account.colorHex || '#0284C7';
  const mfsLogo = getMfsLogoPath(account.institution || account.name);
  const netLogo = getCardNetworkLogoPath(meta.network);

  const isCredit = account.type === 'CREDIT_CARD';
  const isMfs = account.type === 'MFS';
  const isCash = account.type === 'CASH';
  const isBank = account.type === 'BANK' || account.type === 'OTHER';

  const displayBalance = isCredit
    ? account.balance < 0
      ? Math.abs(account.balance)
      : 0
    : account.balance;

  const utilization =
    isCredit && account.creditLimit > 0
      ? Math.min(100, (Math.max(0, account.balance < 0 ? -account.balance : 0) / account.creditLimit) * 100)
      : 0;

  const hasFlowInfo = !minimalBalanceOnly && (monthlyIn !== undefined || monthlyOut !== undefined);

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden text-white select-none flex flex-col justify-between ${
        minimalBalanceOnly
          ? 'aspect-[1.586/1] w-full rounded-[22px] p-5 sm:p-6 border border-white/25'
          : compact
          ? 'rounded-[22px] p-4 min-h-[162px]'
          : 'rounded-[22px] p-5 min-h-[188px]'
      } ${onClick ? 'cursor-pointer active:scale-[0.985] transition-transform' : ''} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${baseHex} 0%, ${hexToRgba(baseHex, 0.88)} 52%, #0F172A 132%)`,
        boxShadow: minimalBalanceOnly
          ? `0 20px 38px -12px ${hexToRgba(baseHex, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.32)`
          : `0 14px 32px -10px ${hexToRgba(baseHex, 0.48)}`,
      }}
    >
      {/* Subtle diagonal card gloss sheen */}
      {minimalBalanceOnly && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(120deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 38%, rgba(255,255,255,0) 60%)',
          }}
        />
      )}

      {/* Bespoke Category Surface Texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 400 220" preserveAspectRatio="none">
        {isCredit && (
          <>
            <path d="M-20,160 C90,90 240,210 420,110" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.45" />
            <path d="M-20,180 C110,110 260,230 420,130" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.32" />
            <path d="M-20,200 C130,130 280,250 420,150" fill="none" stroke="white" strokeWidth="0.9" strokeOpacity="0.22" />
          </>
        )}
        {isBank && (
          <>
            <path d="M220,-20 C290,80 260,160 410,210 L410,-20 Z" fill="white" fillOpacity="0.12" />
            <path d="M270,-20 C330,70 310,140 420,185" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          </>
        )}
        {isMfs && (
          <>
            <polygon points="280,0 400,0 400,130 230,75" fill="white" fillOpacity="0.12" />
            <polygon points="310,110 400,145 400,220 240,220" fill="white" fillOpacity="0.08" />
          </>
        )}
        {isCash && (
          <>
            <circle cx="340" cy="65" r="56" fill="none" stroke="white" strokeWidth="1.4" strokeOpacity="0.24" />
            <circle cx="340" cy="65" r="42" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
            <text x="340" y="76" textAnchor="middle" fill="white" fillOpacity="0.22" fontSize="34" fontWeight="800">
              {currencySymbol}
            </text>
          </>
        )}
      </svg>

      {/* Top Row: Identity + Brand */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {!minimalBalanceOnly && (
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-white/80">
              <span className="uppercase tracking-wider">
                {isCredit
                  ? t('credit_card_label', language)
                  : isMfs
                  ? t('mobile_wallet', language)
                  : isCash
                  ? t('cash_in_hand', language)
                  : meta.subtype || t('debit_card_label', language)}
              </span>
              {account.accountNumberLast4 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num text-white/80">
                    •••• {account.accountNumberLast4}
                  </span>
                </>
              )}
            </div>
          )}
          <h3 className={`${minimalBalanceOnly ? 'text-lg sm:text-xl' : 'text-[16px]'} font-bold tracking-tight truncate mt-0.5`}>
            {account.name}
          </h3>
          {account.institution && !isCash && account.institution.toLowerCase() !== account.name.toLowerCase() && (
            <p className="text-[11px] sm:text-xs text-white/75 truncate">{account.institution}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {!minimalBalanceOnly && onQuickEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickEdit();
              }}
              aria-label={isBn ? 'কার্ড ও ব্যালেন্স পরিবর্তন' : 'Edit card & balance'}
              title={isBn ? 'ব্যালেন্স / কার্ড পরিবর্তন' : 'Edit balance / card'}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
            >
              <SlidersHorizontal size={14} />
            </button>
          )}
          {isMfs && mfsLogo ? (
            <img src={mfsLogo} alt={account.institution || account.name} className="h-7 w-auto object-contain rounded-lg bg-white/95 p-0.5 shadow-sm" />
          ) : netLogo && !minimalBalanceOnly ? (
            <img src={netLogo} alt={meta.network} className="h-5 w-auto object-contain" />
          ) : isCredit ? (
            <CreditCard size={20} className="text-white/85" />
          ) : isMfs ? (
            <Smartphone size={20} className="text-white/85" />
          ) : isCash ? (
            <Banknote size={20} className="text-white/85" />
          ) : (
            <Landmark size={20} className="text-white/85" />
          )}
        </div>
      </div>

      {/* Subtle Chip + Contactless mark on physical minimal card */}
      {minimalBalanceOnly && (isBank || isCredit) && (
        <div className="relative z-10 flex items-center gap-2 opacity-90">
          <EmvChipSvg style={isCredit ? 'GOLD' : 'SILVER_GOLD'} />
          <Wifi size={14} className="rotate-90 text-white/75" />
        </div>
      )}

      {/* Middle Hardware Row (EMV + NFC for Bank/Credit when not minimal) */}
      {!minimalBalanceOnly && (isCredit || isBank) && (
        <div className="relative z-10 flex items-center gap-2.5 mt-2.5">
          <EmvChipSvg style={isCredit ? 'GOLD' : 'SILVER_GOLD'} />
          <Wifi size={15} className="rotate-90 text-white/70" />
          {!compact && account.accountNumberLast4 && (
            <span className="ml-auto text-xs font-mono-num tracking-widest text-white/80">
              •••• •••• •••• {account.accountNumberLast4}
            </span>
          )}
        </div>
      )}

      {/* Bottom Row: Balance */}
      <div className={`relative z-10 ${minimalBalanceOnly ? 'mt-auto' : compact ? 'mt-3' : 'mt-5'} flex items-end justify-between gap-2`}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/75">
            {isBn ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}
          </p>
          <p className={`${minimalBalanceOnly ? 'text-2xl sm:text-3xl' : compact ? 'text-[20px]' : 'text-[23px]'} font-extrabold font-mono-num leading-tight mt-0.5 tabular-nums`}>
            {formatCurrency(displayBalance, currencySymbol, language)}
          </p>
        </div>

        {!minimalBalanceOnly && isCredit && account.creditLimit > 0 ? (
          <div className="text-right min-w-[96px]">
            <p className="text-[10px] text-white/80 font-medium font-mono-num">
              {Math.round(utilization)}% · {formatCurrency(account.creditLimit, currencySymbol, language)}
            </p>
            <div className="w-24 h-1.5 rounded-full bg-white/25 overflow-hidden mt-1 ml-auto">
              <div
                className={`h-full rounded-full ${utilization > 80 ? 'bg-red-300' : 'bg-white'}`}
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        ) : hasFlowInfo ? (
          <div className="text-right text-[10.5px] font-mono-num space-y-0.5 shrink-0">
            <p className="text-emerald-200 font-semibold">
              {isBn ? 'ইন' : 'In'}: +{formatCurrency(monthlyIn ?? 0, currencySymbol, language)}
            </p>
            <p className="text-rose-200 font-semibold">
              {isBn ? 'আউট' : 'Out'}: -{formatCurrency(monthlyOut ?? 0, currencySymbol, language)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AccountMiniBadge({ account }: { account?: AccountEntity }) {
  if (!account) return null;
  const color = account.colorHex || '#0284C7';
  const mfsLogo = account.type === 'MFS' ? getMfsLogoPath(account.institution || account.name) : null;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}35`,
        color,
      }}
    >
      {mfsLogo ? (
        <img src={mfsLogo} alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
      ) : (
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="truncate max-w-[120px]">{account.name}</span>
    </span>
  );
}
