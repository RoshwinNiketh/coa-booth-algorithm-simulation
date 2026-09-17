import type { BoothIteration, BoothPair, BoothSimulation, RegisterState } from '../types/booth'
import { BOOTH_RULES } from '../lib/booth'
import { fromTwosComplement, groupBits, invertBits } from '../lib/binary'
import { BoothRules } from './Concepts'

const MICRO_LABELS = ['Inspect', 'Decide', 'Arithmetic', 'Arithmetic right shift', 'End of iteration']

function Bits({ value, sign = false, q0 = false }: { value: string; sign?: boolean; q0?: boolean }) {
  return <span className="bits">{[...value].map((bit, index) => <span key={index} className={`${sign && index === 0 ? 'sign-bit' : ''} ${q0 && index === value.length - 1 ? 'q0-bit' : ''}`}>{bit}</span>)}</span>
}

export function RegisterView({ state, caption }: { state: RegisterState; caption: string }) {
  return (
    <div className="register-panel" aria-label={`Current registers: ${caption}`}>
      <div className="register-caption"><span className="live-dot" />{caption}<span>Count <b>{state.count}</b></span></div>
      <div className="registers">
        <div className="register-cell register-a"><div><b>A</b><small>sign</small></div><Bits value={state.a} sign /></div>
        <div className="register-cell register-q"><div><b>Q</b><small>Q₀</small></div><Bits value={state.q} q0 /></div>
        <div className="register-cell register-qm"><div><b>Q₋₁</b><small>previous</small></div><Bits value={state.qMinus1} /></div>
      </div>
      <div className="register-legend"><span><i className="key-sign" /> Sign bit</span><span><i className="key-q0" /> Q₀</span></div>
    </div>
  )
}

function ConversionBox({ title, conversion, width }: { title: string; conversion: BoothSimulation['conversions']['multiplicand']; width: number }) {
  return <article className="conversion-box"><h4>{title}</h4><div className="conversion-result"><span>Decimal</span><b>{conversion.decimal.toString()}</b><span>{width}-bit binary</span><code>{conversion.binary}</code></div>{conversion.isNegative ? <div className="conversion-work"><p>Build the negative representation:</p><div><span>Magnitude</span><code>{conversion.magnitudeBinary}</code><span>Invert</span><code>{conversion.invertedMagnitude}</code><span>Add 1</span><code>{conversion.binary}</code></div></div> : <p className="conversion-note">Positive values are written directly, padded on the left with zeros.</p>}</article>
}

export function ConversionStage({ simulation }: { simulation: BoothSimulation }) {
  const { bitWidth } = simulation.input
  return <div className="step-content"><div className="step-heading"><span className="step-number">Setup</span><div><h3>Represent the decimal inputs in binary</h3><p>Booth's algorithm operates on fixed-width two's-complement bit patterns.</p></div></div><div className="conversion-grid"><ConversionBox title="Multiplicand M" conversion={simulation.conversions.multiplicand} width={bitWidth} /><ConversionBox title="Multiplier Q" conversion={simulation.conversions.multiplier} width={bitWidth} /></div><div className="internal-width"><div><b>Why is internal M one bit wider?</b><p>A and the arithmetic path use <b>n+1 bits</b>. This makes the most-negative value safe: its positive opposite cannot fit in only n bits.</p></div><div className="width-flow"><code>{simulation.conversions.multiplicand.binary}</code><span>sign-extend →</span><code>{simulation.internalM}</code><span>negate →</span><code>{simulation.internalNegativeM}</code></div><p>When Booth needs <code>A − M</code>, hardware can add the stored two's complement <code>−M</code>.</p></div></div>
}

function ArithmeticStack({ iteration }: { iteration: BoothIteration }) {
  const operand = iteration.arithmeticOperand
  if (!operand) return <div className="no-operation"><span aria-hidden="true">—</span><div><b>No arithmetic operation is required.</b><p>A remains unchanged at <code>{iteration.aAfterArithmetic}</code>.</p></div></div>
  const symbol = iteration.operation === 'add' ? '+' : '−'
  const operandLabel = 'M'
  return <div className="arithmetic-layout"><div className="vertical-math" aria-label={`${iteration.aBefore} ${iteration.operation} ${iteration.m}`}><div><span>A before</span><code>{iteration.aBefore}</code></div><div><span>{symbol} {operandLabel}</span><code>{iteration.m}</code></div><hr /><div><span>A after</span><code>{iteration.aAfterArithmetic}</code></div></div><div className="math-explanation"><b>{iteration.operation === 'add' ? 'Add M to A.' : 'Subtract M from A.'}</b><p>{iteration.operation === 'subtract' ? <>Internally, subtraction is addition of −M: <code>{iteration.negativeM}</code>.</> : <>Both values use the same n+1-bit arithmetic width.</>}</p></div></div>
}

function ShiftVisualizer({ iteration }: { iteration: BoothIteration }) {
  const beforeA = iteration.aAfterArithmetic
  const afterA = iteration.aAfterShift
  return <div className="shift-visualizer"><div className="shift-row labels"><span>A</span><span>Q</span><span>Q₋₁</span></div><div className="shift-row"><code><b>{beforeA[0]}</b>{beforeA.slice(1)}</code><code>{iteration.qBefore}</code><code>{iteration.qMinus1Before}</code></div><div className="movement"><span>sign copied ↘</span><span>A's LSB → Q's MSB</span><span>Q's LSB → Q₋₁</span><span>old bit discarded</span></div><div className="shift-arrow" aria-hidden="true">↓ arithmetic right shift</div><div className="shift-row shifted"><code><b>{afterA[0]}</b>{afterA.slice(1)}</code><code>{iteration.qAfterShift}</code><code>{iteration.qMinus1AfterShift}</code></div><div className="combined-values"><span>Before <code>{iteration.combinedBeforeShift}</code></span><span>After <code>{iteration.combinedAfterShift}</code></span></div></div>
}

export function IterationStep({ iteration, microStep }: { iteration: BoothIteration; microStep: number }) {
  const headings = [
    ['Inspect Q₀ and Q₋₁', 'The rightmost bit of Q and the remembered bit form Booth’s decision pair.'],
    ['Apply the Booth rule', `The pair ${iteration.pair} selects exactly one rule.`],
    ['Update the accumulator', 'Arithmetic happens before the combined register shifts.'],
    ['Shift A, Q, and Q₋₁ together', 'The register boundaries do not stop bits from moving across them.'],
    ['Record the completed cycle', 'One multiplier bit has been processed, so Count decreases by one.'],
  ]
  return <div className="step-content"><div className="step-heading"><span className="step-number">{microStep + 1}/5</span><div><div className="iteration-tag">Iteration {iteration.iteration}</div><h3>{headings[microStep][0]}</h3><p>{headings[microStep][1]}</p></div></div>
    {microStep === 0 && <div className="inspect-grid"><div><span>Q</span><Bits value={iteration.qBefore} q0 /></div><div><span>Q₀</span><code>{iteration.q0}</code></div><div><span>Q₋₁</span><code>{iteration.qMinus1Before}</code></div><div className="pair-result"><span>Pair</span><code>{iteration.pair}</code></div><p>Q₀ is the rightmost bit of Q. Here Q₀ is <b>{iteration.q0}</b> and Q₋₁ is <b>{iteration.qMinus1Before}</b>, so the pair is <b>{iteration.pair}</b>.</p></div>}
    {microStep === 1 && <div className="decision-card"><code>{iteration.pair}</code><span>→</span><div><b>{iteration.operationLabel}</b><p>{BOOTH_RULES[iteration.pair].explanation}</p></div></div>}
    {microStep === 2 && <ArithmeticStack iteration={iteration} />}
    {microStep === 3 && <><ShiftVisualizer iteration={iteration} /><p className="teacher-note"><b>Why copy the sign?</b> A is a signed two's-complement value. Copying its original leftmost bit makes this an arithmetic—not logical—right shift.</p></>}
    {microStep === 4 && <div className="cycle-summary"><div><span>A</span><code>{iteration.aAfterShift}</code></div><div><span>Q</span><code>{iteration.qAfterShift}</code></div><div><span>Q₋₁</span><code>{iteration.qMinus1AfterShift}</code></div><div><span>Count</span><code>{iteration.countAfter}</code></div><p><b>One Booth cycle is complete.</b> {iteration.countAfter > 0 ? `${iteration.countAfter} multiplier bit${iteration.countAfter === 1 ? '' : 's'} remain, so we repeat the same five steps.` : 'Count is now zero, so multiplication is complete.'}</p></div>}
  </div>
}

export function FinalResult({ simulation }: { simulation: BoothSimulation }) {
  const negative = simulation.productBinary[0] === '1'
  const inverted = invertBits(simulation.productBinary)
  const magnitude = negative ? -fromTwosComplement(simulation.productBinary) : fromTwosComplement(simulation.productBinary)
  return <div className="step-content final-result"><div className="step-heading"><span className="step-number">Done</span><div><h3>Read the final 2n-bit product</h3><p>The internal A:Q has one redundant sign-extension bit. Remove only that leading bit—not any product bit.</p></div></div><div className="final-registers"><div><span>Final A</span><code>{simulation.finalState.a}</code></div><div className="colon">:</div><div><span>Final Q</span><code>{simulation.finalState.q}</code></div></div><div className="trim-demo"><span>Internal A:Q</span><code><del>{simulation.internalAQ[0]}</del>{simulation.internalAQ.slice(1)}</code><span>Normal {simulation.input.bitWidth * 2}-bit product</span><code>{groupBits(simulation.productBinary)}</code></div><div className="decimal-proof"><h4>Convert the product back to decimal</h4>{negative ? <><p>The most-significant bit is <b>1</b>, so the result is negative.</p><div><span>Product</span><code>{simulation.productBinary}</code><span>Invert</span><code>{inverted}</code><span>Add 1</span><code>{magnitude.toString(2).padStart(simulation.productBinary.length, '0')}</code><span>Magnitude</span><code>{magnitude.toString()}₁₀</code></div></> : <p>The most-significant bit is <b>0</b>, so read <code>{simulation.productBinary}</code> directly as a positive binary value: <b>{magnitude.toString()}₁₀</b>.</p>}</div><div className="answer-banner"><span>{simulation.input.multiplicand.toString()} × {simulation.input.multiplier.toString()}</span><b>= {simulation.productDecimal.toString()}</b></div><div className="verification"><span aria-hidden="true">✓</span><div><b>Result verified</b><p>Booth result: {simulation.productDecimal.toString()} · Direct decimal multiplication: {simulation.directProduct.toString()}</p></div></div></div>
}

export function StepProgress({ current, total, simulation }: { current: number; total: number; simulation: BoothSimulation }) {
  let label = 'Input conversion'
  let iterationText = 'Setup'
  if (current > 0 && current < total - 1) { const flat = current - 1; const iteration = Math.floor(flat / 5) + 1; const micro = flat % 5; label = `${MICRO_LABELS[micro]}`; iterationText = `Iteration ${iteration} of ${simulation.input.bitWidth} · Step ${micro + 1} of 5` }
  if (current === total - 1) { label = 'Final result'; iterationText = 'Complete' }
  return <div className="step-progress"><div><b>{iterationText}</b><span>{label}</span></div><div className="progress-track" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}><span style={{ width: `${((current + 1) / total) * 100}%` }} /></div><small>{current + 1} / {total}</small></div>
}

export function TraceTable({ simulation }: { simulation: BoothSimulation }) {
  return <section className="trace-section"><div className="section-heading compact"><div><div className="section-kicker">Exam revision</div><h2>Full trace table</h2></div><p>A compact summary of all {simulation.iterations.length} cycles.</p></div><div className="table-scroll trace-scroll"><table className="trace-table"><thead><tr><th>Iteration</th><th>A before</th><th>Q before</th><th>Q₋₁</th><th>Pair</th><th>Operation</th><th>A after operation</th><th>A after shift</th><th>Q after shift</th><th>Q₋₁ after</th><th>Count</th></tr></thead><tbody>{simulation.iterations.map((item) => <tr key={item.iteration}><td>{item.iteration}</td><td>{item.aBefore}</td><td>{item.qBefore}</td><td>{item.qMinus1Before}</td><td><b>{item.pair}</b></td><td>{item.operationLabel}</td><td>{item.aAfterArithmetic}</td><td>{item.aAfterShift}</td><td>{item.qAfterShift}</td><td>{item.qMinus1AfterShift}</td><td>{item.countAfter}</td></tr>)}</tbody></table></div></section>
}

export function AllSteps({ simulation }: { simulation: BoothSimulation }) {
  return <div className="all-steps"><h3>All Booth cycles</h3>{simulation.iterations.map((iteration) => <details key={iteration.iteration} open={iteration.iteration === 1}><summary><span>Iteration {iteration.iteration}</span><code>{iteration.pair}</code><b>{iteration.operationLabel}</b><span>A: {iteration.aBefore} → {iteration.aAfterShift}</span></summary><div className="all-step-body">{[0,1,2,3,4].map((micro) => <div key={micro} className="all-micro"><IterationStep iteration={iteration} microStep={micro} /></div>)}</div></details>)}</div>
}

export function activePairAt(step: number, simulation: BoothSimulation): BoothPair | undefined {
  if (step <= 0 || step >= simulation.iterations.length * 5 + 1) return undefined
  return simulation.iterations[Math.floor((step - 1) / 5)]?.pair
}

export function stateAt(step: number, simulation: BoothSimulation): { state: RegisterState; caption: string } {
  if (step <= 0) return { state: simulation.initialState, caption: 'Initial state' }
  const finalIndex = simulation.iterations.length * 5 + 1
  if (step >= finalIndex) return { state: simulation.finalState, caption: 'Final state' }
  const flat = step - 1
  const iteration = simulation.iterations[Math.floor(flat / 5)]
  const micro = flat % 5
  if (micro === 2 || micro === 3) return { state: { a: iteration.aAfterArithmetic, q: iteration.qBefore, qMinus1: iteration.qMinus1Before, count: iteration.countBefore }, caption: `Iteration ${iteration.iteration} · after arithmetic` }
  if (micro === 4) return { state: { a: iteration.aAfterShift, q: iteration.qAfterShift, qMinus1: iteration.qMinus1AfterShift, count: iteration.countAfter }, caption: `Iteration ${iteration.iteration} · cycle complete` }
  return { state: { a: iteration.aBefore, q: iteration.qBefore, qMinus1: iteration.qMinus1Before, count: iteration.countBefore }, caption: `Iteration ${iteration.iteration} · before operation` }
}

export function StepView({ step, simulation }: { step: number; simulation: BoothSimulation }) {
  const finalIndex = simulation.iterations.length * 5 + 1
  if (step === 0) return <ConversionStage simulation={simulation} />
  if (step === finalIndex) return <FinalResult simulation={simulation} />
  const flat = step - 1
  return <IterationStep iteration={simulation.iterations[Math.floor(flat / 5)]} microStep={flat % 5} />
}

export function ContextRules({ pair }: { pair?: BoothPair }) { return <BoothRules activePair={pair} /> }
