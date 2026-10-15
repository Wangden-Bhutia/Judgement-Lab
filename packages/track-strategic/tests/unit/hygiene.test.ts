/**
 * Source-hygiene checks (acting as lint rules):
 *  - no Math.random anywhere in the engine;
 *  - no floating-point operations in solver code (only rational.ts may convert to Number for display,
 *    only rng.ts may use Math.imul/Math.floor for 32-bit integer mixing);
 *  - no policing / law-enforcement vocabulary in engine code, tests or fixtures (neutral everyday stories only).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const srcFiles = walk(join(root, 'src')).filter((f) => f.endsWith('.ts'));
// The floating-point-arithmetic check below is specifically about solver
// purity (ported from @strategos/engine, which lived in its own package
// with nothing else in its src/ tree). contentPort/ is the separately-
// ported content-rendering layer (render.ts etc.), which legitimately
// converts exact rationals to display numbers -- exactly what rational.ts
// itself is already allowed to do, just in a different file now that both
// layers share one package. Excluded from that one check only.
const solverFiles = srcFiles.filter((f) => !relative(root, f).split(sep).includes('contentPort'));
const testFiles = walk(join(root, 'tests')).filter((f) => /\.(ts|json|md)$/.test(f));
const repo = join(root, '..', '..');
const docFiles = [
  join(repo, 'docs', 'DECISIONS.md'),
  ...walk(join(repo, 'apps', 'web', 'src')).filter((f) => /\.(ts|tsx|md)$/.test(f)),
];

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('engine source hygiene', () => {
  it('never uses Math.random', () => {
    for (const f of srcFiles) expect(stripComments(readFileSync(f, 'utf8')), relative(root, f)).not.toMatch(/Math\.random/);
  });

  it('has no floating-point arithmetic in solver code', () => {
    for (const f of solverFiles) {
      const rel = relative(root, f);
      const code = stripComments(readFileSync(f, 'utf8'));
      expect(code, rel).not.toMatch(/parseFloat|toFixed|toPrecision|Number\.EPSILON/);
      expect(code, rel).not.toMatch(/(?<![\w.'"/-])\d+\.\d+(?![\w.])/); // float literals
      if (!rel.endsWith('rng.ts')) expect(code, rel).not.toMatch(/Math\./);
      if (!rel.endsWith('rational.ts')) expect(code, rel).not.toMatch(/(?<![\w.])Number\(/);
    }
  });

  it('contains no policing or law-enforcement vocabulary', () => {
    const banned = /\b(police|policing|patrol\w*|crime\w*|criminal\w*|suspects?|arrest\w*|jail\w*|detective\w*|officers?|cops?|enforcement|interrogat\w*|inspect\w*|offenders?|sheriff\w*|warrants?|convict\w*|sentenc\w*|prison(?!er'?s[ _]dilemma|ers_dilemma)\w*)\b/i;
    for (const f of [...srcFiles, ...testFiles, ...docFiles]) {
      if (f.endsWith('hygiene.test.ts')) continue;
      const text = readFileSync(f, 'utf8').replace(/Prisoner\\?'s Dilemma|prisoners_dilemma/gi, '');
      expect(text, relative(root, f)).not.toMatch(banned);
    }
  });
});
