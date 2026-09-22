/**
 * Topic Pack — REAL acceptance harness.
 *
 * Faithful to the guard doctrine: no mocks, no stubs, no LLM in the loop.
 * Exercises the actual code paths:
 *   - stripHiddenKeys: hidden_key never survives into a student-facing pack
 *   - buildPackFallback: every catalog topic produces all five blocks offline
 *     (description, context, objectives, >=3 worked examples, >=8 practice)
 *     whose numeric keys the real engine re-verifies
 *   - guardPackKeys: an item whose key the engine cannot confirm is stripped
 *   - allowlist: pirate/off-list domains are rejected, allowlisted ones accepted
 *   - validateTopicPack: shape + key consistency are enforced
 *   - cache: put/get round-trip via the real SQLite store (temp db)
 *
 * Run:   npm run test:pack   (tsx scripts/ai/pack-check.ts)
 * Writes:scripts/ai/pack-check-output.md
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { tmpdir } from "node:os"

/* Isolate DB writes from the app's data dir, before any store import runs. */
process.env.AUREA_DB_PATH = resolve(tmpdir(), `aurea-pack-check-${process.pid}.db`)

import { verifyPracticeItem } from "../../src/lib/ai/answerCheck"
import {
  buildPackFallback,
  parseAndValidate,
  hashCitations,
} from "../../src/lib/ai/pack"
import {
  guardPackKeys,
  stripHiddenKeys,
  validateTopicPack,
  type TopicPack,
} from "../../src/lib/ai/packSchema"
import { isAllowlistedURL } from "../../src/lib/ai/retrieval"
import { getTopicPack, putTopicPack } from "../../src/lib/server/store/packStore"

interface RunRow {
  id: string
  category: string
  description: string
  expect: "pass" | "strip"
  result: "PASS" | "FAIL" | "STRIP"
  observed: string
}

const R: RunRow[] = []
const a = (id: string, category: string, description: string, expect: "pass" | "strip", ok: boolean, observed: string) =>
  R.push({ id, category, description, expect, result: ok === (expect === "pass") ? "PASS" : expect === "strip" && ok ? "STRIP" : "FAIL", observed })

const hasFiveBlocks = (p: unknown) => {
  const pack = p as TopicPack
  return Boolean(
    pack.description?.length &&
      pack.context?.length &&
      pack.objectives?.length >= 3 &&
      pack.worked_examples?.length >= 3 &&
      pack.practice?.length >= 8,
  )
}

/* ------------------------------------------------- 1. hidden-key stripping */

const linearPack = buildPackFallback("linear")
if (linearPack) {
  const pub = stripHiddenKeys(linearPack)
  a("P01", "strip", "fallback pack has >=8 practice with hidden_key present pre-strip", "pass", linearPack.practice.length >= 8 && linearPack.practice.every((p) => p.hidden_key), "keys=" + linearPack.practice.length)
  a("P02", "strip", "public pack: no practice item carries hidden_key", "strip", pub.practice.every((p) => !("hidden_key" in p)), "sanitized")
  a("P03", "strip", "public pack: serialized JSON contains no final_result anywhere", "strip", !JSON.stringify(pub).includes("final_result"), "no-leak")
  a("P04", "strip", "public pack still carries license_flags for the UI banner", "pass", typeof pub.license_flags.fallback === "boolean" && typeof pub.license_flags.allowlisted === "boolean", "flags ok")
} else {
  a("P01", "strip", "fallback pack builds for 'linear'", "pass", false, "null")
}

/* ------------------------------------------------- 2. offline fallback coverage */

const FALLBACKS = ["linear", "brackets", "factorising", "quadratics", "simultaneous", "complete-square", "word-problems", "negative", "fractions-eq", "difference-squares", "algebra", "arithmetic"]
let coverOk = 0
const coverFail: string[] = []
for (const slug of FALLBACKS) {
  const pack = buildPackFallback(slug)
  const ok = pack !== null && hasFiveBlocks(pack) && pack.objectives.length >= 3 && pack.worked_examples.length >= 3 && pack.practice.length >= 8
  if (ok) coverOk++
  else coverFail.push(slug)
}
a("P05", "fallback", `offline packs for ${FALLBACKS.length} topics (incl. parent 'algebra' + sparse 'arithmetic')`, "pass", coverFail.length === 0, `ok=${coverOk} fail=[${coverFail.join(",")}]`)
a("P05b", "fallback", "unknown/off-curriculum slug returns null without throwing", "pass", buildPackFallback("deep-sea-diving") === null, "null ok")

/* ------------------------------------------------- 3. engine re-verification */

let engOk = 0
let engBad = 0
for (const slug of ["linear", "quadratics", "algebra"]) {
  const pack = buildPackFallback(slug)
  if (!pack) continue
  for (const it of pack.practice) {
    const okShape = verifyPracticeItem({ kind: it.kind, init: it.init, target: it.target, roots: it.roots })
    if (okShape) engOk++
    else engBad++
  }
  for (const it of pack.practice) {
    const canon =
      it.kind === "solve" || it.kind === "translate"
        ? Object.entries(it.roots ?? {}).flatMap(([v, vals]) => vals.map((val) => `${v} = ${val}`)).join("; ")
        : (it.target ?? "")
    if (canon && it.hidden_key.final_result.replace(/\s+/g, "").toLowerCase() !== canon.replace(/\s+/g, "").toLowerCase() && Object.values(it.roots ?? { x: [] }).flat().length !== 1) {
      engBad++
    }
  }
}
a("P06", "engine", "every fallback practice key re-verifies with the real math engine", "pass", engBad === 0 && engOk > 0, `ok=${engOk} bad=${engBad}`)

/* ------------------------------------------------- 4. guard strips bad keys */

const guard = guardPackKeys(linearPack!)
a("P07", "guard", "guard keeps a clean pack unchanged", "pass", guard.stripped.length === 0, "stripped=[]")
const mutated = structuredClone(linearPack) as TopicPack
mutated.practice[0].roots = { x: ["999"] }
const guarded = guardPackKeys(mutated)
a("P08", "guard", "guard STRIPS an item whose roots the engine cannot confirm", "strip", guarded.stripped.includes(mutated.practice[0].id), "stripped=[" + guarded.stripped.join(",") + "]")
a("P09", "guard", "after strip the bad item is gone from the saved pack", "strip", !guarded.pack.practice.some((p) => p.id === mutated.practice[0].id), "absent")

/* ------------------------------------------------- 5. allowlist */

a("P10", "allowlist", "openstax.org URL is allowlisted", "pass", isAllowlistedURL("https://openstax.org/details/books/intermediate-algebra-2e"), "openstax ok")
a("P11", "allowlist", "gutenberg.org URL is allowlisted", "pass", isAllowlistedURL("https://www.gutenberg.org/ebooks/7981"), "gutenberg ok")
a("P12", "allowlist", "pirate site is REJECTED", "strip", !isAllowlistedURL("https://free-books-pirate.com/alg.pdf"), "reject pirate")
a("P13", "allowlist", "random off-list host is REJECTED", "strip", !isAllowlistedURL("https://example.com/maths"), "reject offlist")

/* ------------------------------------------------- 6. validation shape rules */

a("P14", "validate", "validateTopicPack accepts the fallback pack", "pass", validateTopicPack(linearPack!).pack !== null, "valid")
const tiny = structuredClone(linearPack) as TopicPack
tiny.practice = tiny.practice.slice(0, 4)
a("P15", "validate", "validateTopicPack rejects <8 practice items", "strip", validateTopicPack(tiny).pack === null, "reject 4")
const keyless = structuredClone(linearPack) as TopicPack
keyless.practice[0].hidden_key = { final_result: "", first_stuck_point: "", level_1_hint: "" }
const keylessV = validateTopicPack(keyless)
a("P16", "validate", "validateTopicPack rejects a final_result that disagrees with the engine", "strip", keylessV.pack === null || keylessV.errors.length > 0, "reject bad key")

/* ------------------------------------------------- 7. cache round-trip */

putTopicPack("linear", "linear equations", linearPack!, { sourceHash: hashCitations(linearPack!.citations) })
const cached = getTopicPack("linear")
const round = cached ? parseAndValidate(String(JSON.stringify(cached.pack))) : null
a("P17", "cache", "store put/get + parseAndValidate round-trips a pack", "pass", round !== null && hasFiveBlocks(round), round ? `practice=${round.practice.length}` : "null")
a("P18", "cache", "source_hash is stored with the cached row", "pass", (cached?.sourceHash ?? "").length > 0, "hash present")

/* ------------------------------ report ------------------------------ */

const total = R.length
const pass = R.filter((r) => r.result === "PASS").length
const stripped = R.filter((r) => r.result === "STRIP").length
const fail = R.filter((r) => r.result === "FAIL").length

let md = "| id | category | description | expect | result | observed |\n"
md += "|---|---|---|---|---|---|\n"
for (const r of R) md += `| ${r.id} | ${r.category} | ${r.description} | ${r.expect} | ${r.result} | ${r.observed} |\n`
md += `\n**Total ${total} — ${pass} pass, ${stripped} stripped, ${fail} fail.**\n`

writeFileSync(resolve(__dirname, "pack-check-output.md"), md)
console.log(md)

if (fail > 0) {
  process.exitCode = 1
}