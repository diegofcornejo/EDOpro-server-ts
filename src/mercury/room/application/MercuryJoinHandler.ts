/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { EventEmitter } from "stream";

import { PlayerInfoMessage } from "../../../modules/messages/client-to-server/PlayerInfoMessage";
import { Commands } from "../../../modules/messages/domain/Commands";
import { ClientMessage } from "../../../modules/messages/MessageProcessor";
import { RoomState } from "../../../modules/room/domain/RoomState";
import { Logger } from "../../../modules/shared/logger/domain/Logger";
import { JoinMessageHandler } from "../../../modules/shared/room/domain/JoinMessageHandler";
import { ISocket } from "../../../modules/shared/socket/domain/ISocket";
import { MercuryJoinGameMessage } from "../../messages/MercuryJoinGameMessage";
import { MercuryRoom } from "../domain/MercuryRoom";
import MercuryRoomList from "../infrastructure/MercuryRoomList";

export class MercuryJoinHandler extends RoomState implements JoinMessageHandler {
	private readonly logger: Logger;
	private readonly socket: ISocket;

	constructor(eventEmitter: EventEmitter, logger: Logger, socket: ISocket) {
		super(eventEmitter);
		this.logger = logger;
		this.socket = socket;
		this.eventEmitter.on(Commands.JOIN_GAME as unknown as string, (message: ClientMessage) =>
			this.handle(message)
		);
	}

	handle(message: ClientMessage): void {
		this.logger.debug(`Join Message: ${message.data.toString("hex")}`);
		const playerInfoMessage = new PlayerInfoMessage(message.previousMessage, message.data.length);
		this.logger.debug(`name: ${playerInfoMessage.name}`);
		const joinMessage = new MercuryJoinGameMessage(message.data);
		const room = this.createRoomIfNotExists(joinMessage.pass, playerInfoMessage);
		room.emit("JOIN", message, this.socket);
	}

	private generateUniqueId(): number {
		const min = 1000;
		const max = 9999;

		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	private createRoomIfNotExists(name: string, playerInfo: PlayerInfoMessage): MercuryRoom {
		const existingRoom = MercuryRoomList.findByName(name);
		if (!existingRoom) {
			const room = MercuryRoom.create(
				this.generateUniqueId(),
				name,
				this.logger,
				this.eventEmitter,
				playerInfo
			);
			MercuryRoomList.addRoom(room);
			room.waiting();

			return room;
		}

		return existingRoom;
	}
}
