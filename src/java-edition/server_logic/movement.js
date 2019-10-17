const ConduitPlugin = require('conduit-plugin');

class MovementPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onPositionLook() {}

	onPosition() {}
}

module.exports = MovementPlugin;