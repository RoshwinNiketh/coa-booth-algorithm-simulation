import { describe, expect, it } from 'vitest'
import { BOOTH_RULES, simulateBooth } from '../lib/booth'
import type { BitWidth } from '../types/booth'

describe('radix-2 Booth simulation', () => {
  const cases: Array<[number, number, BitWidth, number]> = [
    [5, 3, 4, 15], [-5, 3, 4, -15], [5, -3, 4, -15], [-5, -3, 4, 15],
    [0, 7, 4, 0], [7, 0, 4, 0], [7, 1, 4, 7], [7, -1, 4, -7],
    [-1, 7, 4, -7], [7, 7, 4, 49], [-8, 2, 4, -16], [-8, -1, 4, 8],
    [-8, -8, 4, 64], [7, -8, 4, -56], [-128, 127, 8, -16256],
    [-128, -128, 8, 16384], [127, 127, 8, 16129],
    [-32768, 32767, 16, -1073709056], [-32768, -32768, 16, 1073741824],
  ]

  it.each(cases)('%i × %i at %i bits = %i', (m, q, width, expected) => {
    const result = simulateBooth(m, q, width)
    expect(result.productDecimal).toBe(BigInt(expected))
    expect(result.productBinary).toHaveLength(width * 2)
    expect(result.iterations).toHaveLength(width)
    expect(result.initialState.qMinus1).toBe('0')
    expect(result.directProduct).toBe(result.productDecimal)
  })

  it('maps all four decision pairs correctly', () => {
    expect(BOOTH_RULES['00'].operation).toBe('none')
    expect(BOOTH_RULES['01'].operation).toBe('add')
    expect(BOOTH_RULES['10'].operation).toBe('subtract')
    expect(BOOTH_RULES['11'].operation).toBe('none')
  })

  it('records known intermediate states for -5 × 3', () => {
    const result = simulateBooth(-5, 3, 4)
    expect(result.internalM).toBe('11011')
    expect(result.internalNegativeM).toBe('00101')
    expect(result.iterations[0]).toMatchObject({
      pair: '10', aBefore: '00000', aAfterArithmetic: '00101',
      aAfterShift: '00010', qAfterShift: '1001', qMinus1AfterShift: '1',
    })
  })

  it('matches direct multiplication for every pair of 4-bit operands', () => {
    for (let m = -8; m <= 7; m += 1) {
      for (let q = -8; q <= 7; q += 1) {
        expect(simulateBooth(m, q, 4).productDecimal).toBe(BigInt(m * q))
      }
    }
  })
})
