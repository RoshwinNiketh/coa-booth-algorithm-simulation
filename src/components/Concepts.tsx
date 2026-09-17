import { BOOTH_RULES } from '../lib/booth'
import type { BoothPair } from '../types/booth'

export function Term({ label, meaning }: { label: string; meaning: string }) {
  return <abbr className="term" title={meaning}>{label}</abbr>
}

export function Prerequisites() {
  return (
    <section id="learn" className="section shell">
      <div className="section-heading">
        <div><div className="section-kicker">Before we start</div><h2>Three ideas unlock the algorithm</h2></div>
        <p>You only need signed ranges, two's complement, and one special kind of shift.</p>
      </div>
      <div className="lesson-grid">
        <article>
          <span className="lesson-number">01</span><h3>Signed binary range</h3>
          <p>With <em>n</em> bits, the leftmost bit has signed meaning. The range is:</p>
          <code>−2ⁿ⁻¹ to 2ⁿ⁻¹ − 1</code>
          <div className="mini-example"><b>4-bit</b><span>−8 to +7</span><b>8-bit</b><span>−128 to +127</span></div>
        </article>
        <article>
          <span className="lesson-number">02</span><h3>Two's complement</h3>
          <p>Positive 5 is <code className="inline-code">0101</code>. To form −5, invert every bit, then add 1.</p>
          <div className="binary-stack"><span>+5</span><code>0101</code><span>Invert</span><code>1010</code><span>Add 1</span><code>1011</code></div>
          <p className="callout-note">So −5 in 4 bits is <b className="mono">1011</b>. Its leftmost <b>1</b> is the sign bit.</p>
        </article>
        <article>
          <span className="lesson-number">03</span><h3>Arithmetic right shift</h3>
          <p>A logical shift inserts 0. An arithmetic shift copies the original sign bit, preserving the signed value's direction.</p>
          <div className="shift-example"><span>Before</span><code><b>1</b>101</code><span>Arithmetic shift</span><code><b>1</b>110</code></div>
          <p className="callout-note">Another <b>1</b> enters from the left because the original sign bit was 1.</p>
        </article>
      </div>
    </section>
  )
}

export function RegisterGuide() {
  const registers = [
    ['M', 'Multiplicand', 'The number being multiplied.'],
    ['−M', 'Negated multiplicand', 'The fixed-width two’s-complement negative of M, used for subtraction.'],
    ['A', 'Accumulator', 'Holds the partial result. Internally it uses n+1 bits for safety.'],
    ['Q', 'Multiplier', 'Starts with the multiplier and later holds the lower product bits.'],
    ['Q₀', 'Current bit', 'The rightmost, least-significant bit of Q.'],
    ['Q₋₁', 'Previous-bit register', 'Remembers the previous least-significant state. It begins at 0.'],
    ['Count', 'Cycles remaining', 'Starts at n and decreases after each complete Booth cycle.'],
  ]
  return (
    <section className="section section-tinted">
      <div className="shell">
        <div className="section-heading"><div><div className="section-kicker">The machine's memory</div><h2>Registers used</h2></div><p>Think of each register as a small fixed-width storage box.</p></div>
        <div className="register-guide">{registers.map(([symbol, title, text]) => <article key={symbol}><code>{symbol}</code><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
        <div className="formula-strip"><span>For an n-bit multiplication</span><code>A = n+1 bits</code><code>Q = n bits</code><code>Q₋₁ = 1 bit</code><code>Count = n</code></div>
      </div>
    </section>
  )
}

export function BoothRules({ activePair }: { activePair?: BoothPair }) {
  return (
    <section className="rules-card" aria-label="Booth decision rule">
      <div className="rules-intro"><div className="section-kicker">Booth decision rule</div><h2>Read the pair from left to right</h2><p><Term label="Q₀" meaning="The current rightmost bit of Q." /> is followed by <Term label="Q₋₁" meaning="The one-bit memory of the previous least-significant state." />.</p></div>
      <div className="table-scroll"><table className="rules-table"><thead><tr><th>Q₀</th><th>Q₋₁</th><th>Operation</th><th>What it means</th></tr></thead><tbody>
        {(Object.keys(BOOTH_RULES) as BoothPair[]).map((pair) => <tr key={pair} className={activePair === pair ? 'active-rule' : ''}><td>{pair[0]}</td><td>{pair[1]}</td><td><b>{BOOTH_RULES[pair].label}</b></td><td>{BOOTH_RULES[pair].explanation}</td></tr>)}
      </tbody></table></div>
    </section>
  )
}

export function WhyItWorks() {
  return (
    <section className="section shell why-works">
      <div className="section-heading"><div><div className="section-kicker">The intuition</div><h2>Why Booth's algorithm works</h2></div><p>Q₋₁ lets the hardware notice boundaries instead of treating every 1 separately.</p></div>
      <div className="run-visual" aria-label="Binary run of ones in 00111100">
        {['0','0','1','1','1','1','0','0'].map((bit, index) => <span key={index} className={index >= 2 && index <= 5 ? 'run-bit' : ''}>{bit}{index === 2 && <small>start</small>}{index === 5 && <small>end</small>}</span>)}
      </div>
      <div className="why-copy"><p><code>00111100₂</code> contains one consecutive run of 1s. Adjacent pairs reveal where that run begins and ends. Booth turns those transitions into a subtraction and an addition at the right shifted positions.</p><p>This can reduce arithmetic for long runs of 1s—but it does <strong>not</strong> guarantee fewer operations for every multiplier.</p></div>
    </section>
  )
}

export function HardwareDiagram() {
  return (
    <section id="hardware" className="section hardware-section"><div className="shell">
      <div className="section-heading"><div><div className="section-kicker">Simple hardware view</div><h2>From rule to registers</h2></div><p>Control logic coordinates one repeated data path.</p></div>
      <div className="hardware-layout">
        <div className="hardware-diagram" role="img" aria-label="M feeds an adder and subtractor connected to A, Q and Q minus 1. Q zero and Q minus 1 feed control logic, with a Count register.">
          <div className="hw-node hw-m">M <small>multiplicand</small></div><span className="hw-arrow a1">→</span>
          <div className="hw-node hw-alu">Adder / Subtractor</div><span className="hw-arrow a2">↓</span>
          <div className="hw-node hw-a">A <small>accumulator</small></div><span className="hw-arrow a3">↓</span>
          <div className="hw-node hw-q">Q <small>multiplier</small></div><span className="hw-arrow a4">↓</span>
          <div className="hw-node hw-qm">Q₋₁</div>
          <div className="hw-node hw-control">Control Logic <small>reads Q₀Q₋₁</small></div><span className="hw-arrow a5">↗</span>
          <div className="hw-node hw-count">Count <small>cycles left</small></div>
        </div>
        <ol className="hardware-notes"><li>Registers hold the operands and partial product.</li><li>Control logic inspects Q₀Q₋₁ and selects the operation.</li><li>The adder/subtractor changes A when needed.</li><li>A, Q, and Q₋₁ shift together as one register.</li><li>Count reaches zero after exactly n cycles.</li></ol>
      </div>
    </div></section>
  )
}
