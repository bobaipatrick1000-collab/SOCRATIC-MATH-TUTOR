import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreTranscript, type TranscriptReport } from "./scorers";
import type { Transcript } from "../../src/lib/domain/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] ?? path.resolve(__dirname, "fixtures");

function loadTranscript(file: string): Transcript {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<Transcript>;
  if (!raw.id || !Array.isArray(raw.turns) || raw.turns.length === 0) {
    throw new Error(`Invalid transcript fixture: ${file}`);
  }
  return raw as Transcript;
}

function render(report: TranscriptReport): string {
  const lines: string[] = [];
  for (let i = 0; i < report.auto.length; i++) {
    const f = report.auto[i];
    for (const k of Object.keys(f) as Array<keyof typeof f>) {
      const v = f[k];
      if (v) lines.push(`    turn ${String(i).padStart(2)}  [${k}] ${v}`);
    }
  }
  for (const m of report.mismatches) {
    lines.push(
      `    turn ${String(m.turnIndex).padStart(2)}  [MISMATCH] expected=${m.expected} ${m.detail}`,
    );
  }
  return lines.length > 0 ? lines.join("\n") : "    (clean)";
}

const fixtureFiles = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (fixtureFiles.length === 0) {
  console.error(`No fixtures found in ${dir}`);
  process.exit(2);
}

const reports: TranscriptReport[] = fixtureFiles.map((f) =>
  scoreTranscript(loadTranscript(path.join(dir, f))),
);

const width = 44;
console.log("-".repeat(width));
console.log("Aurea eval harness v0 — transcript replay scorers");
console.log("-".repeat(width));

for (const r of reports) {
  console.log(`\n[${r.scenario.padEnd(8)}] ${r.id}`);
  console.log(
    `    leaks=${r.leaksDetected} premature=${r.prematureDetected} late=${r.lateDetected} wrongLevel=${r.wrongLevelDetected}`,
  );
  console.log(render(r));
  console.log(`    verdict: ${r.pass ? "PASS" : "FAIL"}`);
}

console.log("-".repeat(width));
const failed = reports.filter((r) => !r.pass);
console.log(`\n${reports.length - failed.length}/${reports.length} transcripts passed.`);
if (failed.length > 0) {
  console.log(`Failed: ${failed.map((r) => r.id).join(", ")}`);
  process.exit(1);
}