import React, { useMemo, useState } from 'react';
import { FileText, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { parseReceiptText, type ParsedReceiptData } from '../utils/parsers';
import { formatCurrency } from '../utils/formatters';

export function ReceiptReviewDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    amount: number;
    merchantName: string;
    categoryName: string;
    subcategoryName: string;
    accountId: string | null;
    dateMillis: number | null;
  }) => void;
}) {
  const { accounts, categories, settings } = useWallet();
  const isBn = settings.language === 'BANGLA';
  const [receiptText, setReceiptText] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const parsed: ParsedReceiptData = useMemo(
    () => parseReceiptText(receiptText, accounts, categories),
    [accounts, categories, receiptText]
  );

  if (!open) return null;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const finalAmount =
    parseFloat(customAmount) ||
    parsed.totalAmount ||
    parsed.candidateAmounts[0]?.amount ||
    0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isBn ? 'রসিদ পার্সার ও রিভিউ' : 'Receipt Review & Parser'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn ? 'রসিদের টেক্সট পেস্ট করুন অথবা ছবি সংযুক্ত করুন' : 'Paste receipt text or attach receipt image to verify totals'}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20">
              {isBn ? 'রসিদের ছবি সংযুক্ত করুন' : 'Attach Receipt Image'}
              <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() =>
                setReceiptText(
                  'Spice Garden Cafe\nDate: 2026-11-24\nSubtotal: 1450.00\nVAT 15%: 217.50\nGrand Total: 1667.50\nPaid via bKash'
                )
              }
              className="text-xs text-slate-500 hover:text-sky-600"
            >
              {isBn ? 'উদাহরণ রসিদ লোড করুন' : 'Load sample receipt'}
            </button>
          </div>

          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="Receipt preview"
              className="w-full max-h-40 object-contain rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800"
            />
          )}

          <textarea
            rows={5}
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder={
              isBn
                ? 'রসিদের লেখা এখানে পেস্ট করুন (যেমন: Grand Total: 1250.00)...'
                : 'Paste receipt text here (e.g. Grand Total: 1250.00)...'
            }
            className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-sky-500"
          />

          {parsed.hasText && (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/10 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-bold">
                {parsed.isAmountAmbiguous ? (
                  <AlertTriangle size={15} className="text-amber-500" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-500" />
                )}
                <span>
                  {parsed.matchedTotalLabel
                    ? `${parsed.matchedTotalLabel}: ${formatCurrency(
                        parsed.totalAmount ?? 0,
                        settings.currencySymbol,
                        settings.language
                      )}`
                    : isBn
                    ? 'মোট পরিমাণ নিশ্চিত করুন'
                    : 'Confirm total amount'}
                </span>
              </div>

              {parsed.candidateAmounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parsed.candidateAmounts.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomAmount(String(c.amount))}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${
                        Number(customAmount || parsed.totalAmount) === c.amount
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {c.label}: {formatCurrency(c.amount, settings.currencySymbol, settings.language)}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">{isBn ? 'দোকান / শিরোনাম' : 'Merchant'}</span>
                  <span className="font-semibold">{parsed.merchantName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isBn ? 'ক্যাটাগরি' : 'Category'}</span>
                  <span className="font-semibold">{parsed.suggestedCategory || '-'}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              {isBn ? 'চূড়ান্ত টাকার পরিমাণ' : 'Confirmed Total Amount'}
            </label>
            <input
              type="number"
              value={customAmount || (parsed.totalAmount ?? '')}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm font-bold font-mono-num text-slate-900 dark:text-white outline-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-white/10 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={finalAmount <= 0}
            onClick={() => {
              onConfirm({
                amount: finalAmount,
                merchantName: parsed.merchantName || 'Receipt Expense',
                categoryName: parsed.suggestedCategory || 'Other Expenses',
                subcategoryName: parsed.suggestedSubcategory || '',
                accountId: parsed.suggestedAccountId,
                dateMillis: parsed.dateMillis,
              });
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 disabled:opacity-40 text-white text-sm font-bold"
          >
            {isBn ? 'লেনদেনে প্রয়োগ করুন' : 'Use Receipt Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
