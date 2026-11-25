import React from 'react';
import { Wifi, Landmark, Smartphone, Banknote, CreditCard } from 'lucide-react';
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
  compact = false,
  className = '',
}: {
  account: AccountEntity;
  currencySymbol: string;
  language: AppLanguage;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}) {
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

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-[22px] text-white select-none ${
        compact ? 'p-4 min-h-[146px]' : 'p-5 min-h-[178px]'
      } ${onClick ? 'cursor-pointer active:scale-[0.985] transition-transform' : ''} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${baseHex} 0%, ${hexToRgba(baseHex, 0.85)} 55%, #0F172A 125%)`,
        boxShadow: `0 14px 32px -10px ${hexToRgba(baseHex, 0.52)}`,
      }}
    >
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
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] uppercase tracking-wider font-bold text-white/80">
              {isCredit
                ? t('credit_card_label', language)
                : isMfs
                ? t('mobile_wallet', language)
                : isCash
                ? t('cash_in_hand', language)
                : meta.subtype || t('debit_card_label', language)}
            </span>
            {account.accountNumberLast4 && (
              <span className="text-[10.5px] font-mono-num text-white/75">
                ••{account.accountNumberLast4}
              </span>
            )}
          </div>
          <h3 className="text-[15.5px] font-bold tracking-tight truncate mt-0.5">
            {account.name}
          </h3>
          {account.institution && !isCash && (
            <p className="text-[11px] text-white/75 truncate">{account.institution}</p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {isMfs && mfsLogo ? (
            <img src={mfsLogo} alt={account.institution || account.name} className="h-7 w-auto object-contain rounded" />
          ) : netLogo ? (
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

      {/* Middle Hardware Row (EMV + NFC ONLY for Debit/Credit) */}
      {(isCredit || isBank) && !compact && (
        <div className="relative z-10 flex items-center gap-2.5 mt-3">
          <EmvChipSvg style={isCredit ? 'GOLD' : 'SILVER_GOLD'} />
          <Wifi size={16} className="rotate-90 text-white/70" />
          {isCredit && (
            <span className="ml-auto w-7 h-4 rounded bg-gradient-to-br from-cyan-200/70 via-pink-200/50 to-amber-200/70 border border-white/40" />
          )}
        </div>
      )}

      {/* Bottom Row: Balance & Credit Limit Progress */}
      <div className={`relative z-10 ${compact ? 'mt-4' : 'mt-5'} flex items-end justify-between gap-2`}>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/75">
            {isCredit ? t('outstanding_caps', language) : t('balance_caps', language)}
          </p>
          <p className={`${compact ? 'text-[20px]' : 'text-[23px]'} font-extrabold font-mono-num leading-tight mt-0.5`}>
            {formatCurrency(displayBalance, currencySymbol, language)}
          </p>
        </div>

        {isCredit && account.creditLimit > 0 && (
          <div className="text-right min-w-[100px]">
            <p className="text-[10px] text-white/80 font-medium">
              {Math.round(utilization)}% • {formatCurrency(account.creditLimit, currencySymbol, language)}
            </p>
            <div className="w-24 h-1.5 rounded-full bg-white/25 overflow-hidden mt-1 ml-auto">
              <div
                className={`h-full rounded-full ${utilization > 80 ? 'bg-red-300' : 'bg-white'}`}
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        )}
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
