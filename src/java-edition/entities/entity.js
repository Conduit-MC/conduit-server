const EventEmitter = require('eventemitter2').EventEmitter2;
const UUID1345 = require('uuid-1345');

class Entity extends EventEmitter {
	constructor(server) {
		super();

		this.server = server;

		this.eid = this.server.nextEntityId();
		this.uuid = UUID1345.v1();

		this.position = {
			x: 0,
			y: 0,
			z: 0,
			pitch: 0,
			yaw: 0,
			onGround: true
		};
	}

	getEntityId() {
		return this.eid;
	}

	getUUID() {
		return this.uuid;
	}

	getPosition() {
		return this.position;
	}

	setPosition() {

	}

	updatePosition({ x, y, z, onGround, pitch = this.getPosition().pitch, yaw = this.getPosition().yaw }) {
		this.position = {
			x, y, z,
			pitch, yaw,
			onGround
		};
	}
}

module.exports = Entity;