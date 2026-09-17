import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { simulateBooth } from './lib/booth'
import { signedRange } from './lib/binary'
import type { BitWidth, BoothSimulation } from './types/booth'
import { BoothRules, HardwareDiagram, Prerequisites, RegisterGuide, WhyItWorks } from './components/Concepts'
import { activePairAt, AllSteps, ContextRules, RegisterView, stateAt, StepProgress, StepView, TraceTable } from './components/Simulator'

const PRESETS: Array<{ m: number; q: number; label: string }> = [
  { m: 3, q: -4, label: '3 × −4' },
  { m: -5, q: 3, label: '−5 × 3' },
  { m: -5, q: -3, label: '−5 × −3' },
  { m: -8, q: 2, label: '−8 × 2' },
]

function parseInput(raw: string, name: string, width: BitWidth) {
  if (raw.trim() === '') return { error: `${name} is blank. Enter a whole decimal number.` }
  if (!/^-?\d+$/.test(raw.trim())) return { error: `${name} must be a whole decimal integer. Fractions and other characters are not allowed.` }
  const value = BigInt(raw.trim())
  const { min, max } = signedRange(width)
  if (value < min || value > max) return { error: `${value} cannot be represented as a signed ${width}-bit two's-complement number. The valid range is ${min} to +${max}. Choose a larger bit width or enter a value inside this range.` }
  return { value }
}

export default function App() {
  const [mInput, setMInput] = useState('-5')
  const [qInput, setQInput] = useState('3')
  const [width, setWidth] = useState<BitWidth>(4)
  const [error, setError] = useState('')
  const [simulation, setSimulation] = useState<BoothSimulation | null>(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const simulatorRef = useRef<HTMLElement>(null)
  const { min, max } = signedRange(width)
  const totalSteps = simulation ? simulation.iterations.length * 5 + 2 : 0

  useEffect(() => {
    if (!playing || !simulation) return
    if (step >= totalSteps - 1) { setPlaying(false); return }
    const timer = window.setTimeout(() => setStep((current) => Math.min(current + 1, totalSteps - 1)), 1500)
    return () => window.clearTimeout(timer)
  }, [playing, simulation, step, totalSteps])

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const registration = context.registerTool({
      name: 'start_booth_simulation',
      title: 'Start Booth simulation',
      description: 'Validate signed operands, generate the complete radix-2 Booth trace, and show its input-conversion stage in the visible simulator.',
      inputSchema: {
        type: 'object',
        properties: {
          multiplicand: { type: 'integer', description: 'Signed decimal multiplicand M.' },
          multiplier: { type: 'integer', description: 'Signed decimal multiplier Q.' },
          bitWidth: { type: 'integer', enum: [4, 8, 16] },
        },
        required: ['multiplicand', 'multiplier', 'bitWidth'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object') throw new Error('Expected multiplicand, multiplier, and bitWidth.')
        const candidate = input as Record<string, unknown>
        if (!Number.isInteger(candidate.multiplicand) || !Number.isInteger(candidate.multiplier) || ![4, 8, 16].includes(candidate.bitWidth as number)) throw new Error('Operands must be integers and bitWidth must be 4, 8, or 16.')
        const requestedWidth = candidate.bitWidth as BitWidth
        const m = BigInt(candidate.multiplicand as number)
        const q = BigInt(candidate.multiplier as number)
        const mCheck = parseInput(m.toString(), 'Multiplicand M', requestedWidth)
        const qCheck = parseInput(q.toString(), 'Multiplier Q', requestedWidth)
        if (mCheck.error || qCheck.error) throw new Error(mCheck.error ?? qCheck.error)
        const result = simulateBooth(m, q, requestedWidth)
        setMInput(m.toString()); setQInput(q.toString()); setWidth(requestedWidth); setSimulation(result)
        setStep(0); setPlaying(false); setShowAll(false); setError('')
        window.setTimeout(() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
        return { status: 'ready', productDecimal: result.productDecimal.toString(), productBinary: result.productBinary, iterations: result.iterations.length }
      },
    }, { signal: lifecycle.signal })
    Promise.resolve(registration).catch(() => undefined)
    return () => lifecycle.abort()
  }, [])

  const registerState = useMemo(() => simulation ? stateAt(step, simulation) : null, [step, simulation])
  const activePair = simulation ? activePairAt(step, simulation) : undefined

  function start(event?: FormEvent) {
    event?.preventDefault()
    const m = parseInput(mInput, 'Multiplicand M', width)
    const q = parseInput(qInput, 'Multiplier Q', width)
    if (m.error || q.error || m.value === undefined || q.value === undefined) { setError(m.error ?? q.error ?? 'Please check both values.'); return }
    const result = simulateBooth(m.value, q.value, width)
    setSimulation(result); setStep(0); setPlaying(false); setShowAll(false); setError('')
    window.setTimeout(() => simulatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function reset() { setMInput('-5'); setQInput('3'); setWidth(4); setError(''); setSimulation(null); setStep(0); setPlaying(false); setShowAll(false) }
  function choosePreset(m: number, q: number) { setMInput(String(m)); setQInput(String(q)); setWidth(4); setError(''); setSimulation(null); setPlaying(false) }

  return <>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">B</span> Booth Lab</a><nav aria-label="Page sections"><a href="#learn">Learn</a><a href="#simulator">Simulator</a><a href="#hardware">Hardware</a></nav></header>
    <main id="top">
      <section className="intro shell"><div className="eyebrow">COA · Signed binary multiplication</div><h1>Booth's Algorithm<br /><span>Simulator</span></h1><p className="lede">Learn signed binary multiplication step by step. Inspect every decision, arithmetic operation, and shift—not just the final answer.</p><p className="intro-author">By Roshwin Niketh M</p><div className="why-grid"><article><b>Signed by design</b><p>Handles positive and negative two's-complement operands systematically.</p></article><article><b>Transition-aware</b><p>Recognizes the beginning and end of runs of 1s in the multiplier.</p></article><article><b>Fully observable</b><p>Keeps A, Q, Q₋₁, and Count visible through every micro-step.</p></article></div><p className="intro-note">Booth's method can shorten some runs of additions, but it does not always use fewer arithmetic operations.</p></section>
      <Prerequisites />
      <RegisterGuide />
      <section className="section shell"><BoothRules /></section>

      <section id="simulator" ref={simulatorRef} className="simulator-section">
        <div className="shell"><div className="section-heading simulator-title"><div><div className="section-kicker">Interactive workspace</div><h2>Run the registers yourself</h2></div><p>Choose signed decimal operands. The trace is generated only by radix-2 Booth cycles.</p></div>
          <form className="input-card" onSubmit={start} noValidate>
            <label htmlFor="multiplicand">Multiplicand M<input id="multiplicand" inputMode="numeric" value={mInput} onChange={(e) => { setMInput(e.target.value); setError('') }} aria-describedby="valid-range" /></label>
            <span className="operator" aria-hidden="true">×</span>
            <label htmlFor="multiplier">Multiplier Q<input id="multiplier" inputMode="numeric" value={qInput} onChange={(e) => { setQInput(e.target.value); setError('') }} aria-describedby="valid-range" /></label>
            <label htmlFor="bit-width">Bit width<select id="bit-width" value={width} onChange={(e) => { setWidth(Number(e.target.value) as BitWidth); setError(''); setSimulation(null); setPlaying(false) }}><option value="4">4-bit</option><option value="8">8-bit</option><option value="16">16-bit</option></select></label>
            <button className="primary-button" type="submit">Start simulation <span aria-hidden="true">→</span></button>
            <button className="secondary-button" type="button" onClick={reset}>Reset</button>
          </form>
          <div className="input-meta"><p id="valid-range">{width}-bit signed range: <code>{min.toString()}</code> to <code>+{max.toString()}</code></p><div className="presets"><span>Try an example:</span>{PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => choosePreset(preset.m, preset.q)}>{preset.label}</button>)}</div></div>
          {error && <div className="validation-error" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}

          {!simulation && <div className="empty-simulator"><div className="empty-register"><span>A</span><code>00000</code><span>Q</span><code>0011</code><span>Q₋₁</span><code>0</code></div><div><b>Your trace will appear here.</b><p>The preloaded −5 × 3 example is a good first run. Nothing starts until you press the button.</p></div></div>}

          {simulation && registerState && <div className="simulation-workspace">
            <div className="sticky-register"><RegisterView state={registerState.state} caption={registerState.caption} /></div>
            <StepProgress current={step} total={totalSteps} simulation={simulation} />
            <div className="interactive-step" aria-live="polite"><StepView step={step} simulation={simulation} /></div>
            <div className="simulation-controls" aria-label="Simulation controls">
              <button type="button" className="secondary-button" onClick={() => { setStep((value) => Math.max(0, value - 1)); setPlaying(false) }} disabled={step === 0}>← Previous step</button>
              <button type="button" className="primary-button" onClick={() => { setStep((value) => Math.min(totalSteps - 1, value + 1)); setPlaying(false) }} disabled={step === totalSteps - 1}>Next step →</button>
              <span className="control-divider" />
              <button type="button" className="quiet-button" onClick={() => setPlaying((value) => !value)} disabled={step === totalSteps - 1}>{playing ? '❚❚ Pause' : '▶ Auto play'}</button>
              <button type="button" className="quiet-button" onClick={() => { setStep(0); setPlaying(false) }}>↺ Restart simulation</button>
              <button type="button" className="quiet-button" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>{showAll ? 'Hide all steps' : 'Show all steps'}</button>
            </div>
            <ContextRules pair={activePair} />
            {showAll && <AllSteps simulation={simulation} />}
            <TraceTable simulation={simulation} />
          </div>}
        </div>
      </section>
      <WhyItWorks />
      <HardwareDiagram />
      <section className="section shell glossary"><div className="section-heading"><div><div className="section-kicker">Quick help</div><h2>Beginner glossary</h2></div><p>Short definitions for the notation used throughout the simulator.</p></div><dl><div><dt>M</dt><dd>The multiplicand—the number being multiplied.</dd></div><div><dt>−M</dt><dd>The n+1-bit negated multiplicand used to implement subtraction.</dd></div><div><dt>A</dt><dd>The accumulator holding the current partial result.</dd></div><div><dt>Q / Q₀</dt><dd>The multiplier register / its current rightmost bit.</dd></div><div><dt>Q₋₁</dt><dd>A one-bit memory used to detect transitions between 0 and 1.</dd></div><div><dt>Sign extension</dt><dd>Copying the sign bit into new leading positions when widening a signed value.</dd></div><div><dt>Arithmetic shift</dt><dd>A right shift that preserves the signed value's original sign bit.</dd></div><div><dt>Count</dt><dd>The number of Booth cycles still to perform.</dd></div></dl></section>
    </main>
    <footer><div className="shell"><span><b>Booth Lab</b> · Radix-2 signed multiplication</span><span>Built for Computer Organization & Architecture</span></div></footer>
  </>
}
