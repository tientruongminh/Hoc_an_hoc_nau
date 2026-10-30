import { describe, expect, it } from 'vitest';
import {
  applyMove,
  chooseAIMove,
  createGame,
  legalMoves,
  score,
  seededRng,
  type Difficulty,
  type GameOptions,
  type GameState,
  type Side,
} from './oanquan';

/** Build a state from a sparse dân map; quan cells default to holding their quan. */
function board(
  dan: Record<number, number>,
  extra: Partial<Omit<GameState, 'opts'>> & { opts?: Partial<GameOptions> } = {},
): GameState {
  const base = createGame(extra.opts);
  const cells = base.cells.map((_c, i) => ({ dan: dan[i] ?? 0, quan: i === 0 || i === 6 ? 1 : 0 }));
  return { ...base, ...extra, opts: base.opts, cells: extra.cells ?? cells };
}

function totals(s: GameState) {
  let dan = s.captured.A.dan + s.captured.B.dan;
  let quan = s.captured.A.quan + s.captured.B.quan;
  for (const c of s.cells) {
    dan += c.dan;
    quan += c.quan;
  }
  return { dan, quan };
}

describe('setup', () => {
  it('starts with 50 dân and 2 quan', () => {
    const s = createGame();
    expect(totals(s)).toEqual({ dan: 50, quan: 2 });
    expect(s.cells[0]).toEqual({ dan: 0, quan: 1 });
    expect(s.cells[6]).toEqual({ dan: 0, quan: 1 });
    expect(legalMoves(s)).toHaveLength(10);
  });
});

describe('sowing and capture', () => {
  it('captures the cell after an empty one', () => {
    const s = board({ 1: 1, 4: 3, 8: 2 });
    const { state, events } = applyMove(s, { cell: 1, dir: 1 });
    expect(state.cells[2].dan).toBe(1);
    expect(state.cells[4].dan).toBe(0);
    expect(state.captured.A).toEqual({ dan: 3, quan: 0 });
    expect(events).toContainEqual({ type: 'capture', cell: 4, dan: 3, quan: 0 });
    expect(state.turn).toBe('B');
  });

  it('chains captures through empty cells, including a ripe quan', () => {
    const s = board({ 1: 1, 4: 3, 6: 5, 7: 1, 8: 2 });
    const { state, events } = applyMove(s, { cell: 1, dir: 1 });
    expect(events.filter((e) => e.type === 'capture')).toHaveLength(2);
    expect(state.captured.A).toEqual({ dan: 8, quan: 1 });
    expect(state.cells[6]).toEqual({ dan: 0, quan: 0 });
  });

  it('protects quan non (quan with fewer than 5 dân)', () => {
    const s = board({ 1: 1, 4: 3, 6: 2, 8: 2 });
    const { state } = applyMove(s, { cell: 1, dir: 1 });
    expect(state.captured.A).toEqual({ dan: 3, quan: 0 });
    expect(state.cells[6]).toEqual({ dan: 2, quan: 1 });
  });

  it('allows capturing quan non when protection is off', () => {
    const s = board({ 1: 1, 4: 3, 6: 2, 7: 1, 8: 2 }, { opts: { protectQuanNon: false } });
    const { state } = applyMove(s, { cell: 1, dir: 1 });
    expect(state.captured.A).toEqual({ dan: 5, quan: 1 });
  });

  it('continues sowing from a non-empty cell', () => {
    const s = board({ 1: 1, 3: 2, 8: 2 });
    const { events } = applyMove(s, { cell: 1, dir: 1 });
    expect(events.filter((e) => e.type === 'pickup').map((e) => (e as { cell: number }).cell)).toEqual([1, 3]);
  });

  it('rejects illegal moves', () => {
    const s = createGame();
    expect(() => applyMove(s, { cell: 8, dir: 1 })).toThrow();
    expect(() => applyMove(board({ 2: 1, 8: 1 }), { cell: 1, dir: 1 })).toThrow();
  });
});

describe('refill and borrowing', () => {
  it('refills an empty row, borrowing the shortfall from the opponent', () => {
    const s = board(
      { 1: 1, 5: 1 },
      { captured: { A: { dan: 10, quan: 0 }, B: { dan: 3, quan: 0 } } },
    );
    const { state, events } = applyMove(s, { cell: 5, dir: -1 });
    expect(events).toContainEqual({ type: 'refill', side: 'B' });
    expect([7, 8, 9, 10, 11].map((i) => state.cells[i].dan)).toEqual([1, 1, 1, 1, 1]);
    expect(state.captured.B.dan).toBe(0);
    expect(state.captured.A.dan).toBe(8);
    expect(state.debt.B).toBe(2);
    expect(totals(state)).toEqual(totals(s));
  });

  it('ends the game when neither side can cover a refill', () => {
    const s = board({ 1: 1, 5: 1 }, { captured: { A: { dan: 1, quan: 0 }, B: { dan: 2, quan: 0 } } });
    const { state, events } = applyMove(s, { cell: 5, dir: -1 });
    expect(state.over).toBe(true);
    expect(events.at(-1)?.type).toBe('gameOver');
  });
});

describe('game over', () => {
  it('ends when both quan cells are empty and sweeps rows to their owners', () => {
    const s = board(
      { 3: 1, 4: 3, 11: 2 },
      {
        opts: { protectQuanNon: false },
        captured: { A: { dan: 10, quan: 1 }, B: { dan: 7, quan: 0 } },
      },
    );
    s.cells[6] = { dan: 0, quan: 0 };
    const { state, events } = applyMove(s, { cell: 3, dir: -1 });
    expect(state.over).toBe(true);
    expect(score(state, 'A')).toBe(10 + 1 + 3 + 5 * 2);
    expect(score(state, 'B')).toBe(9);
    expect(events.at(-1)).toEqual({ type: 'gameOver', scoreA: 24, scoreB: 9 });
    expect(legalMoves(state)).toEqual([]);
  });

  it('repays debt at the end', () => {
    const s = board(
      { 3: 1, 11: 2 },
      {
        opts: { protectQuanNon: false },
        captured: { A: { dan: 10, quan: 1 }, B: { dan: 7, quan: 0 } },
        debt: { A: 0, B: 4 },
      },
    );
    s.cells[6] = { dan: 0, quan: 0 };
    const { state } = applyMove(s, { cell: 3, dir: -1 });
    expect(state.captured.B.dan).toBe(7 + 2 - 4);
    expect(state.captured.A.dan).toBe(10 + 1 + 4);
    expect(state.debt).toEqual({ A: 0, B: 0 });
  });
});

describe('random play invariants', () => {
  it('conserves stones and always terminates over 200 seeded games', () => {
    for (let g = 0; g < 200; g++) {
      const rng = seededRng(g + 1);
      let s = createGame({ firstTurn: g % 2 ? 'B' : 'A' });
      let moves = 0;
      while (!s.over) {
        const legal = legalMoves(s);
        expect(legal.length).toBeGreaterThan(0);
        s = applyMove(s, legal[Math.floor(rng() * legal.length)]).state;
        expect(totals(s)).toEqual({ dan: 50, quan: 2 });
        moves++;
      }
      expect(moves).toBeLessThanOrEqual(s.opts.maxTurns);
    }
  });
});

describe('AI', () => {
  it('returns a legal move at every difficulty', () => {
    const s = createGame();
    for (const d of ['easy', 'normal', 'hard'] as Difficulty[]) {
      const m = chooseAIMove(s, d, seededRng(7));
      expect(legalMoves(s)).toContainEqual(m);
    }
  });

  it('chooses quickly at hard difficulty', () => {
    const s = createGame();
    const t = performance.now();
    chooseAIMove(s, 'hard', seededRng(3));
    expect(performance.now() - t).toBeLessThan(500);
  });

  it('hard beats easy in most of 20 seeded games', () => {
    let hardWins = 0;
    for (let g = 0; g < 20; g++) {
      const rng = seededRng(100 + g);
      const hardSide: Side = g % 2 ? 'A' : 'B';
      let s = createGame({ firstTurn: g % 3 ? 'A' : 'B' });
      while (!s.over) {
        const d: Difficulty = s.turn === hardSide ? 'hard' : 'easy';
        s = applyMove(s, chooseAIMove(s, d, rng)).state;
      }
      const easySide: Side = hardSide === 'A' ? 'B' : 'A';
      if (score(s, hardSide) > score(s, easySide)) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(14);
  }, 60_000);
});
