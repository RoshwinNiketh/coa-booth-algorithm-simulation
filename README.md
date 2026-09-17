# Booth's Algorithm Simulator

A beginner-friendly educational web application for learning radix-2 Booth's algorithm for signed two's-complement multiplication. The simulator teaches the prerequisites, then exposes every register decision, arithmetic operation, combined shift, and final conversion.

## Features

- Signed 4-bit, 8-bit, and 16-bit input with clear validation
- Guided two's-complement input conversion
- Five teacher-style micro-steps for every Booth iteration
- Persistent A, Q, Q₋₁, and Count register view
- Manual navigation, auto play, pause, restart, and all-steps view
- Dynamic Booth decision-table highlighting
- Binary arithmetic and combined arithmetic-right-shift visualization
- Final 2n-bit product derivation and decimal verification
- Complete, horizontally scrollable revision trace
- Responsive and keyboard-accessible interface

## Technology

- React
- TypeScript
- Vite
- Plain CSS
- Vitest

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Test and build

```bash
npm test
npm run build
```

## Algorithm implementation

`simulateBooth(multiplicand, multiplier, bitWidth)` is a deterministic engine independent of React. It performs exactly `n` radix-2 Booth cycles and returns a structured trace containing the state before arithmetic, selected Q₀Q₋₁ rule, accumulator result, combined shift state, and completed register state.

The internal accumulator and multiplicand arithmetic path use `n+1` bits. This is essential when M is the most-negative n-bit value: for example, `-8` is representable in 4 bits but `+8` is not. Sign-extending M to 5 bits makes both M and −M representable. After all cycles, the redundant leading sign-extension bit is removed to produce the normal `2n`-bit product.

All fixed-width arithmetic uses `BigInt` and explicit binary helpers; JavaScript's 32-bit bitwise operators are not used.

## Project structure

```text
src/
  components/   Teaching sections and simulator presentation
  lib/          Fixed-width binary helpers and Booth engine
  tests/        Binary and algorithm unit tests
  types/        Structured trace types
  App.tsx       Application state and page composition
  styles.css    Responsive visual system
```
