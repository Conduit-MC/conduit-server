const ConduitPlugin = require('conduit-plugin');

class CommandPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onEnabled() {
		// Testing command handling
		this.registerCommand('chest', chestCommandHandler);
	}

	onCommand(event) {
		const commandName = event.getMessage().substring(1).split(' ')[0];

		if (this.server.commands[commandName]) {
			this.server.commands[commandName](event);
		}
	}
}

function chestCommandHandler(event) {
	event.getSender().openWindow({
		type: 'chest',
		slots: 9,
		title: '§bChest'
	});
}

module.exports = CommandPlugin;