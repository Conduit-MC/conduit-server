const util = require('../util');

const STATES = require('../states');
const ConduitPlugin = require('conduit-plugin');

const Chunk = require('prismarine-chunk')('1.12.2');
const Vec3 = require('vec3');

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

		// TEMP STUFF JUST TO LOAD CHUNKS
		let chunk = new Chunk();

		for (let x = 0; x < 16;x++) {
			for (let z = 0; z < 16; z++) {
				chunk.setBlockType(new Vec3(x, 0, z), 2);

				for (let y = 0; y < 256; y++) {
					chunk.setSkyLight(new Vec3(x, y, z), 15);
				}
			}
		}

		event.getSender().write('map_chunk', {
			x: 0,
			z: 0,
			groundUp: true,
			bitMap: 0xffff,
			chunkData: chunk.dump(),
			blockEntities: []
		});

		chunk = new Chunk();

		for (let x = 0; x < 16;x++) {
			for (let z = 0; z < 16; z++) {
				chunk.setBlockType(new Vec3(x, 0, z), 1);

				for (let y = 0; y < 256; y++) {
					chunk.setSkyLight(new Vec3(x, y, z), 15);
				}
			}
		}

		event.getSender().write('map_chunk', {
			x: 1,
			z: 0,
			groundUp: true,
			bitMap: 0xffff,
			chunkData: chunk.dump(),
			blockEntities: []
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