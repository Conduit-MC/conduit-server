const spiral = require('spiralloop');
const Entity = require('../entity');

class Player extends Entity {
	constructor(server) {
		super(server);

		this.currentTeleportId = 0;

		this.in_game = false;

		this.settings = {
			locale: 'en_us',
			viewDistance: 5,
			chatFlags: 0,
			chatColors: 0,
			skinParts: 0,
			mainHand: 0
		};
	}

	getServer() {
		return this.server;
	}

	inGame() {
		return this.in_game;
	}

	nextTeleportId() {
		return ++this.currentTeleportId;
	}

	getSettings() {
		return this.settings;
	}

	setSettings(settings) {
		const oldViewDistance = this.settings.viewDistance;

		this.settings = settings;

		if (oldViewDistance !== this.settings.viewDistance) { // view distance changed, send new chunks
			this.sendNearbyChunks();
		}

		return this;
	}

	joinGame() {
		this.server.players[this.getUUID()] = this;

		this.write('login', {
			entityId: this.getEntityId(),
			levelType: 'default',
			gameMode: 1,
			dimension: 0,
			difficulty: 2,
			maxPlayers: this.getServer().max_players,
			reducedDebugInfo: false
		});

		// TODO: Loop over every player and add them to the array
		this.server.broadcast('player_info', {
			action: 0,
			data: Object.keys(this.server.getPlayers()).map(uuid => {
				const player = this.server.getPlayers()[uuid];

				return {
					UUID: player.getUUID(),
					name: player.getUsername(),
					properties: [],
					gamemode: 0,
					ping: 40,
					displayName: JSON.stringify({
						text: player.getUsername()
					})
				};
			})
		});

		this.setPosition({
			x: 8,
			y: 150,
			z: 8,
			pitch: 0,
			yaw: 0,
			onGround: false
		});

		this.sendNearbyChunks();

		this.server.broadcast('named_entity_spawn', {
			entityId: this.getEntityId(),
			playerUUID: this.getUUID(),
			x: this.getPosition().x,
			y: this.getPosition().y,
			z: this.getPosition().z,
			yaw: 0,
			pitch: 0,
			currentItem: 0,
			metadata: []
		}, this);

		this.server.broadcast('entity_teleport', {
			entityId: this.getEntityId(),
			...this.getPosition()
		}, this);

		this.broadcastJoinMessage();

		for (const uuid in this.server.getPlayers()) {
			const player = this.server.getPlayers()[uuid];

			if (player.getEntityId() === this.getEntityId()) {
				continue;
			}

			this.write('named_entity_spawn', {
				entityId: player.getEntityId(),
				playerUUID: player.getUUID(),
				x: player.getPosition().x,
				y: player.getPosition().y,
				z: player.getPosition().z,
				yaw: 0,
				pitch: 0,
				currentItem: 0,
				metadata: []
			});
	
			this.write('entity_teleport', {
				entityId: player.getEntityId(),
				...player.getPosition()
			});
		}

		this.in_game = true;

		return this;
	}

	setUsername(username) {
		this.username = username;

		return this;
	}

	getUsername() {
		return this.username;
	}

	broadcastJoinMessage() {
		this.getServer().broadcast('chat', {
			message: JSON.stringify({
				translate: 'multiplayer.player.joined',
				'with': [
					this.getUsername()
				],
				color: 'yellow'
			}),
			position: 0
		});

		return this;
	}

	sendJoinMessage(player=this) {
		player.write('chat', {
			message: JSON.stringify({
				translate: 'multiplayer.player.joined',
				'with': [
					this.getUsername()
				],
				color: 'yellow'
			}),
			position: 0
		});

		return this;
	}

	broadcastChatMessage(message) {
		this.getServer().broadcast('chat', {
			message: JSON.stringify({
				translate: 'chat.type.text',
				'with': [
					this.getUsername(),
					message
				]
			}),
			position: 0
		});

		return this;
	}

	sendMessage(message, player=this) {
		player.write('chat', {
			message: JSON.stringify({
				translate: 'chat.type.text',
				'with': [
					this.getUsername(),
					message
				]
			}),
			position: 0
		});

		return this;
	}

	sendPrivateMessage(message, player) {
		player.write('chat', {
			message: JSON.stringify({
				translate: 'commands.message.display.incoming',
				'with': [
					this.getUsername(),
					message
				]
			}),
			position: 0
		});

		this.write('chat', {
			message: JSON.stringify({
				translate: 'commands.message.display.outgoing',
				'with': [
					player.getUsername(),
					message
				]
			}),
			position: 0
		});

		return this;
	}

	setPosition({ x, y, z, onGround, pitch = this.getPosition().pitch, yaw = this.getPosition().yaw }) {
		this.updatePosition({
			x: x, y: y, z: z,
			pitch, yaw,
			onGround
		});

		this.write('position', {
			...this.getPosition(),
			flags: 0x00,
			teleportId: this.nextTeleportId()
		});

		return this;
	}

	sendNearbyChunks() {
		const chunkX = this.getPosition().x >> 4;
		const chunkZ = this.getPosition().z >> 4;

		const { viewDistance } = this.getSettings();

		spiral([viewDistance * 2, viewDistance * 2], (xPos, zPos) => {
			const x = chunkX - viewDistance + xPos;
			const z = chunkZ - viewDistance + zPos;

			const chunk = this.getServer().world.getChunk(x, z);

			this.write('map_chunk', {
				x,
				z,
				groundUp: true,
				bitMap: 0xffff,
				chunkData: chunk.dump(),
				blockEntities: []
			});
		});
	}

	openWindow({ type, title, slots }) {
		this.write('open_window', {
			windowId: 1, // Change this to update the Window ID. Store on the server?
			inventoryType: `minecraft:${type}`, // No idea if this will work for all types but it works for chest
			windowTitle: JSON.stringify(title),
			slotCount: slots
		});

		return this;
	}
}

module.exports = Player;