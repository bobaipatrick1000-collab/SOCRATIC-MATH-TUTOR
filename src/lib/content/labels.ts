export const SKILL_LABELS: Record<string, string> = {
  "negative-arithmetic": "Negative numbers",
  "linear-equations": "Linear equations",
  "fraction-arithmetic": "Fractions in equations",
  "bracket-expansion": "Expanding brackets",
  factorising: "Factorising",
  quadratics: "Quadratic equations",
  "complete-square": "Completing the square",
  simultaneous: "Simultaneous equations",
  translate: "Words into equations",
  functions: "Functions & graphs",
  inequalities: "Inequalities",
  ratio: "Ratio & proportion",
  pythagoras: "Pythagoras",
  trigonometry: "Trigonometry",
  sequences: "Sequences",
  polynomials: "Polynomials",
  limits: "Limits",
  differentiation: "Differentiation",
  integration: "Integration",
  "linear-algebra": "Matrices & eigenvectors",
  derived: "Twin of a recent problem",
}

export function catLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}