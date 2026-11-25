import React, { useState } from 'react';
import { ShieldCheck, Globe, Loader2, ArrowRight } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { t } from '../data/appStrings';

export function AuthScreen() {
  const { settings, updateSettings, signInWithGoogle, enterGuestMode } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      setErrorMsg(
        isBn
          ? `সাইন-ইন করা যায়নি: ${msg}`
          : `Could not sign in with Google: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between">
      {/* Welcome screen artistic backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: "url('/assets/bg_welcome_screen.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/55 to-slate-950/90 backdrop-blur-[2px]" />

      {/* Top Bar: Language Toggle */}
      <div className="relative z-10 max-w-md w-full mx-auto px-5 pt-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>{isBn ? 'নিরাপদ ব্যক্তিগত ওয়ালেট' : 'Offline-First & Encrypted'}</span>
        </div>
        <button
          type="button"
          onClick={() =>
            updateSettings({ language: isBn ? 'ENGLISH' : 'BANGLA' })
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition"
        >
          <Globe size={13} />
          <span>{isBn ? 'EN' : 'বাংলা'}</span>
        </button>
      </div>

      {/* Center Hero Card */}
      <div className="relative z-10 max-w-md w-full mx-auto px-5 my-auto py-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-3 shadow-2xl flex items-center justify-center mb-5">
          <img
            src="/assets/ic_app_logo.png"
            alt={t('app_name', settings.language)}
            className="w-full h-full object-contain rounded-2xl"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {t('app_name', settings.language)}
        </h1>
        <p className="text-sm sm:text-base text-sky-200 font-medium mt-1.5">
          {t('app_tagline', settings.language)}
        </p>

        <div className="w-full mt-8 rounded-[26px] bg-white/12 backdrop-blur-2xl border border-white/20 p-5 shadow-2xl space-y-3.5 text-left">
          <div className="space-y-1 text-center pb-1">
            <h2 className="text-base font-bold text-white">
              {isBn ? 'স্বাগতম! শুরু করুন' : 'Welcome to Hishab Pati'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isBn
                ? 'ক্লাউড ব্যাকআপ ও সিঙ্কের জন্য গুগল দিয়ে সাইন ইন করুন অথবা সরাসরি অফলাইনে ব্যবহার করুন।'
                : 'Sign in with Google for automatic cloud backup & real-time sync, or continue offline right away.'}
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-500/20 border border-red-400/40 px-3 py-2 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGoogleSignIn()}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm shadow-lg flex items-center justify-center gap-3 transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin text-sky-600" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            <span>{t('sign_in_google', settings.language)}</span>
          </button>

          <button
            type="button"
            onClick={enterGuestMode}
            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>
              {isBn
                ? 'এখনই এড়িয়ে যান • লগইন ছাড়াই ব্যবহার করুন'
                : 'Skip for now • Use without login'}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Developer Footer Credit */}
      <footer className="relative z-10 max-w-md w-full mx-auto px-5 pb-6 text-center space-y-0.5">
        <p className="text-[11px] text-slate-300 font-medium">
          {t('app_footer', settings.language)}
        </p>
        <p className="text-[11px] text-slate-400">
          {t('developer', settings.language)}: <span className="text-white/90 font-semibold">{t('app_developer', settings.language)}</span>
        </p>
      </footer>
    </div>
  );
}
