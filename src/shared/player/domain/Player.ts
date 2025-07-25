import { Team } from "../../room/Team";
import { PlayerData } from "./PlayerData";

export type Game = {
	result: "winner" | "loser" | "deuce";
	turns: number;
	ipAddress: string | null;
};

export type PlayerMatchSummary = {
	id: string | null;
	team: Team;
	name: string;
	winner: boolean;
	games: Game[];
	points?: { [key: string]: number };
	score: number;
};

export class Player {
	public readonly id: string | null;
	public readonly name: string;
	public readonly team: Team;
	public readonly winner: boolean;
	private readonly _games: Game[];
	private readonly score: number;

	constructor({ id, name, team, winner, games, score }: PlayerData) {
		this.id = id;
		this.name = name;
		this.team = team;
		this.winner = winner;
		this._games = games;
		this.score = score;
	}

	calculateMatchPoints(): number {
		return this.wins - this.losses;
	}

	get wins(): number {
		return this._games.filter((game) => game.result === "winner").length;
	}

	get losses(): number {
		return this._games.filter((game) => game.result === "loser").length;
	}

	get games(): Game[] {
		return this._games;
	}

	toPresentation(): PlayerMatchSummary {
		return {
			id: this.id,
			team: this.team,
			name: this.name,
			winner: this.winner,
			games: this._games,
			score: this.score,
		};
	}
}
