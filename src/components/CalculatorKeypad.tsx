import React from 'react';
import { Delete, Check } from 'lucide-react';
import { evaluateExpression, formatCalculatorDisplay } from '../utils/calculator';
import type { AppLanguage } from '../types/models';

export function CalculatorKeypad({
  expression,
  onChange,
  onDone,
  currencySymbol,
  language,
}: {
  expression: string;
  onChange: (next: string) => void;
  onDone: () => void;
  currencySymbol: string;
  language: AppLanguage;
}) {
  const evaluated = evaluateExpression(expression);
  const hasOperator = /[+\-×÷*/%]/.test(expression.slice(1));

  const appendChar = (ch: string) => {
    const operators = ['+', '-', '×', '÷'];
    if (operators.includes(ch)) {
      if (!expression) return;
      const last = expression.slice(-1);
      if (operators.includes(last)) {
        onChange(expression.slice(0, -1) + ch);
        return;
      }
    }
    if (ch === '.') {
      const parts = expression.split(/[+\-×÷]/);
      if (parts[parts.length - 1]?.includes('.')) return;
      if (!expression || operators.includes(expression.slice(-1))) {
        onChange(expression + '0.');
        return;
      }
    }
    onChange(expression + ch);
  };

  const handleEqual = () => {
    if (!expression) return;
    onChange(formatCalculatorDisplay(evaluated));
  };

  const keys: Array<Array<{ label: string; action: () => void; variant?: 'op' | 'accent' | 'muted' }>> = [
    [
      { label: 'C', action: () => onChange(''), variant: 'muted' },
      { label: '÷', action: () => appendChar('÷'), variant: 'op' },
      { label: '×', action: () => appendChar('×'), variant: 'op' },
      { label: '⌫', action: () => onChange(expression.slice(0, -1)), variant: 'muted' },
    ],
    [
      { label: '7', action: () => appendChar('7') },
      { label: '8', action: () => appendChar('8') },
      { label: '9', action: () => appendChar('9') },
      { label: '-', action: () => appendChar('-'), variant: 'op' },
    ],
    [
      { label: '4', action: () => appendChar('4') },
      { label: '5', action: () => appendChar('5') },
      { label: '6', action: () => appendChar('6') },
      { label: '+', action: () => appendChar('+'), variant: 'op' },
    ],
    [
      { label: '1', action: () => appendChar('1') },
      { label: '2', action: () => appendChar('2') },
      { label: '3', action: () => appendChar('3') },
      { label: '%', action: () => appendChar('%'), variant: 'op' },
    ],
    [
      { label: '00', action: () => appendChar('00') },
      { label: '0', action: () => appendChar('0') },
      { label: '.', action: () => appendChar('.') },
      {
        label: hasOperator ? '=' : 'OK',
        action: hasOperator ? handleEqual : onDone,
        variant: 'accent',
      },
    ],
  ];

  return (
    <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 p-3 shadow-xl">
      <div className="flex items-center justify-between px-2 pb-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {language === 'BANGLA' ? 'হিসাব:' : 'Preview:'}{' '}
          <strong className="font-mono-num text-slate-900 dark:text-white">
            {currencySymbol}
            {formatCalculatorDisplay(evaluated)}
          </strong>
        </span>
        <button
          type="button"
          onClick={onDone}
          className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1"
        >
          <Check size={14} /> {language === 'BANGLA' ? 'সম্পন্ন' : 'Done'}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.flat().map((k, idx) => (
          <button
            key={idx}
            type="button"
            onClick={k.action}
            className={`h-12 rounded-2xl text-base font-bold transition active:scale-95 flex items-center justify-center ${
              k.variant === 'accent'
                ? 'bg-sky-600 text-white hover:bg-sky-700'
                : k.variant === 'op'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25'
                : k.variant === 'muted'
                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {k.label === '⌫' ? <Delete size={18} /> : k.label}
          </button>
        ))}
      </div>
    </div>
  );
}
