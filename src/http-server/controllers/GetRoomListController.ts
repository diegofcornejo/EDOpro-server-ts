import { Request, Response } from "express";

import MercuryRoomList from "../../mercury/room/infrastructure/MercuryRoomList";
import RoomList from "../../modules/room/infrastructure/RoomList";

export class GetRoomListController {
	run(_req: Request, response: Response): void {
		const rooms = RoomList.getRooms().map((room) => room.toPresentation());
		const mercuryRooms = MercuryRoomList.getRooms().map((room) => room.toPresentation());
		response.status(200).json({ rooms: [...mercuryRooms, ...rooms] });
	}
}
