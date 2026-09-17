/**
 * QA-engineer authored tests — independent verification of radix-2 Booth's algorithm.
 *
 * These tests supplement the existing suite with:
 *   1. Required 4-bit final-answer cases from the QA spec
 *   2. Required 8-bit boundary cases
 *   3. Intermediate-state verification for hand-traced examples
 *   4. createConversion edge-case for the most-negative value
 *   5. Structural checks: internal widths, Q₋₁ initialisation, iteration count
 */
import { describe, expect, it } from 'vitest'
import { simulateBooth, createConversion, validateOperand } from '../lib/booth'
import {
  addFixed,
  arithmeticRightShiftCombined,
  fromTwosComplement,
  negateFixed,
  signExtend,
  signedRange,
  subtractFixed,
  toTwosComplement,
} from '../lib/binary'
import type { BitWidth } from '../types/booth'

/* ------------------------------------------------------------------ */
/*  Section 1 — Required 4-bit final-answer verification              */
/* ------------------------------------------------------------------ */
describe('QA: 4-bit final answers', () => {
  const cases: [number, number, number][] = [
    [5, 3, 15],
    [-5, 3, -15],
    [5, -3, -15],
    [-5, -3, 15],
    [0, 7, 0],
    [7, 0, 0],
    [7, 1, 7],
    [7, -1, -7],
    [-1, 7, -7],
    [7, 7, 49],
    [-8, 2, -16],
    [-8, -1, 8],
    [-8, -8, 64],
    [7, -8, -56],
  ]

  it.each(cases)('%i × %i = %i (4-bit)', (m, q, expected) => {
    const result = simulateBooth(m, q, 4)
    expect(result.productDecimal).toBe(BigInt(expected))
    expect(result.productBinary.length).toBe(8) // 2n bits
    expect(result.directProduct).toBe(result.productDecimal)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 2 — Required 8-bit boundary cases                        */
/* ------------------------------------------------------------------ */
describe('QA: 8-bit boundary cases', () => {
  const cases: [number, number, number][] = [
    [-128, 127, -16256],
    [-128, -128, 16384],
    [127, 127, 16129],
  ]

  it.each(cases)('%i × %i = %i (8-bit)', (m, q, expected) => {
    const result = simulateBooth(m, q, 8)
    expect(result.productDecimal).toBe(BigInt(expected))
    expect(result.productBinary.length).toBe(16)
    expect(result.directProduct).toBe(result.productDecimal)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 3 — Structural / invariant checks                        */
/* ------------------------------------------------------------------ */
describe('QA: structural invariants', () => {
  it('A uses n+1 bits internally', () => {
    const r4 = simulateBooth(3, -4, 4)
    expect(r4.initialState.a.length).toBe(5)
    r4.iterations.forEach((iter) => {
      expect(iter.aBefore.length).toBe(5)
      expect(iter.aAfterArithmetic.length).toBe(5)
      expect(iter.aAfterShift.length).toBe(5)
    })
    const r8 = simulateBooth(-128, 127, 8)
    expect(r8.initialState.a.length).toBe(9)
  })

  it('Q uses exactly n bits', () => {
    const r = simulateBooth(-5, 3, 4)
    expect(r.initialState.q.length).toBe(4)
    r.iterations.forEach((iter) => {
      expect(iter.qBefore.length).toBe(4)
      expect(iter.qAfterShift.length).toBe(4)
    })
  })

  it('Q₋₁ begins at 0', () => {
    expect(simulateBooth(5, 3, 4).initialState.qMinus1).toBe('0')
    expect(simulateBooth(-8, -8, 4).initialState.qMinus1).toBe('0')
    expect(simulateBooth(-128, 127, 8).initialState.qMinus1).toBe('0')
  })

  it('exactly n iterations', () => {
    expect(simulateBooth(5, 3, 4).iterations.length).toBe(4)
    expect(simulateBooth(-128, 127, 8).iterations.length).toBe(8)
  })

  it('internalM is sign-extended from n to n+1 bits', () => {
    // -8 in 4 bits = 1000, sign-extended to 5 bits = 11000
    const r = simulateBooth(-8, 2, 4)
    expect(r.internalM).toBe('11000')
    expect(r.internalNegativeM).toBe('01000') // +8 in 5 bits
  })

  it('final product is exactly 2n bits', () => {
    expect(simulateBooth(5, 3, 4).productBinary.length).toBe(8)
    expect(simulateBooth(-128, -128, 8).productBinary.length).toBe(16)
  })

  it('Count decreases correctly through iterations', () => {
    const r = simulateBooth(-5, 3, 4)
    expect(r.iterations[0].countBefore).toBe(4)
    expect(r.iterations[0].countAfter).toBe(3)
    expect(r.iterations[1].countBefore).toBe(3)
    expect(r.iterations[1].countAfter).toBe(2)
    expect(r.iterations[2].countBefore).toBe(2)
    expect(r.iterations[2].countAfter).toBe(1)
    expect(r.iterations[3].countBefore).toBe(1)
    expect(r.iterations[3].countAfter).toBe(0)
    expect(r.finalState.count).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 4 — Hand-traced intermediate states: 5 × 3               */
/* ------------------------------------------------------------------ */
describe('QA: hand-traced intermediate states for 5 × 3 (4-bit)', () => {
  const r = simulateBooth(5, 3, 4)

  it('initial setup', () => {
    // M = 5 = 0101, sign-extend to 5 bits = 00101
    expect(r.internalM).toBe('00101')
    // -M = -5 = 11011 in 5 bits
    expect(r.internalNegativeM).toBe('11011')
    // Q = 3 = 0011
    expect(r.initialState.q).toBe('0011')
    // A = 00000
    expect(r.initialState.a).toBe('00000')
    expect(r.initialState.qMinus1).toBe('0')
  })

  // Iteration 1: Q₀=1, Q₋₁=0 → pair=10 → subtract (A = A - M)
  it('iteration 1: pair 10 → subtract', () => {
    const i = r.iterations[0]
    expect(i.q0).toBe('1')
    expect(i.qMinus1Before).toBe('0')
    expect(i.pair).toBe('10')
    expect(i.operation).toBe('subtract')
    // A = 00000 - 00101 = 11011
    expect(i.aAfterArithmetic).toBe('11011')
    // Arithmetic right shift [11011|0011|0]
    // Combined: 1101100110, shift → 1110110011(0 drops off)
    expect(i.aAfterShift).toBe('11101')
    expect(i.qAfterShift).toBe('1001')
    expect(i.qMinus1AfterShift).toBe('1')
  })

  // Iteration 2: Q₀=1, Q₋₁=1 → pair=11 → no operation
  it('iteration 2: pair 11 → no op', () => {
    const i = r.iterations[1]
    expect(i.q0).toBe('1')
    expect(i.qMinus1Before).toBe('1')
    expect(i.pair).toBe('11')
    expect(i.operation).toBe('none')
    expect(i.aAfterArithmetic).toBe('11101') // unchanged
    // Shift [11101|1001|1] → 1111011001
    expect(i.aAfterShift).toBe('11110')
    expect(i.qAfterShift).toBe('1100')
    expect(i.qMinus1AfterShift).toBe('1')
  })

  // Iteration 3: Q₀=0, Q₋₁=1 → pair=01 → add (A = A + M)
  it('iteration 3: pair 01 → add', () => {
    const i = r.iterations[2]
    expect(i.q0).toBe('0')
    expect(i.qMinus1Before).toBe('1')
    expect(i.pair).toBe('01')
    expect(i.operation).toBe('add')
    // A = 11110 + 00101 = 00011
    expect(i.aAfterArithmetic).toBe('00011')
    // Shift [00011|1100|1] → 0000111001 → wait let me recalculate
    // Combined before: 0001111001, after: 0000111100
    expect(i.aAfterShift).toBe('00001')
    expect(i.qAfterShift).toBe('1110')
    expect(i.qMinus1AfterShift).toBe('0')
  })

  // Iteration 4: Q₀=0, Q₋₁=0 → pair=00 → no operation
  it('iteration 4: pair 00 → no op', () => {
    const i = r.iterations[3]
    expect(i.q0).toBe('0')
    expect(i.qMinus1Before).toBe('0')
    expect(i.pair).toBe('00')
    expect(i.operation).toBe('none')
    expect(i.aAfterArithmetic).toBe('00001') // unchanged
    // Shift [00001|1110|0] → 0000011110
    expect(i.aAfterShift).toBe('00000')
    expect(i.qAfterShift).toBe('1111')
    expect(i.qMinus1AfterShift).toBe('0')
  })

  it('final product = 00001111 = 15', () => {
    // A:Q = 00000:1111 = 000001111, drop leading bit → 00001111
    expect(r.productBinary).toBe('00001111')
    expect(r.productDecimal).toBe(15n)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 5 — Hand-traced -8 × -8 (most-negative edge case)        */
/* ------------------------------------------------------------------ */
describe('QA: hand-traced -8 × -8 (4-bit)', () => {
  const r = simulateBooth(-8, -8, 4)

  it('M = -8 → internal 5-bit: 11000, -M = 01000', () => {
    expect(r.internalM).toBe('11000')
    expect(r.internalNegativeM).toBe('01000')
    expect(r.initialState.q).toBe('1000') // -8 in 4 bits
  })

  it('final product = 64', () => {
    expect(r.productDecimal).toBe(64n)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 6 — createConversion edge case: most-negative operand     */
/* ------------------------------------------------------------------ */
describe('QA: createConversion for most-negative values', () => {
  it('-8 in 4-bit', () => {
    const c = createConversion(-8n, 4)
    expect(c.decimal).toBe(-8n)
    expect(c.binary).toBe('1000')
    expect(c.isNegative).toBe(true)
    // magnitude of -8 is 8, which needs more than 4 unsigned bits
    // BUT toTwosComplement of -8 in 4 bits is valid (1000)
    // The magnitude binary for display: 8 in 4 bits would be out of range
    // Let's see what the function actually does...
  })

  it('-128 in 8-bit', () => {
    const c = createConversion(-128n, 8)
    expect(c.decimal).toBe(-128n)
    expect(c.binary).toBe('10000000')
    expect(c.isNegative).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 7 — validateOperand boundary checks                      */
/* ------------------------------------------------------------------ */
describe('QA: validateOperand boundaries', () => {
  it('accepts min and max for each width', () => {
    expect(validateOperand(-8n, 4)).toBe(true)
    expect(validateOperand(7n, 4)).toBe(true)
    expect(validateOperand(-128n, 8)).toBe(true)
    expect(validateOperand(127n, 8)).toBe(true)
  })

  it('rejects out-of-range values', () => {
    expect(validateOperand(-9n, 4)).toBe(false)
    expect(validateOperand(8n, 4)).toBe(false)
    expect(validateOperand(-129n, 8)).toBe(false)
    expect(validateOperand(128n, 8)).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  Section 8 — binary helper edge cases                             */
/* ------------------------------------------------------------------ */
describe('QA: binary helpers edge cases', () => {
  it('negateFixed of most-negative is itself (wraps in fixed width)', () => {
    // -8 in 4 bits = 1000, negate in 4 bits wraps back to 1000
    // But internally we use n+1 bits, so this is safe
    expect(negateFixed('1000')).toBe('1000') // -(-8) = 8, but 8 mod 16 = 8 → 1000
    // In 5 bits: -8 = 11000, negate = 01000 (which is +8, fits in 5 bits)
    expect(negateFixed('11000')).toBe('01000')
  })

  it('arithmetic right shift preserves sign through all register boundaries', () => {
    // Negative A, shifting through Q and Q₋₁
    const result = arithmeticRightShiftCombined('10000', '0000', '0')
    expect(result.aAfter[0]).toBe('1') // sign preserved
    expect(result.aAfter).toBe('11000')
    expect(result.qAfter).toBe('0000')
    expect(result.qMinus1After).toBe('0')
  })

  it('fromTwosComplement handles all 4-bit values', () => {
    expect(fromTwosComplement('0000')).toBe(0n)
    expect(fromTwosComplement('0001')).toBe(1n)
    expect(fromTwosComplement('0111')).toBe(7n)
    expect(fromTwosComplement('1000')).toBe(-8n)
    expect(fromTwosComplement('1111')).toBe(-1n)
  })
})
