import React from 'react';
import { getThemeColors } from '../data/categoryCatalog';
import { useWallet } from '../context/WalletContext';

export function BackgroundLayer() {
  const { settings, isDarkTheme } = useWallet();
  const colors = getThemeColors(settings.themeColor);
  const texture = settings.backgroundTexture;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-colors duration-500">
      {/* Base solid backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isDarkTheme ? '#0B132B' : '#F8FAFC',
        }}
      />

      {texture === 'AURORA' && (
        <div
          className="absolute inset-0 opacity-85"
          style={{
            background: isDarkTheme
              ? `radial-gradient(circle at 12% 14%, ${colors.primary}38 0%, transparent 48%), radial-gradient(circle at 86% 24%, ${colors.secondary}2C 0%, transparent 45%), radial-gradient(circle at 48% 85%, #3B82F622 0%, transparent 55%)`
              : `radial-gradient(circle at 14% 12%, ${colors.primary}22 0%, transparent 50%), radial-gradient(circle at 88% 22%, ${colors.secondary}26 0%, transparent 48%), radial-gradient(circle at 46% 88%, #E0E7FF99 0%, transparent 55%)`,
          }}
        />
      )}

      {texture === 'COLOUR_MESH' && (
        <div
          className="absolute inset-0"
          style={{
            background: isDarkTheme
              ? `radial-gradient(at 20% 20%, ${colors.primary}44 0, transparent 50%), radial-gradient(at 80% 10%, #8B5CF633 0, transparent 45%), radial-gradient(at 80% 80%, #10B9812A 0, transparent 50%)`
              : `radial-gradient(at 20% 20%, ${colors.primary}28 0, transparent 50%), radial-gradient(at 80% 15%, #DDD6FE88 0, transparent 45%), radial-gradient(at 75% 85%, #A7F3D066 0, transparent 50%)`,
          }}
        />
      )}

      {texture === 'WAVES' && (
        <svg className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 1200 900">
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.28" />
              <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <path d="M0,180 C300,90 600,270 1200,150 L1200,0 L0,0 Z" fill="url(#waveGrad1)" />
          <path d="M0,700 C380,620 820,780 1200,660 L1200,900 L0,900 Z" fill="url(#waveGrad1)" />
        </svg>
      )}

      {texture === 'DOTS' && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(${isDarkTheme ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.12)'} 1.3px, transparent 1.3px)`,
            backgroundSize: '22px 22px',
          }}
        />
      )}

      {texture === 'GRID' && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(to right, ${
              isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'
            } 1px, transparent 1px), linear-gradient(to bottom, ${
              isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'
            } 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      )}

      {texture === 'SILK_LINES' && (
        <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 1000 1000">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M -100 ${120 + i * 140} Q 350 ${40 + i * 120}, 1100 ${200 + i * 130}`}
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.5"
              strokeOpacity={0.35 - i * 0.04}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
