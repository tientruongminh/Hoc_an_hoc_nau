/**
 * Ô ăn quan — pure rules engine + AI (no Phaser dependency).
 *
 * Board ring (12 cells):
 *   index 0      = left quan cell
 *   index 1..5   = side A's row (human, bottom row, left → right)
 *   index 6      = right quan cell
 *   index 7..11  = side B's row (top row, right → left visually)
 * Dir 1 walks toward increasing index, Dir -1 toward decreasing index (wrapping).
 *
 * Scoring follows the chapter 1 script: dân = 1 point, quan = 5 points.
 *
 * Borrowing (rải quân khi hết dân): when a side starts its turn with an empty row it
 * places 1 dân in each of its 5 cells, paid from its own captured dân. If it has
 * fewer than 5, the shortfall is borrowed from the opponent's captured dân and
 * recorded in `debt`; debt is repaid (transferred back) when the game ends.
 * If both sides together cannot cover the 5 dân, the game ends.
 */

export type Side = 'A' | 'B';
export type Dir = 1 | -1;

export interface Cell {
  dan: number;
  quan: number;
}

export interface Captured {
  dan: number;
  quan: number;
}

export interface GameOptions {
  /** A quan cell holding its quan with fewer than 5 dân cannot be captured. */
  protectQuanNon: boolean;
  /** Who moves first. */
  firstTurn: Side;
  /** Safety cap: the game is force-ended after this many moves. */
  maxTurns: number;
}

export interface GameState {
  cells: Cell[];
  turn: Side;
  captured: Record<Side, Captured>;
  /** Dân each side has borrowed from the opponent to refill its row. */
  debt: Record<Side, number>;
  turns: number;
  over: boolean;
  opts: GameOptions;
}

export interface Move {
  cell: number;
  dir: Dir;
}

export type SowEvent =
  | { type: 'pickup'; cell: number; count: number }
  | { type: 'sow'; cell: number }
  | { type: 'capture'; cell: number; dan: number; quan: number }
  | { type: 'refill'; side: Side }
  | { type: 'turnEnd' }
  | { type: 'gameOver'; scoreA: number; scoreB: number };

export const QUAN_CELLS = [0, 6] as const;
export const ROW: Record<Side, readonly number[]> = {
  A: [1, 2, 3, 4, 5],
  B: [7, 8, 9, 10, 11],
};
export const QUAN_VALUE = 5;

const RING = 12;
const SOW_ITERATION_CAP = 2000;

const DEFAULT_OPTS: GameOptions = { protectQuanNon: true, firstTurn: 'A', maxTurns: 400 };

const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');
const wrap = (i: number): number => ((i % RING) + RING) % RING;
const isQuanCell = (i: number): boolean => i === 0 || i === 6;
const stones = (c: Cell): number => c.dan + c.quan;

export function createGame(opts: Partial<GameOptions> = {}): GameState {
  const o = { ...DEFAULT_OPTS, ...opts };
  const cells: Cell[] = [];
  for (let i = 0; i < RING; i++) cells.push(isQuanCell(i) ? { dan: 0, quan: 1 } : { dan: 5, quan: 0 });
  return {
    cells,
    turn: o.firstTurn,
    captured: { A: { dan: 0, quan: 0 }, B: { dan: 0, quan: 0 } },
    debt: { A: 0, B: 0 },
    turns: 0,
    over: false,
    opts: o,
  };
}

function clone(s: GameState): GameState {
  return {
    cells: s.cells.map((c) => ({ dan: c.dan, quan: c.quan })),
    turn: s.turn,
    captured: { A: { ...s.captured.A }, B: { ...s.captured.B } },
    debt: { ...s.debt },
    turns: s.turns,
    over: s.over,
    opts: s.opts,
  };
}

export function legalMoves(s: GameState): Move[] {
  if (s.over) return [];
  const moves: Move[] = [];
  for (const cell of ROW[s.turn]) {
    if (s.cells[cell].dan > 0) {
      moves.push({ cell, dir: 1 }, { cell, dir: -1 });
    }
  }
  return moves;
}

/** Points a side currently holds (captured only; board dân are counted at game end). */
export function score(s: GameState, side: Side): number {
  const c = s.captured[side];
  return c.dan + QUAN_VALUE * c.quan;
}

export function isOver(s: GameState): boolean {
  return s.over;
}

function canCapture(s: GameState, i: number): boolean {
  const c = s.cells[i];
  if (stones(c) === 0) return false;
  if (s.opts.protectQuanNon && isQuanCell(i) && c.quan > 0 && c.dan < 5) return false;
  return true;
}

/** Mutating core: plays `m` on `s`. Pushes events when `ev` is given. */
function play(s: GameState, m: Move, ev: SowEvent[] | null): void {
  const mover = s.turn;
  const cells = s.cells;
  let pos = m.cell;
  let hand = cells[pos].dan;
  cells[pos].dan = 0;
  ev?.push({ type: 'pickup', cell: pos, count: hand });

  let guard = 0;
  // Sow, then resolve what happens after the last stone, repeating on pickups.
  outer: while (guard++ < SOW_ITERATION_CAP) {
    while (hand > 0) {
      pos = wrap(pos + m.dir);
      cells[pos].dan++;
      hand--;
      ev?.push({ type: 'sow', cell: pos });
    }
    let next = wrap(pos + m.dir);
    // Keep sowing from a non-empty dân cell.
    if (stones(cells[next]) > 0) {
      if (isQuanCell(next)) break;
      pos = next;
      hand = cells[pos].dan;
      cells[pos].dan = 0;
      ev?.push({ type: 'pickup', cell: pos, count: hand });
      continue;
    }
    // Empty cell ahead: capture chain "empty, non-empty".
    while (guard++ < SOW_ITERATION_CAP) {
      const target = wrap(next + m.dir);
      if (!canCapture(s, target)) break outer;
      const c = cells[target];
      ev?.push({ type: 'capture', cell: target, dan: c.dan, quan: c.quan });
      s.captured[mover].dan += c.dan;
      s.captured[mover].quan += c.quan;
      c.dan = 0;
      c.quan = 0;
      next = wrap(target + m.dir);
      if (stones(cells[next]) > 0) break outer;
    }
    break;
  }

  ev?.push({ type: 'turnEnd' });
  s.turns++;
  s.turn = other(mover);

  if (bothQuanEmpty(s) || s.turns >= s.opts.maxTurns) {
    finish(s, ev);
    return;
  }
  // Prepare the next side's turn: refill an empty row.
  const side = s.turn;
  if (ROW[side].every((i) => cells[i].dan === 0)) {
    const opp = other(side);
    if (s.captured[side].dan + s.captured[opp].dan < 5) {
      finish(s, ev);
      return;
    }
    const own = Math.min(5, s.captured[side].dan);
    const borrowed = 5 - own;
    s.captured[side].dan -= own;
    s.captured[opp].dan -= borrowed;
    s.debt[side] += borrowed;
    for (const i of ROW[side]) cells[i].dan = 1;
    ev?.push({ type: 'refill', side });
  }
}

function bothQuanEmpty(s: GameState): boolean {
  return QUAN_CELLS.every((i) => stones(s.cells[i]) === 0);
}

function finish(s: GameState, ev: SowEvent[] | null): void {
  for (const side of ['A', 'B'] as const) {
    for (const i of ROW[side]) {
      s.captured[side].dan += s.cells[i].dan;
      s.cells[i].dan = 0;
    }
  }
  // Leftover stones in quan cells (only on forced end) stay unscored on the board.
  for (const side of ['A', 'B'] as const) {
    const d = s.debt[side];
    if (d > 0) {
      s.captured[side].dan -= d;
      s.captured[other(side)].dan += d;
      s.debt[side] = 0;
    }
  }
  s.over = true;
  ev?.push({ type: 'gameOver', scoreA: score(s, 'A'), scoreB: score(s, 'B') });
}

export function applyMove(s: GameState, m: Move): { state: GameState; events: SowEvent[] } {
  if (s.over) throw new Error('Game is over');
  if (!ROW[s.turn].includes(m.cell) || s.cells[m.cell].dan === 0 || (m.dir !== 1 && m.dir !== -1)) {
    throw new Error(`Illegal move ${JSON.stringify(m)} for side ${s.turn}`);
  }
  const next = clone(s);
  const events: SowEvent[] = [];
  play(next, m, events);
  return { state: next, events };
}

// ---------------------------------------------------------------- AI

export type Difficulty = 'easy' | 'normal' | 'hard';
const DEPTH: Record<Difficulty, number> = { easy: 1, normal: 3, hard: 5 };

/** Score difference from `side`'s point of view, counting board dân on each row as a soft bonus. */
function evaluate(s: GameState, side: Side): number {
  const diff = score(s, side) - score(s, other(side)) - (s.debt[side] - s.debt[other(side)]) * 2;
  if (s.over) return diff * 100;
  let board = 0;
  for (const i of ROW[side]) board += s.cells[i].dan;
  for (const i of ROW[other(side)]) board -= s.cells[i].dan;
  return diff * 100 + board * 10;
}

function search(s: GameState, depth: number, alpha: number, beta: number, me: Side): number {
  if (depth === 0 || s.over) return evaluate(s, me);
  const moves = legalMoves(s);
  if (moves.length === 0) return evaluate(s, me);
  const maximizing = s.turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const child = clone(s);
    play(child, m, null);
    const v = search(child, depth - 1, alpha, beta, me);
    if (maximizing) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseAIMove(s: GameState, difficulty: Difficulty = 'normal', rng: () => number = Math.random): Move {
  const moves = legalMoves(s);
  if (moves.length === 0) throw new Error('No legal moves');
  if (difficulty === 'easy' && rng() < 0.3) return moves[Math.floor(rng() * moves.length)];
  const me = s.turn;
  const depth = DEPTH[difficulty];
  let bestScore = -Infinity;
  let best: Move[] = [];
  for (const m of moves) {
    const child = clone(s);
    play(child, m, null);
    const v = search(child, depth - 1, -Infinity, Infinity, me);
    if (v > bestScore) {
      bestScore = v;
      best = [m];
    } else if (v === bestScore) {
      best.push(m);
    }
  }
  return best[Math.floor(rng() * best.length)];
}

/** Small deterministic PRNG (mulberry32), handy for seeded AI play and tests. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
