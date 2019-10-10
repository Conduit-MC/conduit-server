const ConduitPlugin = require('conduit-plugin');

class PingPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	// I'm not even sure this works, the client never requests it
	onLegacyPing(event) {
		const string = '\xa7' + [
			1,
			this.server.protocolVersion,
			this.server.version,
			this.server.motd,
			this.server.players.length.toString(),
			this.server.max_players.toString()
		].join('\0');
		const payload = Buffer.from(string, 'utf16le').swap16();
		const length = Buffer.alloc(2);
		length.writeUInt16BE(string.length);

		const response = Buffer.concat([
			Buffer.from('ff', 'hex'),
			length,
			payload
		]);

		event.getSender().socket.write(response);
	}

	// Used to determine the clients ping,
	// displayed on the multiplayer server list
	onPing(event) {
		event.getSender()
			.ping(event.getTime())
			.kill();
	}
}

module.exports = PingPlugin;