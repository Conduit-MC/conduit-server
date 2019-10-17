const ConduitPlugin = require('conduit-plugin');

class MovementPlugin extends ConduitPlugin {
	constructor(server) {
		super(server);
	}

	onPosition(event) {
		const player = event.getSender();
		const position = {
			x: event.getX(),
			y: event.getY(),
			z: event.getZ(),
			onGround: event.getOnGround()
		};

		player.updatePosition(position);

		player.server.broadcast('entity_teleport', {
			entityId: player.getEntityId(),
			...player.getPosition()
		}, player);
	}

	onPositionLook(event) {
		const player = event.getSender();
		const position = {
			x: event.getX(),
			y: event.getY(),
			z: event.getZ(),
			pitch: event.getPitch(),
			yaw: event.getYaw(),
			onGround: event.getOnGround()
		};

		player.updatePosition(position);

		player.server.broadcast('entity_teleport', {
			entityId: player.getEntityId(),
			...player.getPosition()
		}, player);
	}

	onLook(event) {
		const player = event.getSender();
		const position = {
			pitch: event.getPitch(),
			yaw: event.getYaw(),
			onGround: event.getOnGround()
		};

		player.updatePosition(position);

		player.server.broadcast('entity_teleport', {
			entityId: player.getEntityId(),
			...player.getPosition()
		}, player);
	}
}

module.exports = MovementPlugin;