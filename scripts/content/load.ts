import fs from "node:fs";
import path from "node:path";
import { validateContentCard } from "../../src/lib/content/validate";
import type { ContentCard } from "../../src/lib/domain/types";

export interface LoadedCard {
  file: string;
  card: ContentCard | null;
  errors: string[];
  warnings: string[];
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function defaultContentDir(): string {
  return path.resolve(process.cwd(), "content");
}

export function loadCards(dir: string = defaultContentDir()): LoadedCard[] {
  if (!fs.existsSync(dir)) return [];
  return walk(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      let input: unknown;
      try {
        input = JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (e) {
        return {
          file,
          card: null,
          errors: [`invalid JSON: ${(e as Error).message}`],
          warnings: [],
        };
      }
      const result = validateContentCard(input);
      return { file, ...result };
    });
}