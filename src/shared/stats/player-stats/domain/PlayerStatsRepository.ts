import { PlayerStats } from "./PlayerStats";

export interface PlayerStatsRepository {
	findByUserIdAndBanListName(userId: string, banListName: string): Promise<PlayerStats>;
	save(playerStats: PlayerStats): Promise<void>;
}
