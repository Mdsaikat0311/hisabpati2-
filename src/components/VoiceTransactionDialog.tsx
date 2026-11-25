import React, { useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { parseVoiceTransaction, type ParsedVoiceTransaction } from '../utils/parsers';
import { formatCurrency } from '../utils/formatters';

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function VoiceTransactionDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (parsed: ParsedVoiceTransaction) => void;
}) {
  const { accounts, categories, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  const parsed = useMemo(
    () => parseVoiceTransaction(text, accounts, categories),
    [accounts, categories, text]
  );

  if (!open) return null;

  const toggleMic = () => {
    setMicError(null);
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicError(
        isBn
          ? 'এই ব্রাউজারে স্পিচ রেকগনিশন নেই। নিচে টেক্সট লিখুন।'
          : 'Browser speech recognition unavailable here. Type or paste your phrase below.'
      );
      return;
    }

    const rec = new SpeechRec();
    rec.lang = isBn ? 'bn-BD' : 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let transcript = '';
      for (let i = 0; i < ev.results.length; i++) {
        transcript += ev.results[i][0].transcript + ' ';
      }
      setText(transcript.trim());
    };
    rec.onerror = () => {
      setListening(false);
      setMicError(isBn ? 'মাইক্রোফোন অ্যাক্সেস পাওয়া যায়নি।' : 'Microphone unavailable. Enter phrase manually.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const examples = [
    'Lunch 250 from bKash',
    'বিকাশে ৫০০ টাকা বাজার',
    'Salary 75000 received',
    'Uber 180 Cash',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'ভয়েস / স্মার্ট এন্ট্রি' : 'Voice & Smart Entry'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn ? 'বাংলা, ইংরেজি বা বাংলিশে বলুন বা লিখুন' : 'Supports English, Bangla & Banglish'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition ${
              listening ? 'bg-red-500 animate-pulse' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {listening ? <MicOff size={26} /> : <Mic size={26} />}
          </button>
        </div>

        {micError && <p className="text-xs text-amber-600 dark:text-amber-400 text-center">{micError}</p>}

        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isBn ? 'যেমন: বিকাশে ২২০ টাকা কফি...' : 'e.g. Coffee 220 from bKash'}
          className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500"
        />

        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600"
            >
              {ex}
            </button>
          ))}
        </div>

        {text.trim() && (
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/10 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'ধরণ:' : 'Type:'}</span>
              <span className="font-bold">{parsed.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'পরিমাণ:' : 'Amount:'}</span>
              <span className="font-bold font-mono-num">
                {parsed.hasConfidentAmount
                  ? formatCurrency(parsed.amount, settings.currencySymbol, settings.language)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'ক্যাটাগরি:' : 'Category:'}</span>
              <span className="font-bold">{parsed.categoryName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'বিবরণ:' : 'Title:'}</span>
              <span className="font-bold">{parsed.description || '-'}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => {
              onApply(parsed);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 disabled:opacity-40 text-white text-sm font-bold"
          >
            {isBn ? 'ফর্মে প্রয়োগ করুন' : 'Apply to Form'}
          </button>
        </div>
      </div>
    </div>
  );
}
