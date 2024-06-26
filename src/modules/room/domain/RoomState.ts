import { EventEmitter } from "stream";

import { mercuryConfig } from "../../../mercury/config";
import { MercuryJoinGameMessage } from "../../../mercury/messages/MercuryJoinGameMessage";
import { BufferToUTF16 } from "../../../utils/BufferToUTF16";
import { Client } from "../../client/domain/Client";
import { PlayerInfoMessage } from "../../messages/client-to-server/PlayerInfoMessage";
import { Commands } from "../../messages/domain/Commands";
import { ClientMessage } from "../../messages/MessageProcessor";
import { PlayerMessageClientMessage } from "../../messages/server-to-client/PlayerMessageClientMessage";
import { ServerMessageClientMessage } from "../../messages/server-to-client/ServerMessageClientMessage";
import { SpectatorMessageClientMessage } from "../../messages/server-to-client/SpectatorMessageClientMessage";
import { VersionErrorClientMessage } from "../../messages/server-to-client/VersionErrorClientMessage";
import { YgoClient } from "../../shared/client/domain/YgoClient";
import { YgoRoom } from "../../shared/room/domain/YgoRoom";
import { ISocket } from "../../shared/socket/domain/ISocket";

export abstract class RoomState {
	protected readonly eventEmitter: EventEmitter;

	constructor(eventEmitter: EventEmitter) {
		this.eventEmitter = eventEmitter;

		this.eventEmitter.on(
			Commands.CHAT as unknown as string,
			(message: ClientMessage, room: YgoRoom, client: Client) =>
				this.handleChat(message, room, client)
		);
	}

	removeAllListener(): void {
		this.eventEmitter.removeAllListeners();
	}

	protected playerAlreadyInRoom(
		playerInfoMessage: PlayerInfoMessage,
		room: YgoRoom,
		socket: ISocket
	): YgoClient | null {
		if (!room.ranked) {
			const player = room.clients.find((client) => {
				return (
					client.socket.remoteAddress === socket.remoteAddress &&
					client.socket.closed &&
					playerInfoMessage.name === client.name
				);
			});

			if (!player) {
				return null;
			}

			return player;
		}

		const player = room.clients.find((client) => {
			return playerInfoMessage.name === client.name;
		});

		if (!player) {
			return null;
		}

		return player;
	}

	protected validateVersion(message: Buffer, socket: ISocket): void {
		const joinMessage = new MercuryJoinGameMessage(message);

		if (joinMessage.version !== mercuryConfig.version) {
			socket.send(VersionErrorClientMessage.create(mercuryConfig.version));

			throw new Error("Version mismatch");
		}
	}

	private handleChat(message: ClientMessage, room: YgoRoom, client: YgoClient): void {
		const sanitized = BufferToUTF16(message.data, message.data.length);

		if (sanitized === ":score") {
			client.socket.send(ServerMessageClientMessage.create(room.score));

			return;
		}

		if (client.isSpectator) {
			const chatMessage = SpectatorMessageClientMessage.create(
				client.name.replace(/\0/g, "").trim(),
				message.data
			);
			room.clients.forEach((player: Client) => {
				player.sendMessage(chatMessage);
			});

			room.spectators.forEach((spectator) => {
				spectator.socket.send(chatMessage);
			});

			return;
		}

		const playerMessage = PlayerMessageClientMessage.create(
			client.name.replace(/\0/g, "").trim(),
			message.data,
			client.team
		);
		const opponentMessage = PlayerMessageClientMessage.create(
			client.name.replace(/\0/g, "").trim(),
			message.data,
			Number(!client.team)
		);

		room.clients.forEach((player: YgoClient) => {
			const message = player.team === client.team ? playerMessage : opponentMessage;
			player.socket.send(message);
		});

		room.spectators.forEach((spectator) => {
			spectator.socket.send(opponentMessage);
		});
	}
}
