import type Phaser from 'phaser';
import { afterMinigame } from '../story/chapter1';

/** What each minigame reports back to the story when it ends. */
export interface MinigameResults {
  goose: { won: boolean; eggs: number; bites: number };
  ride: { won: boolean; hits: number; leg: 'to_ba8' };
  oanquan: { money: number; rounds: number };
  wash: { done: true };
  cooking: { score: number; notes: string[] };
}
export type MinigameId = keyof MinigameResults;

/** Every minigame scene calls this exactly once when it is over. */
export function finishMinigame<K extends MinigameId>(scene: Phaser.Scene, id: K, result: MinigameResults[K]) {
  afterMinigame(scene, id, result as MinigameResults[MinigameId]);
}
