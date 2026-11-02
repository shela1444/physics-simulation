# Sources and content notes

## Authority

1. `phy data booklet v1-2.pdf`
   - First assessment 2025, version 1.2.
   - Authority for equation lines, topic order, SL/HL vs HL-only blocks, page numbers, and printed notation.

2. `IB Physics 2025 guide.pdf`
   - Used for terminology and context where a symbol is ambiguous.
   - Example: the angle in `tan θ = v/c` is the angle between a moving particle's world line and the time axis on a space-time diagram.

3. Public 2025 equation lists
   - Used as a transcription scaffold only.
   - Any public-list formula not confirmed in the booklet was excluded.
   - The public lists are not the final authority and their equation counts are not used.

## Coverage reconciliation

| Theme | Booklet pages | Equations | Prompts |
|---|---:|---:|---:|
| A. Space, time and motion | 6–7 | 42 | 154 |
| B. The particulate nature of matter | 8–9 | 36 | 120 |
| C. Wave behaviour | 10–11 | 19 | 75 |
| D. Fields | 12–13 | 21 | 88 |
| E. Nuclear and quantum physics | 13 | 12 | 45 |
| **Total** |  | **130** | **482** |

Level split:

- SL/HL: 70 equation lines.
- HL only: 60 equation lines.

Topics C.4 and E.4 are present in the syllabus but print no equations in this edition of the data booklet.

## Counting rule

One printed equation line equals one record. Chained forms stay together:

- `F = ma = Δp/Δt` is one record.
- `PV = nRT = Nk_BT` is one record.

A compound symbol is one prompt: `Δp`, `k_B`, `E_k`, `θ_c`, and `T₁/₂` are not split into separate letters.

## What is asked

Asked:

- Physical quantities.
- Physical constants when they appear in an equation: `G`, `c`, `h`, `k_B`, `R`, `N_A`, `σ`, `ε_0`, `μ_0`, `R_0`.
- `e` as emissivity in `P = eσAT⁴`; Euler's number in `e^(−λt)` is not graded.
- Named quantities in word equations, such as `path difference`, `emissivity`, and `albedo`.

Not asked:

- Arithmetic factors.
- Operators and functions (`sin`, `cos`, `tan`, `ln`, `Σ`).
- `π`.
- Euler's number in `e^(−λt)`.
- Pure numerical constants such as `13.6` or `2.9 × 10⁻³`.

## Per-equation, not per-letter

The answer key is scoped to each equation. The same letter can mean different things:

- `L`: angular momentum, length, specific latent heat, or luminosity.
- `k`: spring constant, thermal conductivity, or Coulomb constant.
- `R`: resistance, molar gas constant, nuclear radius, or equivalent resistance.
- `λ`: wavelength or decay constant.
- `Φ`: magnetic flux or work function.
- `T`: period or thermodynamic temperature.

## Common definitional equivalents

The matcher also accepts common definitional phrasings for core quantities, for example:

- density: “mass per unit volume”
- pressure: “force per unit area”
- potential difference: “work done per unit charge”
- electric field strength: “force per unit charge”
- magnetic flux: “magnetic flux density times area”
- efficiency: “useful output divided by total input”
- work function: “minimum energy needed to remove an electron from a metal surface”

These are maintained in `assets/js/answer-matcher.js` under `COMMON_ALIASES` and are
applied only when the canonical label matches exactly. The canonical answer and the
per-symbol aliases remain the audit reference shown in `coverage.html`.

## Known editorial decisions

- `distance travelled` is accepted for displacement where the booklet is using magnitude-only kinematics.
- `speed` is accepted for velocity where the booklet uses magnitude-only notation, and the accepted aliases are explicit per prompt.
- The `emissivity` and `albedo` equations are word definitions. The named quantity is included as a prompt so those equations are represented in the quiz.
- The `path difference` phrase is included as a prompt for the two interference conditions.

## Review

Open `coverage.html` to inspect every equation, source page, level, symbol, canonical answer, accepted aliases, and unit.

For editing, open `review.html`:

1. Use the high-risk queue or the by-symbol view first.
2. Edit canonical answers, aliases, and units inline.
3. Mark reviewed or flag uncertain entries.
4. Export a `changes.json` review file.
5. For multiple reviewers, open **Merge review files** and import all review files.
6. Resolve any same-prompt conflicts manually.
7. Download the unified replacement `curriculum.js`.
8. Replace `data/curriculum.js`.
9. Run the tests and re-open `coverage.html`.

```bash
node tests/run-tests.js
```

Review drafts stay in browser `localStorage`; the page cannot write to the repository.
