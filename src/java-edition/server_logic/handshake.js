const STATES = require('../states');
const ConduitPlugin = require('conduit-plugin');

class HandshakePlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onSetProtocol(event) {
		const sender = event.getSender();

		sender.setState(event.getNextState());
		if (sender.getState() === STATES.STATUS) {
			sender.sendServerInfoPing();
		}
	}
}

module.exports = HandshakePlugin;