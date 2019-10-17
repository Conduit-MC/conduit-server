const EventEmitter = require('eventemitter2').EventEmitter2;
const UUID1345 = require('uuid-1345');

class Entity extends EventEmitter {
	constructor(server) {
		super();

		this.server = server;

		this.eid = this.server.nextEntityId();
		this.uuid = UUID1345.v1();
	}

	getEntityId() {
		return this.eid;
	}

	getUUID() {
		return this.uuid;
	}
}

module.exports = Entity;