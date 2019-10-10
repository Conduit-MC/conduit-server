const EventEmitter = require('eventemitter2').EventEmitter2;

class Entity extends EventEmitter {
	constructor() {
		super();
	}
}

module.exports = Entity;