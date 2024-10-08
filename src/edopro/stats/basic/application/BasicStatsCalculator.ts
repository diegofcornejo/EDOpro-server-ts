/* eslint-disable no-await-in-loop */

import { DomainEventSubscriber } from "../../../../shared/event-bus/EventBus";
import { Player } from "../../../../shared/player/domain/Player";
import { GameOverDomainEvent } from "../../../../shared/room/domain/match/domain/domain-events/GameOverDomainEvent";
import BanListMemoryRepository from "../../../ban-list/infrastructure/BanListMemoryRepository";
import { RoomRepository } from "../../../room/domain/RoomRepository";

export class BasicStatsCalculator implements DomainEventSubscriber<GameOverDomainEvent> {
	static readonly ListenTo = GameOverDomainEvent.DOMAIN_EVENT;
	private readonly roomRepository: RoomRepository;

	constructor(roomRepository: RoomRepository) {
		this.roomRepository = roomRepository;
	}

	async handle(event: GameOverDomainEvent): Promise<void> {
		if (!event.data.ranked) {
			return;
		}
		const players = event.data.players.map((item) => new Player(item));
		const banList = BanListMemoryRepository.findByHash(event.data.banlistHash);

		for (const player of players) {
			const points = this.calculatePoints(player);
			player.recordPoints("Global", points);
			await this.roomRepository.updatePlayerPoints(player.name, points);

			if (player.winner) {
				await this.roomRepository.increaseWins(player.name);
			} else {
				await this.roomRepository.increaseLoses(player.name);
			}

			if (banList?.name) {
				const points = this.calculatePoints(player, banList.name);
				player.recordPoints(banList.name, points);
				await this.roomRepository.updatePlayerPointsByBanList(player.name, points, banList);

				if (player.winner) {
					await this.roomRepository.increaseWinsByBanList(player.name, banList);
				} else {
					await this.roomRepository.increaseLosesByBanList(player.name, banList);
				}
			}

			await this.roomRepository.saveMatch(player.name, {
				bestOf: event.data.bestOf,
				date: event.data.date,
				players: players.map((item) => item.toPresentation()),
				ranked: event.data.ranked,
				banlistHash: event.data.banlistHash,
				banlistName: banList?.name ?? "N/A",
			});
		}
	}

	private calculatePoints(player: Player, banlistName = "Global"): number {
		const points = player.wins - player.losses;
		const rank = player.getBanListRank(banlistName);
		const difference = rank.points + points;

		if (difference <= 0) {
			return -rank.points;
		}

		return points;
	}
}
