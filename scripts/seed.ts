import { loadCards, defaultContentDir } from "./content/load";
import {
  appendEvent,
  countContentItems,
  createSession,
  listSessionEvents,
  upsertContentItem,
} from "../src/lib/server/store/store";
import { DB_PATH } from "../src/lib/server/store/db";

const dir = process.argv[2] ?? defaultContentDir();
const cards = loadCards(dir);

let errorCount = 0;
for (const { file, card, errors } of cards) {
  if (card) {
    upsertContentItem(card);
  } else {
    errorCount += errors.length;
    console.error(`${file}: ${errors.join("; ")}`);
  }
}

if (errorCount > 0) {
  console.error(`${errorCount} validation error(s) — nothing seeded.`);
  process.exit(1);
}

console.log(`Seeded ${cards.length} content cards into ${DB_PATH}`);

const storeCheck = (() => {
  const sessionId = "SELF-CHECK-001";
  createSession(sessionId, "seed", "LIN-EQ-047", Date.now());
  appendEvent({
    id: `E-SELF-${Date.now()}`,
    sessionId,
    t: 0,
    type: "line_commit",
    payload: { official: true, latex: "3(x-2)+5=2x+8", astHash: null, moveTag: null, eqPrev: "neutral" },
  });
  const events = listSessionEvents(sessionId);
  return events.length >= 1;
})();

if (!storeCheck) throw new Error("store round-trip failed");

console.log(`Store round-trip OK (session events readable). Items in DB: ${countContentItems()}`);