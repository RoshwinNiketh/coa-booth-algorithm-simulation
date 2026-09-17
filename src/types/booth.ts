export type BitWidth = 4 | 8 | 16
export type BoothPair = '00' | '01' | '10' | '11'
export type BoothOperation = 'none' | 'add' | 'subtract'

export interface RegisterState {
  a: string
  q: string
  qMinus1: '0' | '1'
  count: number
}

export interface BoothIteration {
  iteration: number
  countBefore: number
  aBefore: string
  qBefore: string
  qMinus1Before: '0' | '1'
  q0: '0' | '1'
  pair: BoothPair
  operation: BoothOperation
  operationLabel: string
  m: string
  negativeM: string
  aAfterArithmetic: string
  arithmeticOperand: string | null
  combinedBeforeShift: string
  combinedAfterShift: string
  aAfterShift: string
  qAfterShift: string
  qMinus1AfterShift: '0' | '1'
  countAfter: number
}

export interface ConversionDetail {
  decimal: bigint
  binary: string
  magnitudeBinary: string
  invertedMagnitude: string | null
  isNegative: boolean
}

export interface BoothSimulation {
  input: { multiplicand: bigint; multiplier: bigint; bitWidth: BitWidth }
  conversions: { multiplicand: ConversionDetail; multiplier: ConversionDetail; negativeM: string }
  internalM: string
  internalNegativeM: string
  initialState: RegisterState
  iterations: BoothIteration[]
  finalState: RegisterState
  internalAQ: string
  productBinary: string
  productDecimal: bigint
  directProduct: bigint
}
