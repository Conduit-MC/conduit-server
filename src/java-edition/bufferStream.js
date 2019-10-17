const uuidParse = require('uuid-parse');
const MCServerError = require('./errors/mcserver.error');

class BufferStreamReadable {

	constructor(buffer) {
		this._buffer = buffer;
		this._position = 0;
	}

	data() {
		return this._buffer;
	}

	hasNextData() {
		return this._buffer.length > this._position;
	}

	seek(pos) {
		this._position = pos;
	}

	skip(len) {
		this._position += len;
	}

	read(len) {
		const read = this._buffer.subarray(this._position, this._position + len);
		this._position += len;

		return read;
	}

	readBytes(len) {
		return this.read(len);
	}

	readByte() {
		return this.readBytes(1)[0];
	}

	readInt8() {
		return this.readBytes(1).readInt8();
	}

	readUInt8() {
		return this.readBytes(1).readUInt8();
	}

	readInt16LE() {
		return this.read(2).readInt16LE();
	}

	readUInt16LE() {
		return this.read(2).readUInt16LE();
	}

	readInt16BE() {
		return this.read(2).readInt16BE();
	}

	readUInt16BE() {
		return this.read(2).readUInt16BE();
	}

	readInt32LE() {
		return this.read(4).readInt32LE();
	}

	readUInt32LE() {
		return this.read(4).readUInt32LE();
	}

	readInt32BE() {
		return this.read(4).readInt32BE();
	}

	readUInt32BE() {
		return this.read(4).readUInt32BE();
	}

	readInt64BE() {
		return (this.readInt32BE() << 8) + this.readInt32BE();
	}

	readFloatBE() {
		return this.read(4).readFloatBE();
	}

	readDoubleBE() {
		return this.read(8).readDoubleBE();
	}

	readVarInt() {
		let numRead = 0;
		let result = 0;
		let read;
		
		do {
			read = this.readByte();
			const value = (read & 0b01111111);
			result |= (value << (7 * numRead));

			numRead++;
			if (numRead > 5) {
				throw new MCServerError('VarInt is too big');
			}
		} while ((read & 0b10000000) != 0);

		return result;
	}

	readString() {
		const length = this.readVarInt();
		return this.read(length).toString();
	}

	readBool() {
		return !!(this.readUInt8());
	}

	readPosition() {
		const positionBuffer = this.read(8);

		return {
			x: positionBuffer.readInt32BE() >>> 6,
			y: (positionBuffer.readInt16BE(3) >>> 2) & 0xFFF,
			z: positionBuffer.readInt32BE(4) & 0x3FFFFFF
		};
	}

	/*
		https://wiki.vg/Slot_Data seems to be either wrong or outdated
		It claims that the first section of the data is a Boolean to determine if the slot is empty or not
		This does not seem to be the case, if the slot is empty the the data only contains 0xFFFF
		If the slot is not empty the first byte seems to almost always be 0x0, except in rare cases
		Also this packet is sent twice?

		ff ff             | empty slot
		00 01 01 00 00 00 | a stone block
		00 01 01 00 01 00 | a granite block
		00 02 01 00 00 00 | a grass block
		01 48 01 00 00 00 | a minecart
		
		01 b8 01 00 00 0a
		00 00 08 00 06 50
		6f 74 69 6f 6e 00
		16 6d 69 6e 65 63
		72 61 66 74 3a 6e
		69 67 68 74 5f 76
		69 73 69 6f 6e 00 | arrow of night vision (item with NBT)
	*/
	readSlot() {
		return {};
	}
}

class BufferStreamWritable {
	constructor() {
		this._chunks = [];
	}

	data() {
		return Buffer.concat(this._chunks);
	}

	write(buffer) {
		this._chunks.push(buffer);
	}

	appendBufferLength(length) {
		this.write(Buffer.alloc(length));
	}

	writeByte(value) {
		const buffer = Buffer.alloc(1);
		buffer[0] = value;

		this.write(buffer);
	}

	writeInt8(value) {
		const buffer = Buffer.alloc(1);
		buffer.writeInt8(value);

		this.write(buffer);
	}

	writeUInt8(value) {
		const buffer = Buffer.alloc(1);
		buffer.writeUInt8(value);

		this.write(buffer);
	}

	writeInt64BE(value) {
		const buffer = Buffer.alloc(8);

		buffer.writeInt32BE(value >> 8);
		buffer.writeInt32BE(value & 0xFF, 4);

		this.write(buffer);
	}

	writeInt32BE(value) {
		const buffer = Buffer.alloc(4);
		buffer.writeInt32BE(value);

		this.write(buffer);
	}

	writeFloatBE(value) {
		const buffer = Buffer.alloc(4);
		buffer.writeFloatBE(value);

		this.write(buffer);
	}
	
	writeDoubleBE(value) {
		const buffer = Buffer.alloc(8);
		buffer.writeDoubleBE(value);

		this.write(buffer);
	}

	writeVarInt(value) {
		const buffer = Buffer.alloc(varIntSize(value));
		let offset = 0;

		do {
			let temp = value & 0b01111111;
			value >>>= 7;

			if (value != 0) {
				temp |= 0b10000000;
			}

			buffer[offset] = temp;
			offset++;
		} while (value != 0);

		this.write(buffer);
	}

	writeString(value) {
		const length = Buffer.byteLength(value);
		const buffer = Buffer.alloc(length);
		buffer.write(value);

		this.writeVarInt(length);
		this.write(buffer);
	}

	writeBool(value) {
		this.writeUInt8(value ? 1 : 0);
	}

	writePosition(data) {
		const buffer = Buffer.alloc(8);

		buffer.writeInt32BE((data.x & 0x3FFFFFF) << 6 | (data.y >>> 6));
		buffer.writeInt32BE(((data.y & 0b111111) << 26) | (data.z & 0x3FFFFFF), 4);

		this.write(buffer);
	}

	writeBuffer(buffer, { countType }) {
		if (countType === 'varint') {
			this.writeVarInt(buffer.length);
		} else {
			throw new MCServerError(`Unhandled buffer countType ${countType}`);
		}

		this.write(buffer);
	}

	writeArray(array, { countType, type: arrayType }, data) {
		let properties;

		if (arrayType instanceof Array) {
			properties = arrayType[1];
			arrayType = arrayType[0];
		}

		if (countType === 'varint') {
			this.writeVarInt(array.length);
		} else {
			throw new MCServerError(`Unhandled array countType ${countType}`);
		}

		for (const entry of array) {
			if (arrayType === 'container') {
				for (const property of properties) {
					const { name } = property;
					let { type: propertyType } = property;

					if (!entry.hasOwnProperty(name)) {
						continue;
					}

					const value = entry[name];
					let options;
					if (propertyType instanceof Array) {
						options = propertyType[1];
						propertyType = propertyType[0];
					}

					switch (propertyType) {
						case 'UUID':
							this.writeUUID(value);
							break;
						case 'switch':
							this.writeSwitch(value, options, data);
							break;
					
						default:
							throw new MCServerError(`Unhandled array propertyType ${propertyType}`);
					}
				}
			}
		}
	}

	writeUUID(uuid) {
		this.write(Buffer.from(uuidParse.parse(uuid)));
	}

	writeSwitch(value, options, data) {
		const { compareTo, fields, default: defaultType } = options;
		const compareValue = data[compareTo.replace(/[./]/g, '')]; // sometimes this is something like '../whatever', so get rid of the '../' because only 'whatever' is needed
		let type = fields[compareValue] || defaultType;

		if (type instanceof Array) {
			options = type[1];
			type = type[0];
		}

		switch (type) {
			case 'void':
				break;
			case 'string':
				this.writeString(value);
				break;
			case 'array':
				this.writeArray(value, options, data);
				break;
			case 'option':
				this.writeOptional(value, options, data);
				break;
			case 'varint':
				this.writeVarInt(value);
				break;
			case 'u8':
				this.writeUInt8(value);
				break;
			case 'f32':
				this.writeFloatBE(value);
				break;
			default:
				throw new MCServerError(`Unhandled switch type ${type}`);
		}
	}

	writeOptional(value, type) {
		if (value === null) {
			return this.writeBool(false);
		}

		this.writeBool(true);

		switch (type) {
			case 'string':
				this.writeString(value);
				break;
			default:
				throw new MCServerError(`Unhandled option type ${type}`);
		}
	}
}

module.exports = {
	BufferStreamReadable,
	BufferStreamWritable
};

function varIntSize(value) {
	let size = 0;
	while (value & -0b10000000) {
		value >>>= 7;
		size++;
	}
	
	return size + 1;
}
