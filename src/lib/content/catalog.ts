import type { MisKey } from "../math/verify"

export type ItemKind = "solve" | "simplify" | "translate"

export interface TopicNode {
  slug: string
  title: string
  tier: 1 | 2 | 3
  parent?: string
  blurb: string
  skills: string[]
}

export interface SourceRef {
  title: string
  license: string
  url: string
  kind: "book" | "openstax" | "oer" | "public-domain"
}

export interface LessonBlock {
  t: "def" | "why" | "note" | "steps" | "tip"
  text: string
  tex?: string
}

export interface Lesson {
  slug: string
  goal: string
  prerequisites: string[]
  blocks: LessonBlock[]
  workedPattern?: { stem: string; steps: string[]; fillStep: number }
  practice: string[]
  sources: SourceRef[]
}

export interface HintLadder {
  l1: string
  l2: string
  l3: string
}

export interface ContentItem {
  id: string
  topic: string
  skill: string
  kind: ItemKind
  title: string
  stem: string
  stemTex?: string
  init?: string
  target?: string
  roots?: Record<string, string[]>
  hint: HintLadder
  calcAllowed: boolean
  waitMs: number
  difficulty: 1 | 2 | 3
  alt: string
  tpl: string
  sourceId: string
}

export interface Misconception {
  key: MisKey
  name: string
  l1: string
  repair: string
}

export const SOURCES: Record<string, SourceRef> = {
  "openstax-alg": {
    title: "OpenStax — Intermediate Algebra",
    license: "CC BY 4.0",
    url: "https://openstax.org/details/books/intermediate-algebra-2e",
    kind: "openstax",
  },
  "openstax-prec": {
    title: "OpenStax — Precalculus",
    license: "CC BY 4.0",
    url: "https://openstax.org/details/books/precalculus-2e",
    kind: "openstax",
  },
  ck12: {
    title: "CK-12 Foundation — Algebra I",
    license: "CC BY-NC 4.0",
    url: "https://www.ck12.org/c/algebra/",
    kind: "oer",
  },
  "gutenberg-euler": {
    title: "Euler — Elements of Algebra (public domain)",
    license: "Public domain",
    url: "https://www.gutenberg.org/ebooks/7981",
    kind: "public-domain",
  },
  "ocw-calculus": {
    title: "MIT OpenCourseWare — Calculus Revisited",
    license: "CC BY-NC-SA 4.0",
    url: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
    kind: "oer",
  },
  "openstax-calc": {
    title: "OpenStax — Calculus Volume 1",
    license: "CC BY-NC-SA 4.0",
    url: "https://openstax.org/details/books/calculus-volume-1",
    kind: "openstax",
  },
}

export const TOPICS: TopicNode[] = [
  { slug: "arithmetic", title: "Arithmetic & negative numbers", tier: 1, blurb: "The quiet foundations: signed numbers and their habits.", skills: ["negative-arithmetic"] },
  { slug: "negative", title: "Working with negatives", parent: "arithmetic", tier: 1, blurb: "Signs, subtraction of negatives, and minus in front of brackets.", skills: ["negative-arithmetic"] },
  { slug: "linear", title: "Linear equations", parent: "algebra", tier: 1, blurb: "One secret value, one straight path to find it.", skills: ["linear-equations"] },
  { slug: "fractions-eq", title: "Fractions inside equations", parent: "linear", tier: 1, blurb: "Clear the denominators first — then solve as usual.", skills: ["linear-equations", "fraction-arithmetic"] },
  { slug: "brackets", title: "Expressions & bracket expansion", parent: "algebra", tier: 1, blurb: "Distribute carefully — every term, every sign.", skills: ["bracket-expansion"] },
  { slug: "difference-squares", title: "Difference of two squares", parent: "brackets", tier: 1, blurb: "a² − b² = (a − b)(a + b).", skills: ["bracket-expansion"] },
  { slug: "factorising", title: "Factorising quadratics", parent: "algebra", tier: 1, blurb: "Reading a product backwards: which two brackets multiply back?", skills: ["factorising"] },
  { slug: "quadratics", title: "Solving quadratics", parent: "algebra", tier: 1, blurb: "Zero products, square roots, and both answers.", skills: ["quadratics"] },
  { slug: "complete-square", title: "Completing the square", parent: "quadratics", tier: 1, blurb: "Rewrite x² + bx so the x hides inside one bracket.", skills: ["quadratics", "complete-square"] },
  { slug: "simultaneous", title: "Simultaneous equations", parent: "algebra", tier: 1, blurb: "Two lines, one meeting point: x and y together.", skills: ["simultaneous"] },
  { slug: "word-problems", title: "Algebra in word problems", parent: "algebra", tier: 1, blurb: "From sentences to equations — then solve.", skills: ["linear-equations", "translate"] },
  { slug: "algebra", title: "Algebra: the deep spine", tier: 1, blurb: "Equations, expressions, factors and proofs in symbols.", skills: [] },
  { slug: "functions", title: "Functions & graphs", parent: "algebra", tier: 2, blurb: "What a machine does to every input it receives.", skills: ["functions"] },
  { slug: "inequalities", title: "Linear inequalities", parent: "algebra", tier: 2, blurb: "Solving with the one rule nobody expects: flip when multiplying by a negative.", skills: ["inequalities"] },
  { slug: "ratio", title: "Ratio & proportion", parent: "arithmetic", tier: 2, blurb: "Sharing, scaling, and the letter that explains everything.", skills: ["ratio"] },
  { slug: "pythagoras", title: "Pythagoras & distance", parent: "arithmetic", tier: 2, blurb: "The right triangle's oldest promise.", skills: ["pythagoras"] },
  { slug: "trig-basics", title: "Trigonometry basics", parent: "arithmetic", tier: 2, blurb: "Sine, cosine, tangent — ratios that live in right triangles.", skills: ["trigonometry"] },
  { slug: "sequences", title: "Sequences & the nth term", parent: "algebra", tier: 2, blurb: "Spot the pattern; describe every term at once.", skills: ["sequences"] },
  { slug: "polynomials", title: "Polynomials, deeper", tier: 2, blurb: "Degrees, remainders, and the factor theorem.", skills: ["polynomials"] },
  { slug: "limits", title: "Limits (calculus springboard)", tier: 3, blurb: "What a function is creeping toward.", skills: ["limits"] },
  { slug: "differential", title: "Differentiation intro", tier: 3, blurb: "Instant rate of change: the slope of the curve at one point.", skills: ["differentiation"] },
  { slug: "integration", title: "Integration intro", tier: 3, blurb: "The area beneath a curve, and the dance with differentiation.", skills: ["integration"] },
  { slug: "matrices", title: "Matrices & eigenvectors", tier: 3, blurb: "Tables that transform the plane — and the directions they don't.", skills: ["linear-algebra"] },
  { slug: "ode", title: "Differential equations", tier: 3, blurb: "Equations whose unknown is a whole function.", skills: ["differentiation", "integration"] },
]

export const MISCONCEPTIONS: Misconception[] = [
  {
    key: "moved-term-sign",
    name: "Term crossed = without changing sign",
    l1: "When a term walks across the equals sign, what happens to its sign?",
    repair: "Crossing the = flips the sign. If `a + b = c`, then `a = c - b`.",
  },
  {
    key: "minus-distribution",
    name: "A minus in front of a bracket",
    l1: "What does the minus out front do to every term inside the bracket?",
    repair: "`a - (b - c)` becomes `a - b + c`. The minus flips each sign inside — every one of them.",
  },
  {
    key: "binomial-sign",
    name: "Squaring a binomial",
    l1: "When you square `(a + b)`, how many pieces do you expect?",
    repair: "`(a + b)^2 = a^2 + 2ab + b^2`. The middle term 2ab is easy to lose — that's usually the culprit.",
  },
  {
    key: "expansion-error",
    name: "Expanding a product of expressions",
    l1: "Try expanding one pair at a time: what does each term on the outside multiply?",
    repair: "Every term in the first factor multiplies every term in the second. A slow, careful grid works best.",
  },
  {
    key: "sign-error",
    name: "A sign slipped somewhere",
    l1: "Trace the previous line: which term changed sign when it should not have?",
    repair: "Go back to the line before and check each sign one at a time.",
  },
  {
    key: "divide-by-zero",
    name: "Dividing by something that can be zero",
    l1: "Can the expression you divided by ever be zero here?",
    repair: "Never divide by an expression that could equal 0 — you can lose or invent solutions. Check it first.",
  },
  {
    key: "value-not-simpler",
    name: "Same value, not simpler",
    l1: "How might this be written more simply?",
    repair: "Your value is right — the form is just not simpler yet.",
  },
]

export const ITEMS: ContentItem[] = [
  {
    id: "line-1",
    topic: "linear",
    skill: "linear-equations",
    kind: "solve",
    title: "A first balance",
    stem: "Two mystery numbers balance the scale. Solve for x.",
    stemTex: "2x + 3 = 11",
    init: "2x+3=11",
    roots: { x: ["4"] },
    hint: {
      l1: "What must 2x be equal to, if 2x + 3 is 11?",
      l2: "Undo the +3 by subtracting 3 from both sides.",
      l3: "Write `2x = 8` (subtract 3 from both sides), then you finish it.",
    },
    calcAllowed: false,
    waitMs: 12000,
    difficulty: 1,
    alt: "Two x-blocks and three unit blocks balance eleven unit blocks.",
    tpl: "line-a",
    sourceId: "openstax-alg",
  },
  {
    id: "line-2",
    topic: "linear",
    skill: "linear-equations",
    kind: "solve",
    title: "A bracket on one side",
    stem: "The bracket hides a product. Unwrap it, then solve.",
    stemTex: "3(x - 2) = 12",
    init: "3(x-2)=12",
    roots: { x: ["6"] },
    hint: {
      l1: "What is inside the bracket being multiplied by 3?",
      l2: "Divide both sides by 3 first — what are you left with?",
      l3: "Write `x - 2 = 4` (divide both sides by 3), then finish.",
    },
    calcAllowed: false,
    waitMs: 14000,
    difficulty: 1,
    alt: "Three copies of the expression x minus two equal twelve.",
    tpl: "line-bracket",
    sourceId: "ck12",
  },
  {
    id: "line-3",
    topic: "fractions-eq",
    skill: "linear-equations",
    kind: "solve",
    title: "A half minus a step",
    stem: "Half of x, then three fewer, lands on 1.",
    stemTex: "x/2 - 3 = 1",
    init: "x/2-3=1",
    roots: { x: ["8"] },
    hint: {
      l1: "Add 3 to both sides — what does that leave?",
      l2: "The unknown is being cut in half. What is the opposite of dividing by 2?",
      l3: "Write `x/2 = 4`, then multiply both sides by 2.",
    },
    calcAllowed: false,
    waitMs: 16000,
    difficulty: 2,
    alt: "Half of x minus three equals one.",
    tpl: "line-frac",
    sourceId: "ck12",
  },
  {
    id: "line-4",
    topic: "linear",
    skill: "linear-equations",
    kind: "solve",
    title: "Both sides carry x",
    stem: "The mystery number appears on both sides of the equals sign.",
    stemTex: "5x - 4 = 2x + 8",
    init: "5x-4=2x+8",
    roots: { x: ["4"] },
    hint: {
      l1: "Which side has more x's? Would collecting all x's on one side help?",
      l2: "Subtract 2x from both sides — what remains?",
      l3: "Write `3x - 4 = 8` (subtract 2x both sides), then finish.",
    },
    calcAllowed: false,
    waitMs: 18000,
    difficulty: 2,
    alt: "Five x minus four equals two x plus eight.",
    tpl: "line-both",
    sourceId: "openstax-alg",
  },
  {
    id: "line-5",
    topic: "fractions-eq",
    skill: "linear-equations",
    kind: "solve",
    title: "Clearing denominators",
    stem: "Two fractions share one mystery number.",
    stemTex: "x/3 + x/2 = 5",
    init: "x/3+x/2=5",
    roots: { x: ["6"] },
    hint: {
      l1: "What single multiplier wipes out both the /3 and the /2?",
      l2: "Multiply every term by 6 — what happens to each fraction?",
      l3: "Write `2x + 3x = 30` (multiply every term by 6), then finish.",
    },
    calcAllowed: false,
    waitMs: 20000,
    difficulty: 3,
    alt: "A third of x plus a half of x equals five.",
    tpl: "line-frac2",
    sourceId: "ck12",
  },
  {
    id: "neg-1",
    topic: "negative",
    skill: "negative-arithmetic",
    kind: "solve",
    title: "A minus in front of the bracket",
    stem: "The minus beside the bracket is hungry. Distribute carefully.",
    stemTex: "7 - 2(x - 1) = 5",
    init: "7-2(x-1)=5",
    roots: { x: ["2"] },
    hint: {
      l1: "What does the 2 do to the x − 1, and what does the minus out front do?",
      l2: "Write the left side expanded first: `7 - 2x + 2` — every sign flips.",
      l3: "First expand to `9 - 2x = 5`, then solve.",
    },
    calcAllowed: false,
    waitMs: 20000,
    difficulty: 3,
    alt: "Seven minus twice the quantity x minus one equals five.",
    tpl: "line-neg",
    sourceId: "gutenberg-euler",
  },
  {
    id: "translate-1",
    topic: "word-problems",
    skill: "translate",
    kind: "translate",
    title: "Twice, then three more",
    stem: "I thought of a number. Twice my number, plus three more, gives 11. What was my number?",
    init: "2x+3=11",
    roots: { x: ["4"] },
    hint: {
      l1: "Let the mystery number be x. How do you write 'twice my number, plus three more'?",
      l2: "That whole expression equals 11 — write the equation first.",
      l3: "Write `2x + 3 = 11` as your first line, then solve it.",
    },
    calcAllowed: false,
    waitMs: 22000,
    difficulty: 2,
    alt: "A word problem about twice a number plus three gives eleven.",
    tpl: "translate-add",
    sourceId: "openstax-alg",
  },
  {
    id: "translate-2",
    topic: "word-problems",
    skill: "translate",
    kind: "translate",
    title: "Double it, cut five",
    stem: "When I double a number and take away 5, I end on 15. Find the number.",
    init: "2x-5=15",
    roots: { x: ["10"] },
    hint: {
      l1: "What does 'double a number and take away 5' become in symbols?",
      l2: "Translate the sentence into an equation first — then solve.",
      l3: "Write `2x - 5 = 15` as your first line, then solve.",
    },
    calcAllowed: false,
    waitMs: 22000,
    difficulty: 2,
    alt: "A word problem about doubling a number then subtracting five gives fifteen.",
    tpl: "translate-sub",
    sourceId: "openstax-alg",
  },
  {
    id: "exp-1",
    topic: "brackets",
    skill: "bracket-expansion",
    kind: "simplify",
    title: "Two brackets, grown up",
    stem: "Expand fully.",
    stemTex: "(x + 2)(x + 3)",
    target: "x^2+5x+6",
    hint: {
      l1: "How many products does 'every term × every term' give you?",
      l2: "First × first, outer, inner, last — the grid method.",
      l3: "Start with `x·x + x·3 + 2·x + 2·3`, then combine like terms.",
    },
    calcAllowed: false,
    waitMs: 18000,
    difficulty: 1,
    alt: "Expand the product x plus two times x plus three.",
    tpl: "expand-binom",
    sourceId: "openstax-alg",
  },
  {
    id: "exp-3",
    topic: "brackets",
    skill: "bracket-expansion",
    kind: "simplify",
    title: "Minus beside the bracket",
    stem: "Expand and simplify.",
    stemTex: "3 - (2x + 1)",
    target: "2-2x",
    hint: {
      l1: "The minus outside the bracket will flip every sign inside — how many signs are in there?",
      l2: "Write `3 - 2x - 1`, then tidy the constants.",
      l3: "`3 - 2x - 1` simplifies to `2 - 2x`.",
    },
    calcAllowed: false,
    waitMs: 16000,
    difficulty: 2,
    alt: "Expand and simplify three minus the quantity two x plus one.",
    tpl: "expand-minus",
    sourceId: "gutenberg-euler",
  },
  {
    id: "exp-4",
    topic: "difference-squares",
    skill: "bracket-expansion",
    kind: "simplify",
    title: "The sneaky shortcut",
    stem: "Expand.",
    stemTex: "(x - 5)(x + 5)",
    target: "x^2-25",
    hint: {
      l1: "The middle terms cancel here — do you see how?",
      l2: "It's a difference of two squares: (a − b)(a + b) = a² − b².",
      l3: "`(x - 5)(x + 5) = x^2 - 25`.",
    },
    calcAllowed: false,
    waitMs: 16000,
    difficulty: 1,
    alt: "Expand x minus five times x plus five.",
    tpl: "expand-dots",
    sourceId: "ck12",
  },
  {
    id: "fact-1",
    topic: "factorising",
    skill: "factorising",
    kind: "simplify",
    title: "Backwards reading",
    stem: "Factor completely.",
    stemTex: "x^2 + 5x + 6",
    target: "(x+2)(x+3)",
    hint: {
      l1: "Two numbers multiply to 6 and add to 5 — which pair?",
      l2: "Write `(x + ?)(x + ?)` with the pair you found.",
      l3: "`(x + 2)(x + 3)` — check by expanding back.",
    },
    calcAllowed: false,
    waitMs: 20000,
    difficulty: 1,
    alt: "Factor x squared plus five x plus six.",
    tpl: "factor-quad",
    sourceId: "openstax-alg",
  },
  {
    id: "fact-2",
    topic: "difference-squares",
    skill: "factorising",
    kind: "simplify",
    title: "Difference, backwards",
    stem: "Factor completely.",
    stemTex: "x^2 - 9",
    target: "(x-3)(x+3)",
    hint: {
      l1: "This is a difference of two squares — which square is 9?",
      l2: "a² − b² = (a − b)(a + b).",
      l3: "`(x - 3)(x + 3)`.",
    },
    calcAllowed: false,
    waitMs: 16000,
    difficulty: 1,
    alt: "Factor x squared minus nine.",
    tpl: "factor-dots",
    sourceId: "ck12",
  },
  {
    id: "fact-3",
    topic: "factorising",
    skill: "factorising",
    kind: "simplify",
    title: "A leading coefficient",
    stem: "Factor completely.",
    stemTex: "2x^2 + 5x - 3",
    target: "(2x-1)(x+3)",
    hint: {
      l1: "The 2x² means one bracket starts 2x and the other starts x.",
      l2: "Find numbers so that outer+inner gives 5x and the product is −3.",
      l3: "Try `(2x - 1)(x + 3)` and check by expanding.",
    },
    calcAllowed: false,
    waitMs: 24000,
    difficulty: 3,
    alt: "Factor two x squared plus five x minus three.",
    tpl: "factor-quad",
    sourceId: "openstax-alg",
  },
  {
    id: "quad-1",
    topic: "quadratics",
    skill: "quadratics",
    kind: "solve",
    title: "Zero product rule",
    stem: "Two roots hide here. Factor first, then solve.",
    stemTex: "x^2 - 5x + 6 = 0",
    init: "x^2-5x+6=0",
    roots: { x: ["2", "3"] },
    hint: {
      l1: "To use 'zero product', the right side must be 0 — is it?",
      l2: "Factor the left side into two brackets.",
      l3: "Write `(x - 2)(x - 3) = 0`, then finish from there.",
    },
    calcAllowed: false,
    waitMs: 24000,
    difficulty: 2,
    alt: "Solve x squared minus five x plus six equals zero.",
    tpl: "quad-fact",
    sourceId: "openstax-alg",
  },
  {
    id: "quad-2",
    topic: "quadratics",
    skill: "quadratics",
    kind: "solve",
    title: "Square root both sides",
    stem: "The x is squared. Undo it — but remember both signs.",
    stemTex: "x^2 = 49",
    init: "x^2=49",
    roots: { x: ["-7", "7"] },
    hint: {
      l1: "Squaring which two numbers gives 49?",
      l2: "x² = 49 means x = ±7 — both of them.",
      l3: "Write `x^2 = 49`, then the solutions come from ±√49.",
    },
    calcAllowed: false,
    waitMs: 14000,
    difficulty: 1,
    alt: "Solve x squared equals forty-nine.",
    tpl: "quad-square",
    sourceId: "ck12",
  },
  {
    id: "quad-3",
    topic: "quadratics",
    skill: "quadratics",
    kind: "solve",
    title: "A squared bracket already",
    stem: "It is already almost finished. Both roots.",
    stemTex: "(x + 3)^2 = 4",
    init: "(x+3)^2=4",
    roots: { x: ["-1", "-5"] },
    hint: {
      l1: "Undo the square with a square root — what comes out?",
      l2: "(x + 3)² = 4 means x + 3 = ±2.",
      l3: "Write `x + 3 = 2` and `x + 3 = -2`, then finish both.",
    },
    calcAllowed: false,
    waitMs: 18000,
    difficulty: 2,
    alt: "Solve the quantity x plus three squared equals four.",
    tpl: "quad-bracket",
    sourceId: "openstax-alg",
  },
  {
    id: "cs-1",
    topic: "complete-square",
    skill: "complete-square",
    kind: "solve",
    title: "Make the square first",
    stem: "Complete the square, then solve. Two roots.",
    stemTex: "x^2 + 6x + 8 = 0",
    init: "x^2+6x+8=0",
    roots: { x: ["-2", "-4"] },
    hint: {
      l1: "To complete the square on x² + 6x, what half of 6 shows up inside the bracket?",
      l2: "x² + 6x = (x + 3)² − 9.",
      l3: "Rewrite as `(x + 3)^2 = 1`, then take square roots both sides.",
    },
    calcAllowed: false,
    waitMs: 26000,
    difficulty: 3,
    alt: "Solve x squared plus six x plus eight equals zero by completing the square.",
    tpl: "quad-complete",
    sourceId: "openstax-alg",
  },
  {
    id: "cs-2",
    topic: "complete-square",
    skill: "complete-square",
    kind: "solve",
    title: "Move it first",
    stem: "Bring the x's together, then complete the square.",
    stemTex: "x^2 - 4x = 5",
    init: "x^2-4x=5",
    roots: { x: ["5", "-1"] },
    hint: {
      l1: "x² − 4x... which bracket square does that come from?",
      l2: "x² − 4x = (x − 2)² − 4.",
      l3: "Rewrite as `(x - 2)^2 = 9`, then finish.",
    },
    calcAllowed: false,
    waitMs: 26000,
    difficulty: 3,
    alt: "Solve x squared minus four x equals five by completing the square.",
    tpl: "quad-complete2",
    sourceId: "openstax-alg",
  },
  {
    id: "sys-1",
    topic: "simultaneous",
    skill: "simultaneous",
    kind: "solve",
    title: "Two lines meet",
    stem: "Write the two equations, then find the meeting point (x, y).",
    stemTex: "x + y = 7  and  x - y = 1",
    init: "x+y=7",
    roots: { x: ["4"], y: ["3"] },
    hint: {
      l1: "Add the two equations — what cancels?",
      l2: "Adding gives 2x = 8, so x = 4. Then substitute back.",
      l3: "Write `2x = 8` (add the equations), then find y by substituting.",
    },
    calcAllowed: false,
    waitMs: 28000,
    difficulty: 2,
    alt: "Solve the pair x plus y equals seven and x minus y equals one.",
    tpl: "system-lin",
    sourceId: "openstax-alg",
  },
  {
    id: "sys-2",
    topic: "simultaneous",
    skill: "simultaneous",
    kind: "solve",
    title: "Matching coefficients",
    stem: "Align the x's, then eliminate one variable.",
    stemTex: "2x + y = 10  and  x - y = 2",
    init: "2x+y=10",
    roots: { x: ["4"], y: ["2"] },
    hint: {
      l1: "The y's have opposite signs — add the equations.",
      l2: "Adding gives 3x = 12, so x = 4. Substitute to get y.",
      l3: "Write `3x = 12` (add), then solve for y.",
    },
    calcAllowed: false,
    waitMs: 30000,
    difficulty: 2,
    alt: "Solve the pair two x plus y equals ten and x minus y equals two.",
    tpl: "system-lin",
    sourceId: "ck12",
  },
]

export const LESSONS: Lesson[] = [
  {
    slug: "linear",
    goal: "Solve equations like 2x + 3 = 11 by doing the same thing to both sides.",
    prerequisites: ["negative-arithmetic"],
    blocks: [
      { t: "def", text: "An equation is a balance. Whatever sits on the left weighs exactly as much as the right.", tex: "2x + 3 = 11" },
      { t: "why", text: "If you do the same operation to both sides, the balance holds — and the unknown x gets quieter with every step." },
      { t: "steps", text: "Keep x on one side. Undo additions and subtractions first, then multiplications and divisions:" },
      { t: "note", text: "Checking is silent respect: put your answer back in and see the scale balance.", tex: "2(4) + 3 = 11" },
    ],
    workedPattern: {
      stem: "Solve 3x + 4 = 19",
      steps: ["3x + 4 = 19", "3x = 15  (subtract 4 from both sides)", "x = 5  (divide both sides by 3)"],
      fillStep: 2,
    },
    practice: ["line-1", "line-2", "line-4"],
    sources: [SOURCES["openstax-alg"], SOURCES["ck12"]],
  },
  {
    slug: "brackets",
    goal: "Expand products of expressions, looking after every sign.",
    prerequisites: ["negative-arithmetic"],
    blocks: [
      { t: "def", text: "Every term in the first factor multiplies every term in the second." },
      { t: "note", text: "A minus in front of a bracket flips every sign inside:", tex: "a - (b - c) = a - b + c" },
      { t: "tip", text: "The grid method — draw a 2×2 box — keeps the four products visible." },
    ],
    workedPattern: {
      stem: "Expand (x + 3)(x - 2)",
      steps: ["x·x + x·(-2) + 3·x + 3·(-2)", "x^2 - 2x + 3x - 6", "x^2 + x - 6"],
      fillStep: 2,
    },
    practice: ["exp-1", "exp-3", "exp-4"],
    sources: [SOURCES["openstax-alg"], SOURCES["gutenberg-euler"]],
  },
  {
    slug: "factorising",
    goal: "Reread an expanded quadratic as a product of two brackets.",
    prerequisites: ["bracket-expansion"],
    blocks: [
      { t: "def", text: "Factorising is expanding in reverse: which pair multiplies to c and adds to b?" },
      { t: "why", text: "A factorised form unlocks the 'zero product' rule: if a product is 0, at least one factor is 0." },
      { t: "steps", text: "For x² + bx + c, find p, q with p·q = c and p + q = b, then write (x + p)(x + q)." },
    ],
    workedPattern: {
      stem: "Factor x^2 + 7x + 12",
      steps: ["Look: p·q = 12 and p + q = 7, so p = 3, q = 4", "x^2 + 7x + 12 = (x + 3)(x + 4)"],
      fillStep: 1,
    },
    practice: ["fact-1", "fact-2", "fact-3"],
    sources: [SOURCES["openstax-alg"], SOURCES["ck12"]],
  },
  {
    slug: "quadratics",
    goal: "Solve quadratics by factoring and by square roots, always finding both answers.",
    prerequisites: ["factorising"],
    blocks: [
      { t: "def", text: "A quadratic can have up to two solutions. 'Both answers' is not a bonus; it's the rule." },
      { t: "note", text: "Zero product: if (x - 2)(x - 3) = 0 then x = 2 or x = 3." },
      { t: "tip", text: "After solving, substitute each answer back — a quadratic's polite be honest." },
    ],
    workedPattern: {
      stem: "Solve x^2 - x - 6 = 0",
      steps: ["(x - 3)(x + 2) = 0", "x = 3 or x = -2"],
      fillStep: 0,
    },
    practice: ["quad-1", "quad-2", "quad-3"],
    sources: [SOURCES["openstax-alg"], SOURCES["ck12"]],
  },
  {
    slug: "complete-square",
    goal: "Rewrite x² + bx as a perfect square minus a constant, then solve.",
    prerequisites: ["quadratics"],
    blocks: [
      { t: "def", text: "Complete the square: x² + bx = (x + b/2)² − (b/2)²." },
      { t: "why", text: "A squared bracket isolates x in one place — the fastest road to the roots." },
      { t: "note", text: "Half of b goes in the bracket; half of b, squared, comes out as correction." },
    ],
    workedPattern: {
      stem: "Solve x^2 + 6x - 7 = 0",
      steps: ["(x + 3)^2 - 9 - 7 = 0", "(x + 3)^2 = 16", "x + 3 = ±4", "x = 1 or x = -7"],
      fillStep: 1,
    },
    practice: ["cs-1", "cs-2"],
    sources: [SOURCES["openstax-alg"], SOURCES["openstax-prec"]],
  },
  {
    slug: "simultaneous",
    goal: "Solve two linear equations together by elimination or substitution.",
    prerequisites: ["linear-equations"],
    blocks: [
      { t: "def", text: "Each equation is a line. Together they pin down the one point where both lines cross." },
      { t: "steps", text: "Elimination: make a variable's coefficients opposite, add, solve, then substitute back." },
      { t: "tip", text: "Always check the pair in the second equation too — not just the first." },
    ],
    workedPattern: {
      stem: "Solve x + y = 9 and x - y = 3",
      steps: ["Add: 2x = 12, so x = 6", "Substitute: 6 + y = 9, so y = 3", "(x, y) = (6, 3)"],
      fillStep: 2,
    },
    practice: ["sys-1", "sys-2"],
    sources: [SOURCES["openstax-alg"], SOURCES["ck12"]],
  },
  {
    slug: "word-problems",
    goal: "Turn a sentence into an equation, then let algebra do the rest.",
    prerequisites: ["linear-equations"],
    blocks: [
      { t: "def", text: "Name the unknown (x), translate 'twice', 'more than', 'take away' into symbols, then build one equation." },
      { t: "note", text: "The first line of your working is the translation. If it says the right thing, the solving writes itself." },
    ],
    workedPattern: {
      stem: "Three more than twice a number is 15.",
      steps: ["Let the number be x", "2x + 3 = 15", "x = 6"],
      fillStep: 1,
    },
    practice: ["translate-1", "translate-2"],
    sources: [SOURCES["openstax-alg"]],
  },
  {
    slug: "negative",
    goal: "Handle signs calmly: subtraction as adding the opposite.",
    prerequisites: [],
    blocks: [
      { t: "def", text: "Subtracting a negative is adding the opposite:", tex: "a - (-b) = a + b" },
      { t: "note", text: "A minus in front of a bracket redistributes — every sign inside changes." },
    ],
    workedPattern: {
      stem: "Simplify 7 - 2(x - 1)",
      steps: ["7 - 2x + 2", "9 - 2x"],
      fillStep: 0,
    },
    practice: ["neg-1"],
    sources: [SOURCES["gutenberg-euler"]],
  },
  {
    slug: "fractions-eq",
    goal: "Clear denominators once, at the start, then solve the clean integer equation.",
    prerequisites: ["linear-equations"],
    blocks: [
      { t: "note", text: "Multiplying every term by the common denominator removes all fractions at once." },
      { t: "tip", text: "For x/3 + x/2 = 5, multiply every term by 6." },
    ],
    workedPattern: {
      stem: "Solve x/3 + x/2 = 5",
      steps: ["Multiply by 6: 2x + 3x = 30", "5x = 30", "x = 6"],
      fillStep: 1,
    },
    practice: ["line-3", "line-5"],
    sources: [SOURCES["ck12"]],
  },
  {
    slug: "difference-squares",
    goal: "See and use a² − b² = (a − b)(a + b), both directions.",
    prerequisites: ["brackets"],
    blocks: [
      { t: "def", text: "The middle terms cancel in (a − b)(a + b), leaving a² − b²." },
    ],
    workedPattern: {
      stem: "Factor x^2 - 25",
      steps: ["= (x - 5)(x + 5)"],
      fillStep: 0,
    },
    practice: ["exp-4", "fact-2"],
    sources: [SOURCES["ck12"]],
  },
]

export function topicBySlug(slug: string): TopicNode | undefined {
  return TOPICS.find((t) => t.slug === slug)
}

export function lessonBySlug(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug)
}

export function itemById(id: string): ContentItem | undefined {
  return ITEMS.find((i) => i.id === id)
}

export function itemsByTopic(slug: string): ContentItem[] {
  return ITEMS.filter((i) => i.topic === slug)
}

export function skillsTouched(): string[] {
  return [...new Set(ITEMS.map((i) => i.skill))]
}

export function misconceptionByKey(key: MisKey): Misconception | undefined {
  return MISCONCEPTIONS.find((m) => m.key === key)
}