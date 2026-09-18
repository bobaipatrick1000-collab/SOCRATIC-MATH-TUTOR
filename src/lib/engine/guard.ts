/**
 * Answer-leak guard.
 *
 * Every outbound tutor sentence must pass this before it is trusted.
 * It is intentionally conservative: a false positive costs one rewording,
 * a false negative costs the product's core promise.
 *
 * Used by: the generation pipeline, the eval harness, and the content
 * validator (authored ladder text must never leak either).
 */

export interface LeakVerdict {
  leak: boolean;
  reason?: string;
}

const ANSWER_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  {
    re: /\bx\s*=\s*[-+]?\s*\d+\s*(?:,\s*[xy]\s*=\s*[-+]?\s*\d+)*\s*$/im,
    reason: "final result of the form x = <number>",
  },
  {
    re: /\b(?:the answer is|the solution is|answer is|correct answer|final answer)\b/i,
    reason: "answer-revealing phrase",
  },
  {
    re: /\b(?:here'?s?\s+the\s+(?:full|complete|whole)\s+solution)\b/i,
    reason: "full solution marker",
  },
];

function chainDumpReason(text: string): string | undefined {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const mathLines = lines.filter((l) => /=/.test(l) && /[a-zA-Z]/.test(l));
  if (mathLines.length >= 3) {
    const last = mathLines[mathLines.length - 1];
    if (/[a-zA-Z]\s*=\s*[-+]?\s*\d+\s*$/.test(last)) {
      return `chain dump of ${mathLines.length} transformation lines ending in a result`;
    }
  }
  return undefined;
}

export function looksLikeLeak(text: string): LeakVerdict {
  const normalized = text.trim();
  for (const { re, reason } of ANSWER_PATTERNS) {
    if (re.test(normalized)) return { leak: true, reason };
  }
  const chain = chainDumpReason(normalized);
  if (chain) return { leak: true, reason: chain };
  return { leak: false };
}