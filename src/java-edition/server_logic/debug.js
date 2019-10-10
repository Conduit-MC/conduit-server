const ConduitPlugin = require('conduit-plugin');

class DebugPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onPacket(event) {
		if (this.server.debug === true) {
			console.log(event);
		}
	}
}

module.exports = DebugPlugin;