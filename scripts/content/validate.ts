import path from "node:path";
import { defaultContentDir, loadCards } from "./load";

const dir = process.argv[2] ?? defaultContentDir();
const cards = loadCards(dir);

if (cards.length === 0) {
  console.error(`No content cards found in ${dir}`);
  process.exit(2);
}

let errorCount = 0;
let warningCount = 0;

for (const { file, card, errors, warnings } of cards) {
  const rel = path.relative(process.cwd(), file);
  const label = card?.id ?? path.basename(file);
  if (errors.length === 0) {
    console.log(`PASS  ${label}  (${rel})`);
  } else {
    console.log(`FAIL  ${label}  (${rel})`);
  }
  for (const e of errors) {
    errorCount += 1;
    console.log(`        error: ${e}`);
  }
  for (const w of warnings) {
    warningCount += 1;
    console.log(`        warn:  ${w}`);
  }
}

console.log(
  `\n${cards.length} cards, ${errorCount} errors, ${warningCount} warnings.`,
);
if (errorCount > 0) process.exit(1);