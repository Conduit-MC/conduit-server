const util = require('../util');

const STATES = require('../states');
const ConduitPlugin = require('conduit-plugin');

class LoginPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onExit(sender) {
		if (this.server.connected_clients[sender.id]) delete this.server.connected_clients[sender.id];
		for (let i = this.server.players.length-1; i >= 0; i--) {
			const player = this.server.players[i];
			if (sender.id == player.id) {
				this.server.players.splice(i, 1);
				break;
			}
		}
	}

	onLoginStart(event) {
		const sender = event.getSender();

		sender.setUsername(event.getUsername());
		if (!this.server.online_mode) {
			login.call(this, sender);
			return;
		}
		// authenticate
	}

	onLogin(event) {
		event.getSender().joinGame();
	}

	onSettings(event) {
		event.getSender().setSettings({
			locale: event.getLocale(),
			viewDistance: event.getViewDistance(),
			chatFlags: event.getChatFlags(),
			chatColors: event.getChatColors(),
			skinParts: event.getSkinParts(),
			mainHand: event.getMainHand()
		});
	}
}

module.exports = LoginPlugin;

function login(client) {
	if (!this.server.online_mode) {
		client.uuid = util.offlineUUID(client.username);
	} else {
		// Have not implemented online mode stuff
		client.uuid = util.offlineUUID(client.username);
	}

	client.write('success', {
		uuid: client.uuid,
		username: client.username
	});
	client.state = STATES.PLAY;

	client.emit('login');
}