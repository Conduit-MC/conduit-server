const Entity = require('../entity');

class Player extends Entity {
	constructor() {
		super();
	}

	joinGame() {
		this.write('login', {
			entityId: this.id,
			levelType: 'default',
			gameMode: 1,
			dimension: 0,
			difficulty: 2,
			maxPlayers: this.server.max_players,
			reducedDebugInfo: false
		});

		this.write('position', {
			x: 8,
			y: 50,
			z: 0,
			yaw: 0,
			pitch: 0,
			flags: 0x00,
			teleportId: 0
		});

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
		for (const player of this.server.players) {
			this.sendJoinMessage(player);
		}

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
		for (const player of this.server.players) {
			this.sendMessage(message, player);
		}

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