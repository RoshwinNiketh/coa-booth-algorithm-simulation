export function signedRange(width: number) {
  if (!Number.isInteger(width) || width < 2) throw new Error('Width must be an integer of at least 2 bits.')
  const half = 1n << BigInt(width - 1)
  return { min: -half, max: half - 1n }
}

function modulus(width: number) {
  return 1n << BigInt(width)
}

export function normalizeToWidth(value: bigint, width: number) {
  const mod = modulus(width)
  return ((value % mod) + mod) % mod
}

export function toTwosComplement(value: bigint, width: number) {
  const { min, max } = signedRange(width)
  if (value < min || value > max) throw new Error(`${value} is outside the signed ${width}-bit range.`)
  return normalizeToWidth(value, width).toString(2).padStart(width, '0')
}

export function unsignedToBinary(value: bigint, width: number) {
  if (value < 0n || value >= modulus(width)) throw new Error(`${value} does not fit in ${width} unsigned bits.`)
  return value.toString(2).padStart(width, '0')
}

export function fromTwosComplement(binary: string) {
  assertBinary(binary)
  const unsigned = BigInt(`0b${binary}`)
  return binary[0] === '1' ? unsigned - modulus(binary.length) : unsigned
}

export function signExtend(binary: string, newWidth: number) {
  assertBinary(binary)
  if (newWidth < binary.length) throw new Error('Sign extension cannot make a value narrower.')
  return binary[0].repeat(newWidth - binary.length) + binary
}

export function invertBits(binary: string) {
  assertBinary(binary)
  return [...binary].map((bit) => bit === '0' ? '1' : '0').join('')
}

export function negateFixed(binary: string) {
  assertBinary(binary)
  return unsignedToBinary(normalizeToWidth(-fromTwosComplement(binary), binary.length), binary.length)
}

export function addFixed(left: string, right: string) {
  assertSameWidth(left, right)
  const result = fromTwosComplement(left) + fromTwosComplement(right)
  return unsignedToBinary(normalizeToWidth(result, left.length), left.length)
}

export function subtractFixed(left: string, right: string) {
  assertSameWidth(left, right)
  const result = fromTwosComplement(left) - fromTwosComplement(right)
  return unsignedToBinary(normalizeToWidth(result, left.length), left.length)
}

export function arithmeticRightShiftCombined(a: string, q: string, qMinus1: '0' | '1') {
  assertBinary(a)
  assertBinary(q)
  const combinedBefore = `${a}${q}${qMinus1}`
  const combinedAfter = combinedBefore[0] + combinedBefore.slice(0, -1)
  const aAfter = combinedAfter.slice(0, a.length)
  const qAfter = combinedAfter.slice(a.length, a.length + q.length)
  const qMinus1After = combinedAfter.at(-1) as '0' | '1'
  return { combinedBefore, combinedAfter, aAfter, qAfter, qMinus1After }
}

export function groupBits(binary: string, groupSize = 4) {
  assertBinary(binary)
  const first = binary.length % groupSize || groupSize
  const groups = [binary.slice(0, first)]
  for (let index = first; index < binary.length; index += groupSize) groups.push(binary.slice(index, index + groupSize))
  return groups.join(' ')
}

function assertBinary(binary: string) {
  if (!/^[01]+$/.test(binary)) throw new Error(`Expected a binary string, received "${binary}".`)
}

function assertSameWidth(left: string, right: string) {
  assertBinary(left)
  assertBinary(right)
  if (left.length !== right.length) throw new Error('Fixed-width operands must have the same width.')
}
