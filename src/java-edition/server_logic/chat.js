const ConduitPlugin = require('conduit-plugin');

class ChatPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onChat(event) {
		const message = event.getMessage();
		
		if (message.startsWith('/')) {
			event.getSender().emit('command', event.getPacket());
		} else {
			event.getSender().broadcastChatMessage(message);
		}
	}
}

module.exports = ChatPlugin;