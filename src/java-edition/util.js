const crypto = require('crypto');
const UUID1345 = require('uuid-1345');
const { BufferStreamReadable } = require('./bufferStream');

function offlineUUID(username) {
	const md5 = crypto.createHash('md5');
	md5.update('OfflinePlayer:' + username, 'utf8');
	const uuid = md5.digest();

	uuid[0x06] &= 0x0F;
	uuid[0x06] |= 0x30;

	uuid[0x08] &= 0x3F;
	uuid[0x08] |= 0x80;
	
	return new UUID1345(uuid).toString();
}

function protocolIDToName(set, id) {
	const mapper = set.types.packet[1][0].type[1].mappings;

	return mapper[intToHexStr(id)];
}

function protocolIDToPrefixedName(set, id) {
	const name = protocolIDToName(set, id);
	const switcher = set.types.packet[1][1].type[1].fields;

	return switcher[name];
}

function getProtocolIDStruct(set, id) {
	const prefixed_name = protocolIDToPrefixedName(set, id);

	return set.types[prefixed_name][1];
}

function packetNameToProtocolID(set, name) {
	const mapper = set.types.packet[1][0].type[1].mappings;
	for (const id in mapper) {
		if (mapper.hasOwnProperty(id)) {
			if (mapper[id] == name) {
				return Number(id);
			}
		}
	}
}

function splitPacketStream(buffer) {
	const output = [];
	const stream = new BufferStreamReadable(buffer);

	while (stream.hasNextData()) {
		// Using the stream moves the position forward when reading
		const length = stream.readVarInt();
		const size = varIntSize(length);

		stream.skip(-size); // Move back to the start of the packet

		output.push(stream.read(size + length)); // Read out the full packet
	}
	
	return output;
}

module.exports = {
	offlineUUID,
	protocolIDToName, protocolIDToPrefixedName,
	getProtocolIDStruct,
	packetNameToProtocolID,
	splitPacketStream,
	varIntSize
};

function intToHexStr(int) {
	let str = (+int).toString(16);

	if (str.length < 2) {
		str = '0' + str;
	}

	return '0x' + str;
}

function varIntSize(value) {
	let size = 0;
	while (value & -0b10000000) {
		value >>>= 7;
		size++;
	}
	
	return size + 1;
}
