export interface Twin {
  stem: string
  stemTex?: string
  kind: "solve" | "simplify" | "translate"
  init?: string
  target?: string
  roots?: Record<string, string[]>
  hint: { l1: string; l2: string; l3: string }
}

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function int(r: () => number, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1))
}

const HINTS: Record<string, { l1: (p: number[]) => string; l2: (p: number[]) => string; l3: (p: number[]) => string }> = {
  "line-a": {
    l1: () => "What must the x-term be equal to, once the constant steps away?",
    l2: () => "Subtract the constant from both sides first.",
    l3: () => "Write the middle equation (set x- and constant terms side by side), then finish.",
  },
  "line-bracket": {
    l1: () => "The bracket is being multiplied — undo that first.",
    l2: () => "Divide both sides by the number in front of the bracket.",
    l3: () => "Write the simpler bracket equation (divide both sides), then finish.",
  },
  "line-frac": {
    l1: () => "Undo the subtraction first — get the fraction alone.",
    l2: () => "Then undo the division by multiplying both sides.",
    l3: () => "Write the fraction equation (add the constant), then multiply through.",
  },
  "line-both": {
    l1: () => "Which side has more x's? Collect the x's on one side.",
    l2: () => "Subtract the smaller x-term from both sides.",
    l3: () => "Write the equation with x's together (subtract the x-term), then finish.",
  },
  "line-neg": {
    l1: () => "A minus steps over a bracket — every sign inside flips. Write the expansion first.",
    l2: () => "Expand the bracket before you solve.",
    l3: () => "Write the expanded equation (tidy the left side), then solve.",
  },
  "translate-add": {
    l1: () => "Let the mystery number be x. How do you write '× my number, plus more'?",
    l2: () => "Translate the full sentence into one equation before solving.",
    l3: () => "Write the equation (×x plus b equals c), then solve it.",
  },
  "translate-sub": {
    l1: () => "Let the mystery number be x. Translate 'times a number, minus ...' first.",
    l2: () => "The whole sentence becomes one equation.",
    l3: () => "Write the translated equation, then solve it.",
  },
  "expand-binom": {
    l1: () => "How many products do you get from 'every term × every term'?",
    l2: () => "Use FOIL or the grid: four products, then combine like terms.",
    l3: () => "Write the four products separately (x·x + x·b + a·x + a·b), then combine.",
  },
  "expand-minus": {
    l1: () => "The minus outside flips every sign inside the bracket.",
    l2: () => "Rewrite without the bracket first, then combine constants.",
    l3: () => "First write the bracket-free expression, then simplify.",
  },
  "expand-dots": {
    l1: () => "Which two numbers multiply and cancel in the middle?",
    l2: () => "It is a difference of two squares: (a − b)(a + b) = a² − b².",
    l3: () => "Write the expanded result directly.",
  },
  "factor-quad": {
    l1: () => "Two numbers multiply to the constant and add to the x-coefficient — which pair?",
    l2: () => "Write (x + p)(x + q) with the pair you found.",
    l3: () => "Write the factored form, then check by expanding.",
  },
  "factor-dots": {
    l1: () => "This is a difference of two squares — which number is the square?",
    l2: () => "a² − b² = (a − b)(a + b).",
    l3: () => "Write the factored pair directly.",
  },
  "quad-fact": {
    l1: () => "Is one side already 0? Factor the quadratic side.",
    l2: () => "Use the zero product rule after factoring.",
    l3: () => "Write the factored equation, then read off both roots.",
  },
  "quad-square": {
    l1: () => "What squares to that number? Remember both signs.",
    l2: () => "x² = k gives x = ±√k.",
    l3: () => "Write the two square roots as your answer lines.",
  },
  "quad-bracket": {
    l1: () => "Undo the square with a square root — plus or minus.",
    l2: () => "The bracket equals ± the root of the other side.",
    l3: () => "Write the two bracket equations, then finish each.",
  },
  "quad-complete": {
    l1: () => "Complete the square on the x² and x terms first.",
    l2: () => "Half of the x-coefficient goes in the bracket; half squared is subtracted.",
    l3: () => "Write the completed-square equation, then take roots.",
  },
  "quad-complete2": {
    l1: () => "Move the constant to the other side first.",
    l2: () => "Then complete the square on the x-terms.",
    l3: () => "Write the completed-square equation `(x ± h)^2 = k`, then use ±√k.",
  },
  "system-lin": {
    l1: () => "Add the two equations — what cancels?",
    l2: () => "Adding eliminates one variable; solve for the other, then substitute back.",
    l3: () => "Write the added equation, then substitute to find the second value.",
  },
}

function mkTwin(tpl: string, params: number[], build: Twin): Twin {
  const h = HINTS[tpl]
  const hint = h
    ? { l1: h.l1(params), l2: h.l2(params), l3: h.l3(params) }
    : { l1: build.hint.l1, l2: build.hint.l2, l3: build.hint.l3 }
  return { ...build, hint }
}

export function buildTwin(tpl: string, seed: number, exclude: Set<string>): Twin | null {
  const r = rng(seed * 7919 + 47)
  for (let attempt = 0; attempt < 40; attempt++) {
    const twin = buildOne(tpl, r)
    if (twin === null) continue
    const sig = [tpl, twin.stemTex ?? twin.stem, twin.target ?? ""].join("|")
    if (exclude.has(sig)) continue
    return twin
  }
  return null
}

function buildOne(tpl: string, r: () => number): Twin | null {
  switch (tpl) {
    case "line-a": {
      const a = int(r, 2, 5)
      const r0 = int(r, 1, 7)
      const b = int(r, 1, 9)
      const c = a * r0 + b
      return mkTwin(tpl, [a, b, c], {
        kind: "solve",
        stem: "A fresh balance waits for you. Solve.",
        stemTex: `${a}x + ${b} = ${c}`,
        init: `${a}x+${b}=${c}`,
        roots: { x: [String(r0)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "line-bracket": {
      const m = int(r, 2, 5)
      const p = int(r, 1, 6)
      const k = int(r, 1, 6)
      return mkTwin(tpl, [m, p, k], {
        kind: "solve",
        stem: "Inside the bracket, an unknown. Solve.",
        stemTex: `${m}(x - ${p}) = ${m * k}`,
        init: `${m}(x-${p})=${m * k}`,
        roots: { x: [String(p + k)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "line-frac": {
      const a = int(r, 2, 6)
      const b = int(r, 1, 5)
      const c = int(r, 1, 6)
      return mkTwin(tpl, [a, b, c], {
        kind: "solve",
        stem: "A fraction of x, some subtraction, a landing value.",
        stemTex: `x/${a} - ${b} = ${c}`,
        init: `x/${a}-${b}=${c}`,
        roots: { x: [String(a * (b + c))] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "line-both": {
      const a = int(r, 3, 6)
      const s = int(r, 1, a - 1)
      const root = int(r, 1, 6)
      if ((s * root) % 2 !== 0) return null
      const b = (s * root) / 2
      if (b === 0) return null
      const c = a - s
      return mkTwin(tpl, [a, c, b], {
        kind: "solve",
        stem: "The unknown sits on both sides again.",
        stemTex: `${a}x - ${b} = ${c}x + ${b}`,
        init: `${a}x-${b}=${c}x+${b}`,
        roots: { x: [String(root)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "line-neg": {
      const m = int(r, 2, 4)
      const p = int(r, 1, 5)
      const k = int(r, 1, 4)
      return mkTwin(tpl, [m, p, k], {
        kind: "solve",
        stem: "A minus prowls in front of the bracket.",
        stemTex: `7 - ${m}(x - ${p}) = ${7 - m * k}`,
        init: `7-${m}(x-${p})=${7 - m * k}`,
        roots: { x: [String(p + k)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "translate-add": {
      const m = int(r, 2, 4)
      const b = int(r, 2, 9)
      const r0 = int(r, 1, 8)
      const c = m * r0 + b
      return mkTwin(tpl, [m, b, c], {
        kind: "translate",
        stem: `I thought of a number. ${m} times my number, plus ${b} more, gives ${c}. What was my number?`,
        stemTex: undefined,
        init: `${m}x+${b}=${c}`,
        roots: { x: [String(r0)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "translate-sub": {
      const m = int(r, 2, 4)
      const b = int(r, 2, 9)
      const c = int(r, 1, 12)
      if ((c + b) % m !== 0) return null
      return mkTwin(tpl, [m, b, c], {
        kind: "translate",
        stem: `When I take ${m} times a number and subtract ${b}, I land on ${c}. Find the number.`,
        stemTex: undefined,
        init: `${m}x-${b}=${c}`,
        roots: { x: [String((c + b) / m)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "expand-binom": {
      const p = int(r, -6, 6)
      const q = int(r, -6, 6)
      if (p === 0 || q === 0) return null
      return mkTwin(tpl, [p, q], {
        kind: "simplify",
        stem: "Expand fully.",
        stemTex: `(x ${sig(p)})(x ${sig(q)})`,
        target: poly2(p + q, p * q),
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "expand-minus": {
      const c = int(r, 3, 10)
      const a = int(r, 1, 3)
      const b = int(r, 1, 8)
      const rest = c - b
      return mkTwin(tpl, [a, b, c], {
        kind: "simplify",
        stem: "Expand and simplify.",
        stemTex: `${c} - (${a}x ${sig(b)})`,
        target: rest === 0 ? negCoef(a) : `${negCoef(a)}${sig(rest)}`,
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "expand-dots": {
      const a = int(r, 2, 8)
      return mkTwin(tpl, [a], {
        kind: "simplify",
        stem: "Expand carefully.",
        stemTex: `(x - ${a})(x ${sig(a)})`,
        target: `x^2-${a * a}`,
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "factor-quad": {
      const p = int(r, -6, 6)
      const q = int(r, -6, 6)
      if (p === 0 || q === 0 || p === q) return null
      return mkTwin(tpl, [p, q], {
        kind: "simplify",
        stem: "Factor completely.",
        stemTex: `x^2${sig(p + q)}x${sig(p * q)}`,
        target: `(x ${sig(p)})(x ${sig(q)})`,
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "factor-dots": {
      const a = int(r, 2, 8)
      return mkTwin(tpl, [a], {
        kind: "simplify",
        stem: "Factor completely.",
        stemTex: `x^2 - ${a * a}`,
        target: `(x - ${a})(x ${sig(a)})`,
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "quad-fact": {
      const p = int(r, -7, 7)
      const q = int(r, -7, 7)
      if (p === 0 || q === 0 || p === q) return null
      const b = -(p + q)
      const c2 = p * q
      return mkTwin(tpl, [p, q], {
        kind: "solve",
        stem: "Factor, then use the zero product rule.",
        stemTex: `x^2${sig(b)}x${sig(c2)} = 0`,
        init: `x^2${sig(b)}x${sig(c2)}=0`,
        roots: { x: [String(p), String(q)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "quad-square": {
      const a = int(r, 2, 9)
      return mkTwin(tpl, [a], {
        kind: "solve",
        stem: "The square is alone. Both signs.",
        stemTex: `x^2 = ${a * a}`,
        init: `x^2=${a * a}`,
        roots: { x: [String(-a), String(a)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "quad-bracket": {
      const h = int(r, -6, 6)
      const k = int(r, 1, 6)
      return mkTwin(tpl, [h, k], {
        kind: "solve",
        stem: "Nearly a square already. Solve both branches.",
        stemTex: `(x ${sig(h)})^2 = ${k * k}`,
        init: `(x${sig(h)})^2=${k * k}`,
        roots: { x: [String(-h - k), String(-h + k)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "quad-complete": {
      const h = int(r, -5, 5)
      const k = int(r, 1, 6)
      if (h === 0) return null
      const bterm = -2 * h
      const cterm = h * h - k * k
      return mkTwin(tpl, [h, k], {
        kind: "solve",
        stem: "Complete the square, then solve.",
        stemTex: `x^2${sig(bterm)}x${sig(cterm)} = 0`,
        init: `x^2${sig(bterm)}x${sig(cterm)}=0`,
        roots: { x: [String(h - k), String(h + k)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "quad-complete2": {
      const h = int(r, -5, 5)
      const k = int(r, 1, 6)
      if (h === 0) return null
      const bterm = -2 * h
      const cterm = h * h - k * k
      return mkTwin(tpl, [h, k], {
        kind: "solve",
        stem: "Move the constant to the other side, then complete the square.",
        stemTex: `x^2${sig(bterm)}x = ${-cterm}`,
        init: `x^2${sig(bterm)}x=${-cterm}`,
        roots: { x: [String(h - k), String(h + k)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    case "system-lin": {
      const x0 = int(r, 1, 6)
      const y0 = int(r, 1, 6)
      return mkTwin(tpl, [x0, y0], {
        kind: "solve",
        stem: "Two lines share one point. Find it.",
        stemTex: `x + y = ${x0 + y0}  and  x - y = ${x0 - y0}`,
        init: `x+y=${x0 + y0}`,
        roots: { x: [String(x0)], y: [String(y0)] },
        hint: { l1: "", l2: "", l3: "" },
      })
    }
    default:
      return null
  }
}

function sig(x: number): string {
  return x < 0 ? ` - ${-x}` : ` + ${x}`
}

function negCoef(a: number): string {
  return a === 1 ? "-x" : `-${a}x`
}

function poly2(b: number, c: number): string {
  let s = "x^2"
  if (b !== 0) s += `${sig(b)}x`
  if (c !== 0) s += sig(c)
  return s
}