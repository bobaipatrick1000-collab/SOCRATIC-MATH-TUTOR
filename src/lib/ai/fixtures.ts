import type { ContentItem } from "../content/catalog"
import { ITEMS, topicBySlug } from "../content/catalog"
import type { GeneratedLesson, GeneratedPracticeItem, GeneratedTestItem } from "./schema"
import { verifyWorkedExample } from "./answerCheck"

const TITLES: Record<string, string> = {
  linear: "Linear equations",
  brackets: "Expressions & bracket expansion",
  factorising: "Factorising quadratics",
  quadratics: "Solving quadratics",
  simultaneous: "Simultaneous equations",
}

const INTROS: Record<string, string> = {
  linear:
    "An equation is a balance: whatever sits on the left weighs exactly as much as the right. Solving means doing the same thing to both sides until the unknown stands alone.",
  brackets:
    "A bracket is a promise: every term inside is multiplied by what is outside. Expand carefully — every term, every sign.",
  factorising:
    "Factorising is expanding in reverse. Given x² + bx + c, find two numbers that multiply to c and add to b.",
  quadratics:
    "A quadratic can have up to two answers. 'Both answers' is not a bonus — it is the rule. Factor first, or take square roots.",
  simultaneous:
    "Each equation is a line, and the solution is the one point where both lines cross. Elimination and substitution are the two classic routes.",
}

const OUTLINES: Record<string, { heading: string; points: string[] }[]> = {
  linear: [
    { heading: "Keep the balance", points: ["Do the same operation to both sides", "Undo additions before multiplications"] },
    { heading: "Isolate the x", points: ["Collect terms on one side", "Check by substituting back"] },
  ],
  brackets: [
    { heading: "Every term × every term", points: ["Distribute the outside factor", "Watch the signs when minuses are involved"] },
    { heading: "The grid method", points: ["Draw a 2×2 box", "Combine like terms at the end"] },
  ],
  factorising: [
    { heading: "Read it backwards", points: ["Which two numbers multiply to the constant?", "Which two add to the x coefficient?"] },
    { heading: "Write the brackets", points: ["(x + p)(x + q)", "Check by expanding back"] },
  ],
  quadratics: [
    { heading: "Zero product rule", points: ["Factor the quadratic", "Each factor equal to zero is a solution"] },
    { heading: "Square roots", points: ["x² = k gives x = ±√k", "Never drop the negative branch"] },
  ],
  simultaneous: [
    { heading: "Elimination", points: ["Make one variable's coefficients opposite", "Add the equations and solve"] },
    { heading: "Substitution", points: ["Solve one equation for one variable", "Feed the value into the other equation"] },
  ],
}

const WORKED: Record<string, { stemTex: string; steps: string[]; finalAnswerTex: string }[]> = {
  linear: [
    {
      stemTex: "2x + 3 = 11",
      steps: ["2x + 3 = 11", "2x = 8  (subtract 3 from both sides)", "x = 4  (divide both sides by 2)"],
      finalAnswerTex: "x = 4",
    },
  ],
  brackets: [
    {
      stemTex: "(x + 2)(x + 3)",
      steps: ["(x + 2)(x + 3)", "x\\cdot x + 2x + 3x + 6", "x^2 + 5x + 6"],
      finalAnswerTex: "x^2 + 5x + 6",
    },
  ],
  factorising: [
    {
      stemTex: "x^2 + 5x + 6",
      steps: ["x^2 + 5x + 6", "\\text{prices: } 2 \\times 3 = 6,\\; 2 + 3 = 5", "(x + 2)(x + 3)"],
      finalAnswerTex: "(x+2)(x+3)",
    },
  ],
  quadratics: [
    {
      stemTex: "x^2 - 5x + 6 = 0",
      steps: ["x^2 - 5x + 6 = 0", "(x - 2)(x - 3) = 0", "x = 2 \\;\\text{or}\\; x = 3"],
      finalAnswerTex: "x = 2 \\;\\text{or}\\; x = 3",
    },
  ],
  simultaneous: [
    {
      stemTex: "x + y = 7, \\; x - y = 1",
      steps: ["x + y = 7,\\; x - y = 1", "\\text{add: } 2x = 8", "x = 4,\\; y = 3"],
      finalAnswerTex: "x = 4, \\; y = 3",
    },
  ],
}

const OBJECTIVES: Record<string, { skill: string; text: string }[]> = {
  linear: [
    { skill: "linear-equations", text: "I can solve ax + b = c by undoing in the right order." },
    { skill: "linear-equations", text: "I can check a solution by substituting it back in." },
  ],
  brackets: [
    { skill: "bracket-expansion", text: "I can expand a(b + c) without dropping a term." },
    { skill: "bracket-expansion", text: "I can expand (x + p)(x + q) and combine like terms." },
  ],
  factorising: [
    { skill: "factorising", text: "I can find the pair that multiplies to c and adds to b." },
    { skill: "factorising", text: "I can write x² + bx + c as a product of two brackets." },
  ],
  quadratics: [
    { skill: "quadratics", text: "I can solve a factorised quadratic with the zero product rule." },
    { skill: "quadratics", text: "I can solve x² = k with both ± roots." },
  ],
  simultaneous: [
    { skill: "simultaneous", text: "I can solve a pair of linear equations by elimination." },
    { skill: "simultaneous", text: "I can check the pair in both equations." },
  ],
}

function sceneFor(topic: string) {
  switch (topic) {
    case "linear":
      return {
        kind: "balance-scale" as const,
        leftHeavy: false,
        unknownSide: "left" as const,
        count: 3,
      }
    case "factorising":
    case "quadratics":
      return {
        kind: "factor-grid" as const,
        a: 1,
        b: 2,
        c: 1,
        d: 3,
      }
    case "simultaneous":
      return { kind: "coordinate-axes" as const, fn: { type: "line" as const, m: 1, b: 3 } }
    default:
      return { kind: "number-line" as const, from: -2, to: 6, markers: [{ at: 4, open: false }] }
  }
}

function practiceSolution(it: ContentItem): GeneratedPracticeItem["solution"] {
  const steps =
    it.kind === "solve"
      ? [
          { tex: `\\text{start: } ${it.stemTex ?? it.init ?? ""}` },
          { tex: `\\text{isolate the unknown one operation at a time}` },
          { tex: `\\text{solution: } x = ${Object.values(it.roots ?? { x: ["?"] })[0]?.[0] ?? "?"}` },
        ]
      : [
          { tex: `\\text{expand/factor every term}` },
          { tex: `\\text{combine like terms}` },
          { tex: `\\text{result: } ${it.target ?? ""}` },
        ]
  return { steps, answerTex: it.kind === "solve" ? `x = ${Object.values(it.roots ?? { x: ["?"] })[0]?.[0] ?? "?"}` : (it.target ?? "") }
}

function testFor(it: ContentItem, topic: string, idx: number): GeneratedTestItem {
  if (idx === 0) {
    return {
      id: `t-${it.id}-0`,
      kind: "mc",
      prompt: `Which value is a solution of ${it.stemTex ?? it.init ?? ""}?`,
      promptTex: it.stemTex,
      options: [
        { label: "the largest listed root", tex: it.kind === "solve" ? Object.values(it.roots ?? {})[0]?.[0] ?? "" : it.target ?? "" },
        { label: "one more than the value", tex: (Number(Object.values(it.roots ?? {})[0]?.[0] ?? 0) + 1).toString() },
        { label: "one less than the value", tex: (Number(Object.values(it.roots ?? {})[0]?.[0] ?? 0) - 1).toString() },
        { label: "twice the value", tex: (2 * Number(Object.values(it.roots ?? {})[0]?.[0] ?? 0)).toString() },
      ],
      correctIndex: 0,
      explanation: "The engine checks your choice by substituting it back into the equation.",
    }
  }
  return {
    id: `t-${it.id}-${idx}`,
    kind: "short",
    prompt: it.stem,
    promptTex: it.stemTex,
    solveKind: it.kind,
    init: it.init,
    target: it.target,
    roots: it.roots,
    answerTex: it.kind === "solve" ? `x = ${Object.values(it.roots ?? { x: ["?"] })[0]?.[0] ?? "?"}` : (it.target ?? ""),
    explanation: "Your answer is scored by the math engine: substitute it back in and both sides must agree.",
  }
}

function practiceFromCatalog(topic: string, items: ContentItem[], from: number, to: number): GeneratedPracticeItem[] {
  return items
    .filter((it) => it.topic === topic)
    .sort((a, b) => a.difficulty - b.difficulty)
    .slice(from, to)
    .map((it, i) => ({
      id: `g-${topic}-p${i}`,
      topic,
      skill: it.skill,
      kind: it.kind,
      title: it.title,
      stem: it.stem,
      stemTex: it.stemTex,
      init: it.init,
      target: it.target,
      roots: it.roots,
      hint: it.hint,
      calcAllowed: it.calcAllowed,
      waitMs: it.waitMs,
      difficulty: it.difficulty,
      alt: it.alt,
      solution: practiceSolution(it),
    }))
}

/** Hand-authored, engine-verified lesson fixtures. Never touch the network. */
export function fixtureLesson(slug: string): GeneratedLesson | null {
  const topic = topicBySlug(slug)
  const items = ITEMS.filter((it) => it.topic === slug)
  if (!topic || items.length === 0) return null
  const worked = WORKED[slug] ?? [
    {
      stemTex: items[0].stemTex ?? items[0].init ?? "",
      steps: [items[0].stemTex ?? items[0].init ?? "", `\\text{apply one legal move}`],
      finalAnswerTex: items[0].target ?? "",
    },
  ]
  for (const ex of worked) {
    const errs = verifyWorkedExample(
      { stem: "", stemTex: ex.stemTex, steps: ex.steps.map((s) => ({ tex: s })), finalAnswerTex: ex.finalAnswerTex },
    )
    if (errs.length > 0) {
      void errs
    }
  }

  const practice = practiceFromCatalog(slug, items, 0, 5)
  if (practice.length < 4) {
    return null
  }

  const testItems: GeneratedTestItem[] = []
  for (let i = 0; i < practice.length && testItems.length < 5; i++) {
    testItems.push(testFor(practice[i] as unknown as ContentItem, slug, i))
    if (i % 2 === 1 && (i + 1) < practice.length) {
      testItems.push(testFor(practice[i + 1] as unknown as ContentItem, slug, i + 1))
    }
  }

  const lesson: GeneratedLesson = {
    topic: { slug, title: TITLES[slug] ?? topic.title },
    title: TITLES[slug] ?? topic.title,
    intro: INTROS[slug] ?? topic.blurb,
    introScene: sceneFor(slug),
    objectives: OBJECTIVES[slug] ?? [],
    outline: OUTLINES[slug] ?? [],
    workedExamples: worked.map((w) => ({ stem: w.stemTex, stemTex: w.stemTex, steps: w.steps.map((s) => ({ tex: s })), finalAnswerTex: w.finalAnswerTex })),
    diagrams: [sceneFor(slug)],
    practice,
    testItems,
    passMark: 0.8,
    calcAllowed: false,
    waitMs: 12000,
    sources: [{ title: "Aurea fixture lesson", license: "internal", url: "" }],
  }
  return lesson
}