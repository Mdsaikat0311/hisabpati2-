/**
 * In-app financial expression evaluator supporting +, -, ×, ÷, and % semantics
 * (e.g. "100+10%" -> 110, "500-20%" -> 400, "25%" -> 0.25).
 */
export function evaluateExpression(rawExpr: string): number {
  const expr = rawExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '')
    .trim();

  if (!expr) return 0;

  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) return 0;
    const result = evaluateTokens(tokens);
    return Number.isFinite(result) ? result : 0;
  } catch {
    const fallback = Number(expr);
    return Number.isFinite(fallback) ? fallback : 0;
  }
}

type Token = { type: 'num'; value: number; isPercent?: boolean } | { type: 'op'; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') {
      i++;
      continue;
    }
    if (
      (ch >= '0' && ch <= '9') ||
      ch === '.' ||
      (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'op'))
    ) {
      let numStr = ch;
      i++;
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
        numStr += expr[i];
        i++;
      }
      let isPercent = false;
      if (i < expr.length && expr[i] === '%') {
        isPercent = true;
        i++;
      }
      const val = parseFloat(numStr);
      if (!Number.isNaN(val)) {
        tokens.push({ type: 'num', value: val, isPercent });
      }
      continue;
    }
    if (['+', '-', '*', '/'].includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

function evaluateTokens(tokens: Token[]): number {
  // Resolve standalone percentages or multiplicative percentages first, and additive/subtractive percentages
  if (tokens.length === 1 && tokens[0].type === 'num') {
    return tokens[0].isPercent ? tokens[0].value / 100 : tokens[0].value;
  }

  // Strip trailing operator
  const clean = [...tokens];
  if (clean.length > 0 && clean[clean.length - 1].type === 'op') {
    clean.pop();
  }
  if (clean.length === 0) return 0;

  // Evaluate left-to-right with standard precedence (*,/ before +,-), respecting "base +/- p%"
  const values: number[] = [];
  const ops: string[] = [];

  const applyTopOp = () => {
    const op = ops.pop();
    const right = values.pop() ?? 0;
    const left = values.pop() ?? 0;
    if (op === '+') values.push(left + right);
    else if (op === '-') values.push(left - right);
    else if (op === '*') values.push(left * right);
    else if (op === '/') values.push(right === 0 ? 0 : left / right);
  };

  for (let i = 0; i < clean.length; i++) {
    const t = clean[i];
    if (t.type === 'num') {
      if (t.isPercent) {
        const lastOp = ops[ops.length - 1];
        if ((lastOp === '+' || lastOp === '-') && values.length >= 1) {
          const base = values[values.length - 1];
          values.push((base * t.value) / 100);
        } else {
          values.push(t.value / 100);
        }
      } else {
        values.push(t.value);
      }
    } else {
      const prec = (op: string) => (op === '*' || op === '/' ? 2 : 1);
      while (ops.length > 0 && prec(ops[ops.length - 1]) >= prec(t.value)) {
        applyTopOp();
      }
      ops.push(t.value);
    }
  }

  while (ops.length > 0) {
    applyTopOp();
  }

  return values[0] ?? 0;
}

export function formatCalculatorDisplay(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const rounded = Math.round(val * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
}
