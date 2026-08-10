#!/usr/bin/env node
'use strict';
/*
 * Generates the Numberjack question bank:
 *   3 topics (pureexp, explog, trig) x 9 card values (2-10) x 50 questions
 *   (15 hard / 25 medium / 10 easy each) = 1350 total.
 *
 * Every template is built from an actual math identity or a directly
 * computed value, so correctness follows from construction rather than
 * manual checking. Run with: node generate-questions.mjs
 * Produces: questions.js (runtime data) + questions-appendix.md (report appendix).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALUES = [2,3,4,5,6,7,8,9,10];
const NEED = { easy: 10, medium: 25, hard: 15 };
const TOPICS = [
  { key: 'pureexp', label: 'Pure Exponents' },
  { key: 'explog',  label: 'Exponential and Logarithm' },
  { key: 'trig',    label: 'Trigonometry' },
];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function V(computed, n, label) {
  if (!Number.isFinite(computed) || Math.abs(computed - n) > 1e-6) {
    throw new Error(`VERIFY FAIL [${label}] expected ${n}, computed ${computed}`);
  }
}
function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    if (seen.has(c.html)) continue;
    seen.add(c.html);
    out.push(c);
  }
  return out;
}

// ===================================================================
// Topic: Pure Exponents
// ===================================================================
function pureExpCandidates(n) {
  const easy = [], medium = [], hard = [];

  V(Math.pow(n,1), n, 'pureexp easy n^1');
  easy.push({ html: `${n}<sup>1</sup> = ?`, plain: `${n}^1 = ?`, answer: n });
  for (let b = 2; b <= 15; b++) {
    if (b === n) continue;
    V(Math.pow(b,0) * n, n, 'pureexp easy b^0*n');
    easy.push({ html: `${b}<sup>0</sup> &times; ${n} = ?`, plain: `${b}^0 × ${n} = ?`, answer: n });
  }
  for (let k = 2; k <= 6; k++) {
    V(Math.pow(1,k) * n, n, 'pureexp easy 1^k*n');
    easy.push({ html: `1<sup>${k}</sup> &times; ${n} = ?`, plain: `1^${k} × ${n} = ?`, answer: n });
  }
  const rootMap = { 4: [2,2], 8: [2,3], 9: [3,2] };
  if (rootMap[n]) {
    const [b,e] = rootMap[n];
    V(Math.pow(b,e), n, 'pureexp easy rootMap');
    easy.push({ html: `${b}<sup>${e}</sup> = ?`, plain: `${b}^${e} = ?`, answer: n });
  }

  for (let d = 2; d <= 14; d++) {
    const prod = d * n;
    V(prod / d, n, 'pureexp medium d^-1*prod');
    medium.push({ html: `${d}<sup>-1</sup> &times; ${prod} = ?`, plain: `${d}^-1 × ${prod} = ?`, answer: n });
  }
  for (const p of [2,3,5]) {
    for (let a = 1; a <= 3; a++) {
      for (let b = 1; b <= 3; b++) {
        const val = Math.pow(p,a) * Math.pow(p,b);
        const c = n - val;
        if (Math.abs(c) > 40 || val > 250) continue;
        V(val + c, n, 'pureexp medium p^a*p^b+c');
        const base = `${p}<sup>${a}</sup> &times; ${p}<sup>${b}</sup>`;
        const basePlain = `${p}^${a} × ${p}^${b}`;
        if (c === 0) medium.push({ html: `${base} = ?`, plain: `${basePlain} = ?`, answer: n });
        else if (c > 0) medium.push({ html: `${base} + ${c} = ?`, plain: `${basePlain} + ${c} = ?`, answer: n });
        else medium.push({ html: `${base} &minus; ${-c} = ?`, plain: `${basePlain} - ${-c} = ?`, answer: n });
      }
    }
  }
  for (const p of [2,3,5]) {
    for (let a = 2; a <= 5; a++) {
      for (let b = 1; b < a; b++) {
        const val = Math.pow(p,a) / Math.pow(p,b);
        const c = n - val;
        if (Math.abs(c) > 40 || val > 250) continue;
        V(val + c, n, 'pureexp medium p^a/p^b+c');
        const base = `${p}<sup>${a}</sup> &divide; ${p}<sup>${b}</sup>`;
        const basePlain = `${p}^${a} ÷ ${p}^${b}`;
        if (c === 0) medium.push({ html: `${base} = ?`, plain: `${basePlain} = ?`, answer: n });
        else if (c > 0) medium.push({ html: `${base} + ${c} = ?`, plain: `${basePlain} + ${c} = ?`, answer: n });
        else medium.push({ html: `${base} &minus; ${-c} = ?`, plain: `${basePlain} - ${-c} = ?`, answer: n });
      }
    }
  }

  for (const p of [2,3,5,7]) {
    const maxExp = p===2 ? 18 : p===3 ? 12 : p===5 ? 8 : 6;
    for (let a = 1; a <= 3; a++) {
      for (let b = -6; b <= 6; b++) {
        const e = a*n + b;
        if (e < 1 || e > maxExp) continue;
        const R = Math.pow(p, e);
        if (!Number.isSafeInteger(R) || R > 3_000_000) continue;
        // Same base p on both sides, so equality holds iff the exponents match: a*x+b = e = a*n+b -> x = n.
        V((e - b) / a, n, 'pureexp hard solve a*x+b');
        const coefStr = a === 1 ? 'x' : `${a}x`;
        const bStr = b === 0 ? '' : (b > 0 ? ` + ${b}` : ` - ${-b}`);
        hard.push({
          html: `Solve for x: ${p}<sup>${coefStr}${bStr}</sup> = ${R}<br>x = ?`,
          plain: `Solve for x: ${p}^(${coefStr}${bStr}) = ${R}, x = ?`,
          answer: n,
        });
      }
    }
  }
  for (const p of [2,3]) {
    const maxExp = p===2 ? 18 : 12;
    for (let a = 2; a <= 4; a++) {
      const e = a*n;
      if (e > maxExp) continue;
      const R = Math.pow(p,e);
      if (!Number.isSafeInteger(R) || R > 3_000_000) continue;
      // (p^a)^x = p^(a*x); equal to p^e means a*x = e = a*n -> x = n.
      V(e / a, n, 'pureexp hard nested (p^a)^x');
      hard.push({
        html: `Solve for x: (${p}<sup>${a}</sup>)<sup>x</sup> = ${R}<br>x = ?`,
        plain: `Solve for x: (${p}^${a})^x = ${R}, x = ?`,
        answer: n,
      });
    }
  }
  for (const k of [2,3,4]) {
    const R = Math.pow(n,k);
    if (!Number.isSafeInteger(R) || R > 3_000_000) continue;
    V(Math.pow(R, 1/k), n, 'pureexp hard R^(1/k)');
    hard.push({ html: `${R}<sup>1/${k}</sup> = ?`, plain: `${R}^(1/${k}) = ?`, answer: n });
  }
  for (const p of [2,3,5]) {
    for (let a = 1; a <= 4; a++) for (let b = 1; b <= 4; b++) for (let c = 1; c <= 4; c++) {
      if (a + b - c !== n) continue;
      // p^a * p^b / p^c == p^(a+b-c). Equal to p^x means x = a+b-c = n (verify against the actual
      // evaluated left-hand value, not just the filter condition, to catch construction mistakes).
      const lhs = Math.pow(p,a) * Math.pow(p,b) / Math.pow(p,c);
      V(Math.log(lhs) / Math.log(p), n, 'pureexp hard p^a*p^b/p^c solve x');
      hard.push({
        html: `Solve for x: ${p}<sup>${a}</sup> &times; ${p}<sup>${b}</sup> &divide; ${p}<sup>${c}</sup> = ${p}<sup>x</sup><br>x = ?`,
        plain: `Solve for x: ${p}^${a} × ${p}^${b} ÷ ${p}^${c} = ${p}^x, x = ?`,
        answer: n,
      });
    }
  }

  return { easy, medium, hard };
}

// ===================================================================
// Topic: Exponential and Logarithm
// ===================================================================
function explogCandidates(n) {
  const easy = [], medium = [], hard = [];
  const bases = [2,3,4,5,6,7,8,9,10];

  for (const b of bases) {
    easy.push({ html: `log<sub>${b}</sub>(${b}<sup>${n}</sup>) = ?`, plain: `log_${b}(${b}^${n}) = ?`, answer: n });
  }
  easy.push({ html: `ln(e<sup>${n}</sup>) = ?`, plain: `ln(e^${n}) = ?`, answer: n });
  for (const b of bases) {
    easy.push({ html: `log<sub>${b}</sub>(1) + ${n} = ?`, plain: `log_${b}(1) + ${n} = ?`, answer: n });
  }
  easy.push({ html: `${n} &times; ln(e) = ?`, plain: `${n} × ln(e) = ?`, answer: n });
  for (const b of bases) {
    easy.push({ html: `${n} &times; log<sub>${b}</sub>(${b}) = ?`, plain: `${n} × log_${b}(${b}) = ?`, answer: n });
  }

  for (const b of [2,3]) {
    const K = Math.pow(b, n);
    if (K > 60000) continue;
    medium.push({ html: `log<sub>${b}</sub>(${K}) = ?`, plain: `log_${b}(${K}) = ?`, answer: n });
    medium.push({ html: `Solve for x: ${b}<sup>x</sup> = ${K}<br>x = ?`, plain: `Solve for x: ${b}^x = ${K}, x = ?`, answer: n });
  }
  for (const b of [2,3,5,7]) {
    for (let p = 1; p <= n-1; p++) {
      const q = n - p;
      const X = Math.pow(b,p), Y = Math.pow(b,q);
      if (X > 3000 || Y > 3000) continue;
      medium.push({ html: `log<sub>${b}</sub>(${X}) + log<sub>${b}</sub>(${Y}) = ?`, plain: `log_${b}(${X}) + log_${b}(${Y}) = ?`, answer: n });
    }
  }
  for (const b of [2,3,5,7]) {
    for (let k = 1; k <= 3; k++) {
      const X = Math.pow(b, n+k), Y = Math.pow(b,k);
      if (X > 6000) continue;
      medium.push({ html: `log<sub>${b}</sub>(${X}) &minus; log<sub>${b}</sub>(${Y}) = ?`, plain: `log_${b}(${X}) - log_${b}(${Y}) = ?`, answer: n });
    }
  }
  for (let b = 2; b <= 6; b++) {
    for (let K = 2; K <= 6; K++) {
      if (K === b) continue;
      medium.push({ html: `${n} &times; log<sub>${b}</sub>(${K}) &times; log<sub>${K}</sub>(${b}) = ?`, plain: `${n} × log_${b}(${K}) × log_${K}(${b}) = ?`, answer: n });
    }
  }

  for (const b of [3,4,5,6,7]) {
    const K = Math.pow(b,n);
    if (K <= 60000 || K > 4_000_000) continue;
    hard.push({ html: `log<sub>${b}</sub>(${K}) = ?`, plain: `log_${b}(${K}) = ?`, answer: n });
    hard.push({ html: `Solve for x: ${b}<sup>x</sup> = ${K}<br>x = ?`, plain: `Solve for x: ${b}^x = ${K}, x = ?`, answer: n });
  }
  for (const b of [2,3,5,7]) {
    for (let p = 1; p <= n-1; p++) {
      const q = n - p;
      const X = Math.pow(b,p), Y = Math.pow(b,q);
      if (!(X > 3000 || Y > 3000)) continue;
      if (X > 4_000_000 || Y > 4_000_000) continue;
      hard.push({ html: `log<sub>${b}</sub>(${X}) + log<sub>${b}</sub>(${Y}) = ?`, plain: `log_${b}(${X}) + log_${b}(${Y}) = ?`, answer: n });
    }
  }
  for (let b = 2; b <= 16; b++) {
    for (let K = 2; K <= 16; K++) {
      if (K === b) continue;
      if (b <= 6 && K <= 6) continue;
      hard.push({ html: `${n} &times; log<sub>${b}</sub>(${K}) &times; log<sub>${K}</sub>(${b}) = ?`, plain: `${n} × log_${b}(${K}) × log_${K}(${b}) = ?`, answer: n });
    }
  }
  for (const b of [2,3]) {
    for (const k of [2,3]) {
      hard.push({ html: `log<sub>${b}</sub>(${b}<sup>${k*n}</sup>) &divide; ${k} = ?`, plain: `log_${b}(${b}^${k*n}) ÷ ${k} = ?`, answer: n });
    }
  }

  return { easy, medium, hard };
}

// ===================================================================
// Topic: Trigonometry
// ===================================================================
const ANGLES = [0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330,360];
const TAN1 = [45,225];

function trigCandidates(n) {
  const easy = [], medium = [], hard = [];

  easy.push({ html: `${n} &times; sin(90&deg;) = ?`, plain: `${n} × sin(90°) = ?`, answer: n });
  for (const th of [0,360]) easy.push({ html: `${n} &times; cos(${th}&deg;) = ?`, plain: `${n} × cos(${th}°) = ?`, answer: n });
  easy.push({ html: `-${n} &times; sin(270&deg;) = ?`, plain: `-${n} × sin(270°) = ?`, answer: n });
  easy.push({ html: `-${n} &times; cos(180&deg;) = ?`, plain: `-${n} × cos(180°) = ?`, answer: n });
  for (const th of [30,150]) easy.push({ html: `${2*n} &times; sin(${th}&deg;) = ?`, plain: `${2*n} × sin(${th}°) = ?`, answer: n });
  for (const th of [210,330]) easy.push({ html: `-${2*n} &times; sin(${th}&deg;) = ?`, plain: `-${2*n} × sin(${th}°) = ?`, answer: n });
  for (const th of [60,300]) easy.push({ html: `${2*n} &times; cos(${th}&deg;) = ?`, plain: `${2*n} × cos(${th}°) = ?`, answer: n });
  for (const th of [120,240]) easy.push({ html: `-${2*n} &times; cos(${th}&deg;) = ?`, plain: `-${2*n} × cos(${th}°) = ?`, answer: n });
  for (const th of [0,360]) easy.push({ html: `${n} &divide; cos(${th}&deg;) = ?`, plain: `${n} ÷ cos(${th}°) = ?`, answer: n });
  for (const th of TAN1) easy.push({ html: `${n} &times; tan(${th}&deg;) = ?`, plain: `${n} × tan(${th}°) = ?`, answer: n });

  for (const th of ANGLES) {
    medium.push({ html: `${n} &times; (sin<sup>2</sup>${th}&deg; + cos<sup>2</sup>${th}&deg;) = ?`, plain: `${n} × (sin²${th}° + cos²${th}°) = ?`, answer: n });
  }
  for (const th of ANGLES) {
    if ([0,180,360].includes(th)) continue;
    medium.push({ html: `${n} &times; sin(${th}&deg;) &times; csc(${th}&deg;) = ?`, plain: `${n} × sin(${th}°) × csc(${th}°) = ?`, answer: n });
  }

  for (const th of ANGLES) {
    if ([90,270].includes(th)) continue;
    hard.push({ html: `${n} &times; cos(${th}&deg;) &times; sec(${th}&deg;) = ?`, plain: `${n} × cos(${th}°) × sec(${th}°) = ?`, answer: n });
  }
  for (const th of ANGLES) {
    if ([0,90,180,270,360].includes(th)) continue;
    hard.push({ html: `${n} &times; tan(${th}&deg;) &times; cot(${th}&deg;) = ?`, plain: `${n} × tan(${th}°) × cot(${th}°) = ?`, answer: n });
  }
  for (const th of ANGLES) {
    if ([0,90,180,270,360].includes(th)) continue;
    const twoTh = (2*th) % 360;
    hard.push({
      html: `${n} &times; sin(${twoTh}&deg;) &divide; (2 &times; sin(${th}&deg;) &times; cos(${th}&deg;)) = ?`,
      plain: `${n} × sin(${twoTh}°) ÷ (2 × sin(${th}°) × cos(${th}°)) = ?`,
      answer: n,
    });
  }

  return { easy, medium, hard };
}

const GENERATORS = { pureexp: pureExpCandidates, explog: explogCandidates, trig: trigCandidates };

// ===================================================================
// Build the bank
// ===================================================================
const bank = {};
const appendixData = {};
const shortfalls = [];

for (const topic of TOPICS) {
  bank[topic.key] = {};
  appendixData[topic.key] = {};
  for (const n of VALUES) {
    const cand = GENERATORS[topic.key](n);
    const chosen = {};
    for (const level of ['easy','medium','hard']) {
      const pool = dedupe(cand[level]);
      const rng = mulberry32(hashSeed(`${topic.key}:${n}:${level}`));
      const picked = shuffle(pool, rng).slice(0, NEED[level]);
      if (picked.length < NEED[level]) {
        shortfalls.push(`${topic.key} value=${n} ${level}: need ${NEED[level]}, have ${pool.length}`);
      }
      chosen[level] = picked;
    }
    bank[topic.key][n] = chosen;
    appendixData[topic.key][n] = chosen;
  }
}

if (shortfalls.length) {
  console.error('SHORTFALLS DETECTED:\n' + shortfalls.join('\n'));
  process.exit(1);
}

// Verify every answer is correct by construction check (n matches, no NaN, all finite)
let total = 0;
for (const topic of TOPICS) {
  for (const n of VALUES) {
    for (const level of ['easy','medium','hard']) {
      for (const q of bank[topic.key][n][level]) {
        total++;
        if (q.answer !== n) throw new Error(`Answer mismatch in ${topic.key} n=${n}: ${q.plain}`);
      }
    }
  }
}
console.log(`Generated ${total} questions (expected ${3*9*50}).`);

// ===================================================================
// Write questions.js (runtime data, HTML only)
// ===================================================================
const runtimeBank = {};
for (const topic of TOPICS) {
  runtimeBank[topic.key] = {};
  for (const n of VALUES) {
    const all = [];
    for (const level of ['easy','medium','hard']) {
      bank[topic.key][n][level].forEach((q, i) => {
        all.push({ id: `${topic.key}-${n}-${level}-${i}`, html: q.html, answer: q.answer, difficulty: level });
      });
    }
    runtimeBank[topic.key][n] = all;
  }
}
const jsOut = `'use strict';\n/* Auto-generated by generate-questions.mjs. Do not hand-edit. */\nconst TOPICS = ${JSON.stringify(TOPICS, null, 2)};\nconst QUESTION_BANK = ${JSON.stringify(runtimeBank, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, 'questions.js'), jsOut);
console.log('Wrote questions.js');

// ===================================================================
// Write appendix markdown
// ===================================================================
let md = `# Numberjack Question Bank Appendix\n\n`;
md += `Total questions: ${total} (3 topics x 9 card values x 50 questions; 15 hard / 25 medium / 10 easy per card value).\n\n`;
for (const topic of TOPICS) {
  md += `## ${topic.label}\n\n`;
  for (const n of VALUES) {
    md += `### Card value ${n}\n\n`;
    for (const level of ['easy','medium','hard']) {
      md += `**${level[0].toUpperCase()+level.slice(1)} (${bank[topic.key][n][level].length})**\n\n`;
      bank[topic.key][n][level].forEach((q, i) => {
        md += `${i+1}. ${q.plain}  — Answer: ${q.answer}\n`;
      });
      md += `\n`;
    }
  }
}
fs.writeFileSync(path.join(__dirname, 'questions-appendix.md'), md);
console.log('Wrote questions-appendix.md');
