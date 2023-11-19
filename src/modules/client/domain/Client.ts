import { YGOClientSocket } from "../../../socket-server/HostServer";
import { Deck } from "../../deck/domain/Deck";
import { ClientMessage, MessageProcessor } from "../../messages/MessageProcessor";
import { Choose } from "../../rock-paper-scissor/RockPaperScissor";
import { Room } from "../../room/domain/Room";
import { RoomMessageEmitter } from "../../RoomMessageEmitter";
import { Logger } from "../../shared/logger/domain/Logger";

export class Listener {}

export class Client {
	public readonly listener: Listener;
	public readonly host: boolean;
	public readonly name: string;
	public readonly roomId: number;
	private _team: number;
	private _position: number;
	private _socket: YGOClientSocket;
	private _isReady: boolean;
	private _rpsChosen: Choose | null = null;
	private _lastMessage: Buffer | null = null;
	private _reconnecting = false;
	private _deck: Deck;
	private _duelPosition: number;
	private _turn: boolean;
	private _canReconnect: boolean;
	private _updatingDeck: boolean;
	private _readyCommand: boolean;
	private _readyMessage: ClientMessage;
	private readonly logger: Logger;

	constructor({
		socket,
		host,
		name,
		position,
		roomId,
		isReady = false,
		team,
		logger,
	}: {
		socket: YGOClientSocket;
		host: boolean;
		name: string;
		position: number;
		roomId: number;
		isReady?: boolean;
		team: number;
		logger: Logger;
	}) {
		this._socket = socket;
		this.host = host;
		this.name = name;
		this._position = position;
		this.roomId = roomId;
		this._isReady = isReady;
		this._team = team;
		this.logger = logger;
	}

	get socket(): YGOClientSocket {
		return this._socket;
	}

	setSocket(socket: YGOClientSocket, clients: Client[], room: Room): void {
		this._socket = socket;
		const messageProcessor = new MessageProcessor();
		const roomMessageEmitter = new RoomMessageEmitter(this, room);
		this._socket.on("data", (data) => {
			roomMessageEmitter.handleMessage(data);
			messageProcessor.read(data);
			// this.handleMessage(messageProcessor, clients, room);
		});
	}

	setRpsChosen(choise: Choose): void {
		this._rpsChosen = choise;
	}

	clearRpsChoise(): void {
		this._rpsChosen = null;
	}

	get rpsChoise(): Choose | null {
		return this._rpsChosen;
	}

	ready(): void {
		this._isReady = true;
	}

	notReady(): void {
		this._isReady = false;
	}

	get isReady(): boolean {
		return this._isReady;
	}

	get cache(): Buffer | null {
		return this._lastMessage;
	}

	setLastMessage(message: Buffer): void {
		this._lastMessage = message;
	}

	reconnecting(): void {
		this._reconnecting = true;
	}

	clearReconnecting(): void {
		this._reconnecting = false;
	}

	get isReconnecting(): boolean {
		return this._reconnecting;
	}

	setDeck(deck: Deck): void {
		this._deck = deck;
	}

	get deck(): Deck {
		return this._deck;
	}

	setDuelPosition(position: number): void {
		this._duelPosition = position;
	}

	get duelPosition(): number {
		return this._duelPosition;
	}

	turn(): void {
		this._turn = true;
	}

	clearTurn(): void {
		this._turn = false;
	}

	get inTurn(): boolean {
		return this._turn;
	}

	get isSpectator(): boolean {
		return this._team === 3;
	}

	spectatorPosition(position: number): void {
		this._position = position;
		this._team = 3;
	}

	get position(): number {
		return this._position;
	}

	playerPosition(position: number, team: number): void {
		this._position = position;
		this._team = team;
	}

	get team(): number {
		return this._team;
	}

	setCanReconnect(value: boolean): void {
		this._canReconnect = value;
	}

	get canReconnect(): boolean {
		return this._canReconnect;
	}

	sendMessage(message: Buffer): void {
		this._socket.write(message);
	}

	updatingDeck(): void {
		this._updatingDeck = true;
	}

	deckUpdated(): void {
		this._updatingDeck = false;
	}

	get isUpdatingDeck(): boolean {
		return this._updatingDeck;
	}

	saveReadyCommand(message: ClientMessage): void {
		this._readyCommand = true;
		this._readyMessage = message;
	}

	clearReadyCommand(): void {
		this._readyCommand = false;
	}

	get haveReadyCommand(): boolean {
		return this._readyCommand;
	}

	get readyMessage(): ClientMessage {
		return this._readyMessage;
	}
}
