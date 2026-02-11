import { EntityManager } from "../entities/EntityManager";

export interface ScoreEntry {
  name: string;
  mass: number;
  kills: number;
  rank: number;
}

export class ScoreSystem {
  leaderboard: ScoreEntry[] = [];

  constructor(private entityManager: EntityManager) {}

  update(): void {
    const ranking = this.entityManager.getRanking();
    this.leaderboard = ranking.map((r, i) => ({
      name: r.name,
      mass: Math.floor(r.mass),
      kills: r.kills,
      rank: i + 1,
    }));
  }

  getPlayerRank(playerName: string): number {
    const entry = this.leaderboard.find((e) => e.name === playerName);
    return entry ? entry.rank : -1;
  }
}
