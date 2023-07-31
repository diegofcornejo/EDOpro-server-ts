import { GameOverDomainEvent } from "../../room/domain/domain-events/GameOverDomainEvent";
import { DuelFinishReason } from "../../room/domain/DuelFinishReason";
import { Room } from "../../room/domain/Room";
import RoomList from "../../room/infrastructure/RoomList";
import { container } from "../../shared/dependency-injection";
import { EventBus } from "../../shared/event-bus/EventBus";
import { SideDeckClientMessage } from "../server-to-client/game-messages/SideDeckClientMessage";
import { SideDeckWaitClientMessage } from "../server-to-client/game-messages/SideDeckWaitClientMessage";
import { ReplayPromptMessage } from "../server-to-client/ReplayPromptMessage";
import { ServerMessageClientMessage } from "../server-to-client/ServerMessageClientMessage";

export class FinishDuelHandler {
	private readonly reason: DuelFinishReason;
	private readonly winner: number;
	private readonly room: Room;
	private readonly eventBus: EventBus;

	constructor({ reason, winner, room }: { reason: DuelFinishReason; winner: number; room: Room }) {
		this.reason = reason;
		this.winner = winner;
		this.room = room;
		this.eventBus = container.get(EventBus);
	}

	run(): void {
		this.room.duel?.kill();
		this.room.duelWinner(this.winner);

		this.room.stopRoomTimer();
		this.room.stopTimer(0);
		this.room.stopTimer(1);

		const scoreTitleMessage = ServerMessageClientMessage.create(
			`Score: ${this.room.playerNames(0)}: ${this.room.matchScore().team0} - ${
				this.room.matchScore().team1
			} ${this.room.playerNames(1)}`
		);
		this.room.clients.forEach((player) => {
			player.sendMessage(scoreTitleMessage);
		});

		this.room.spectators.forEach((spectator) => {
			spectator.sendMessage(scoreTitleMessage);
		});

		const replayPromptMessage = ReplayPromptMessage.create();

		[...this.room.spectators, ...this.room.clients].forEach((item) => {
			item.sendMessage(replayPromptMessage);
		});

		if (this.room.isMatchFinished()) {
			this.room.clients.forEach((player) => {
				player.socket.destroy();
			});

			this.room.spectators.forEach((spectator) => {
				spectator.socket.destroy();
			});

			this.room.duel?.kill("SIGTERM");

			RoomList.deleteRoom(this.room);

			this.eventBus.publish(
				GameOverDomainEvent.DOMAIN_EVENT,
				new GameOverDomainEvent({
					bestOf: this.room.bestOf,
					turn: this.room.turn,
					players: this.room.matchPlayersHistory,
					date: new Date(),
					ranked: this.room.ranked,
				})
			);

			return;
		}

		const message = SideDeckClientMessage.create();

		this.room.sideDecking();

		if (this.winner === 0) {
			const looser = this.room.clients.find(
				(_client) => _client.position % this.room.team1 === 0 && _client.team === 1
			);
			if (looser) {
				this.room.setClientWhoChoosesTurn(looser);
			}
		} else {
			const looser = this.room.clients.find(
				(_client) => _client.position % this.room.team0 === 0 && _client.team === 0
			);
			if (looser) {
				this.room.setClientWhoChoosesTurn(looser);
			}
		}

		this.room.clients.forEach((client) => {
			client.sendMessage(message);
			client.notReady();
		});

		this.room.spectators.forEach((spectator) => {
			spectator.sendMessage(SideDeckWaitClientMessage.create());
		});
	}
}
