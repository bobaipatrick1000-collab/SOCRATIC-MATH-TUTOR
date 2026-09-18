import type { ContentCard, Difficulty, LadderLevel, Spine } from "../domain/types";
import { looksLikeLeak } from "../engine/guard";

const SPINES: ReadonlySet<string> = new Set<Spine>([
  "linear",
  "inequalities",
  "systems",
  "quadratics",
  "word-problems",
]);

const LADDER_LEVELS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5, 6]);

export interface ContentValidation {
  card: ContentCard | null;
  errors: string[];
  warnings: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function validateContentCard(input: unknown): ContentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return { card: null, errors: ["content card must be a JSON object"], warnings };
  }
  const o = input;

  if (typeof o.id !== "string" || !/^[A-Z]{2,}-[A-Z0-9]+-\d{3}$/.test(o.id)) {
    errors.push("id must match e.g. LIN-EQ-047");
  }
  if (o.spine !== undefined && !SPINES.has(String(o.spine))) {
    errors.push(`spine must be one of ${[...SPINES].join(", ")}`);
  } else if (o.spine === undefined) {
    errors.push("missing spine");
  }

  for (const field of ["stem", "stemLatex", "objective", "altText", "canonicalAnswer"]) {
    if (typeof o[field] !== "string") errors.push(`missing or non-string: ${field}`);
  }

  const difficulty = o.difficulty;
  if (typeof difficulty !== "number" || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    errors.push("difficulty must be an integer 1..5");
  }

  const wait = o.defaultWaitMs;
  if (typeof wait !== "number" || wait < 3000 || wait > 60000) {
    errors.push("defaultWaitMs must be a number within 3000..60000");
  }

  if (typeof o.calcAllowed !== "boolean") errors.push("calcAllowed must be a boolean");

  for (const field of ["prerequisites", "allowedPaths", "misconceptions", "substantiveAttemptRules", "transferItemIds"]) {
    if (!isStringArray(o[field])) errors.push(`${field} must be a string[]`);
  }

  if (isStringArray(o.allowedPaths) && o.allowedPaths.length < 2) {
    warnings.push("allowedPaths has fewer than 2 methods; multi-method recognition is a P0 expectation");
  }
  if (isStringArray(o.misconceptions) && o.misconceptions.length === 0) {
    warnings.push("no misconceptions listed");
  }
  if (isStringArray(o.substantiveAttemptRules) && o.substantiveAttemptRules.length === 0) {
    errors.push("at least one substantive-attempt rule is required (attempt lock depends on it)");
  }

  if (!Array.isArray(o.ladder) || o.ladder.length === 0) {
    errors.push("ladder must be a non-empty array");
  } else {
    let prevLevel = 0;
    let sawLevel1 = false;
    o.ladder.forEach((step, i) => {
      if (!isRecord(step)) {
        errors.push(`ladder[${i}] must be an object`);
        return;
      }
      const lvl = step.level;
      if (typeof lvl !== "number" || !LADDER_LEVELS.has(lvl)) {
        errors.push(`ladder[${i}].level must be 1..6`);
      } else {
        if (lvl === 1) sawLevel1 = true;
        if (lvl < prevLevel) warnings.push(`ladder levels not ascending at index ${i}`);
        prevLevel = lvl;
      }
      if (typeof step.intent !== "string" || step.intent.length === 0) {
        errors.push(`ladder[${i}].intent is required`);
      }
      if (typeof step.text !== "string" || step.text.length === 0) {
        errors.push(`ladder[${i}].text is required`);
      }
      if (step.source !== "authored" && step.source !== "model") {
        errors.push(`ladder[${i}].source must be "authored" or "model"`);
      }
      if (typeof step.text === "string") {
        const verdict = looksLikeLeak(step.text);
        if (verdict.leak) {
          errors.push(`ladder[${i}].text would leak an answer: ${verdict.reason}`);
        }
      }
    });
    if (!sawLevel1) {
      warnings.push("ladder has no level-1 (smallest) step");
    }
  }

  if (errors.length > 0) return { card: null, errors, warnings };
  return { card: o as unknown as ContentCard, errors, warnings };
}

export type { Difficulty, LadderLevel };