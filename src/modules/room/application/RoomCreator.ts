import { EventEmitter } from "stream";

import { CreateRoomRequest } from "../../../http-server/controllers/CreateRoomController";
import { UTF8ToUTF16 } from "../../../utils/UTF8ToUTF16";
import BanListMemoryRepository from "../../ban-list/infrastructure/BanListMemoryRepository";
import { Logger } from "../../shared/logger/domain/Logger";
import { Room } from "../domain/Room";
import RoomList from "../infrastructure/RoomList";

export class RoomCreator {
	constructor(private readonly logger: Logger) {}

	create(payload: CreateRoomRequest): { password: string } {
		const banlist = BanListMemoryRepository.findByName(payload.banlist);

		if (!banlist) {
			throw new Error("Banlist not found");
		}

		const emitter = new EventEmitter();
		const utf8Password = this.generateUniqueId().toString();
		const password = UTF8ToUTF16(utf8Password, utf8Password.length * 2).toString("utf16le");

		const data = {
			id: this.generateUniqueId(),
			name: payload.name,
			notes: (payload.tournament ? `[${payload.tournament}] ` : "") + payload.name,
			mode: payload.mode || 0, // 0 = Single, 1 = Match, 2 = Tag
			needPass: true,
			team0: payload.teamQuantity || 1,
			team1: payload.teamQuantity || 1,
			bestOf: payload.bestOf || 1,
			duelFlag: BigInt(853505),
			forbiddenTypes: 83886080,
			extraRules: 0,
			startLp: payload.startLp || 8000,
			startHand: 5,
			drawCount: 1,
			timeLimit: payload.timeLimit || 700,
			rule: payload.rule || 4, // 0 = OCG, 1 = TCG, 2 = OCG/TCG, 3 = Prerelease, 4 = Anything Goes
			noCheck: false,
			noShuffle: false,
			banlistHash: banlist.hash,
			isStart: "waiting",
			mainMin: payload.mainMin || 40,
			mainMax: payload.mainMax || 60,
			extraMin: 0,
			extraMax: 15,
			sideMin: 0,
			sideMax: payload.sideMax || 15,
			duelRule: 0,
			handshake: 4043399681,
			password,
			duelFlagsHight: 1,
			duelFlagsLow: 853504,
			ranked: payload.isRanked || false,
		};

		const room = Room.create(data, emitter, this.logger);
		room.waiting();
		RoomList.addRoom(room);
		room.createMatch();

		return {
			password,
		};
	}

	private generateUniqueId(): number {
		const min = 1000;
		const max = 9999;

		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}
