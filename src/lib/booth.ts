import type { BitWidth, BoothOperation, BoothPair, BoothSimulation, ConversionDetail } from '../types/booth'
import { addFixed, arithmeticRightShiftCombined, invertBits, negateFixed, signExtend, signedRange, subtractFixed, toTwosComplement, unsignedToBinary, fromTwosComplement } from './binary'

export const BOOTH_RULES: Record<BoothPair, { operation: BoothOperation; label: string; explanation: string }> = {
  '00': { operation: 'none', label: 'No arithmetic operation', explanation: 'No transition has occurred, so A stays unchanged before the shift.' },
  '01': { operation: 'add', label: 'A = A + M', explanation: 'This marks the end of a run of 1s, so add M to A.' },
  '10': { operation: 'subtract', label: 'A = A − M', explanation: 'This marks the beginning of a run of 1s, so subtract M from A.' },
  '11': { operation: 'none', label: 'No arithmetic operation', explanation: 'We are inside a run of 1s, so A stays unchanged before the shift.' },
}

export function createConversion(value: bigint, width: number): ConversionDetail {
  const binary = toTwosComplement(value, width)
  const magnitude = value < 0n ? -value : value
  const magnitudeBinary = unsignedToBinary(magnitude, width)
  return {
    decimal: value,
    binary,
    magnitudeBinary,
    invertedMagnitude: value < 0n ? invertBits(magnitudeBinary) : null,
    isNegative: value < 0n,
  }
}

export function validateOperand(value: bigint, width: BitWidth) {
  const { min, max } = signedRange(width)
  return value >= min && value <= max
}

export function simulateBooth(multiplicand: number | bigint, multiplier: number | bigint, bitWidth: BitWidth): BoothSimulation {
  const mDecimal = BigInt(multiplicand)
  const qDecimal = BigInt(multiplier)
  if (![4, 8, 16].includes(bitWidth)) throw new Error('Bit width must be 4, 8, or 16.')
  if (!validateOperand(mDecimal, bitWidth) || !validateOperand(qDecimal, bitWidth)) {
    const { min, max } = signedRange(bitWidth)
    throw new Error(`Operands must be inside the signed ${bitWidth}-bit range ${min} to ${max}.`)
  }

  const mBits = toTwosComplement(mDecimal, bitWidth)
  let q = toTwosComplement(qDecimal, bitWidth)
  const internalM = signExtend(mBits, bitWidth + 1)
  const internalNegativeM = negateFixed(internalM)
  let a = '0'.repeat(bitWidth + 1)
  let qMinus1: '0' | '1' = '0'
  const initialState = { a, q, qMinus1, count: bitWidth }
  const iterations = []

  for (let index = 0; index < bitWidth; index += 1) {
    const q0 = q.at(-1) as '0' | '1'
    const pair = `${q0}${qMinus1}` as BoothPair
    const rule = BOOTH_RULES[pair]
    const aBefore = a
    const qBefore = q
    const qMinus1Before = qMinus1
    let aAfterArithmetic = a
    let arithmeticOperand: string | null = null
    if (rule.operation === 'add') {
      arithmeticOperand = internalM
      aAfterArithmetic = addFixed(a, internalM)
    } else if (rule.operation === 'subtract') {
      arithmeticOperand = internalNegativeM
      aAfterArithmetic = subtractFixed(a, internalM)
    }
    const shifted = arithmeticRightShiftCombined(aAfterArithmetic, q, qMinus1)
    const countBefore = bitWidth - index
    a = shifted.aAfter
    q = shifted.qAfter
    qMinus1 = shifted.qMinus1After
    iterations.push({
      iteration: index + 1,
      countBefore,
      aBefore,
      qBefore,
      qMinus1Before,
      q0,
      pair,
      operation: rule.operation,
      operationLabel: rule.label,
      m: internalM,
      negativeM: internalNegativeM,
      aAfterArithmetic,
      arithmeticOperand,
      combinedBeforeShift: shifted.combinedBefore,
      combinedAfterShift: shifted.combinedAfter,
      aAfterShift: a,
      qAfterShift: q,
      qMinus1AfterShift: qMinus1,
      countAfter: countBefore - 1,
    })
  }

  const internalAQ = `${a}${q}`
  const productBinary = internalAQ.slice(1)
  const productDecimal = fromTwosComplement(productBinary)
  return {
    input: { multiplicand: mDecimal, multiplier: qDecimal, bitWidth },
    conversions: { multiplicand: createConversion(mDecimal, bitWidth), multiplier: createConversion(qDecimal, bitWidth), negativeM: internalNegativeM },
    internalM,
    internalNegativeM,
    initialState,
    iterations,
    finalState: { a, q, qMinus1, count: 0 },
    internalAQ,
    productBinary,
    productDecimal,
    directProduct: mDecimal * qDecimal,
  }
}
