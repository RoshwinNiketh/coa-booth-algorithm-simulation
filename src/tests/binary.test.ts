import { describe, expect, it } from 'vitest'
import { addFixed, arithmeticRightShiftCombined, fromTwosComplement, negateFixed, signExtend, signedRange, subtractFixed, toTwosComplement } from '../lib/binary'

describe('fixed-width binary helpers', () => {
  it('calculates signed ranges', () => {
    expect(signedRange(4)).toEqual({ min: -8n, max: 7n })
    expect(signedRange(8)).toEqual({ min: -128n, max: 127n })
  })

  it('converts between decimal and two’s complement', () => {
    expect(toTwosComplement(-5n, 4)).toBe('1011')
    expect(toTwosComplement(7n, 4)).toBe('0111')
    expect(fromTwosComplement('1011')).toBe(-5n)
  })

  it('sign extends and negates without losing the minimum operand', () => {
    expect(signExtend('1000', 5)).toBe('11000')
    expect(negateFixed('11000')).toBe('01000')
  })

  it('wraps addition and subtraction to a fixed width', () => {
    expect(addFixed('0111', '0001')).toBe('1000')
    expect(subtractFixed('0000', '1011')).toBe('0101')
  })

  it('preserves A’s sign and moves bits across register boundaries', () => {
    expect(arithmeticRightShiftCombined('11011', '0011', '0')).toEqual({
      combinedBefore: '1101100110',
      combinedAfter: '1110110011',
      aAfter: '11101',
      qAfter: '1001',
      qMinus1After: '1',
    })
  })
})
