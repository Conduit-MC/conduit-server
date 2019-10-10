const MCServerError = require('./errors/mcserver.error');

class BufferStream {
	constructor(buffer) {
		this._buffer = buffer;
		this._position = 0;
	}

	data() {
		return this._buffer;
	}
}

class BufferStreamReadable extends BufferStream {

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

// I am 100% sure this can be done in a MUCH better way, but this works
// TODO: Fix this and make it better
class BufferStreamWritable extends BufferStream {
	constructor() {
		super(Buffer.alloc(0));
	}

	write(buffer) {
		this._buffer = Buffer.concat([
			this._buffer,
			buffer
		]);
	}

	appendBufferLength(length) {
		this.write(Buffer.alloc(length));
	}

	writeByte(value) {
		this._buffer[this._position] = value;
		this._position++;
	}

	writeInt8(value) {
		this.appendBufferLength(1);

		this._buffer.writeInt8(value, this._position);

		this._position++;
	}

	writeUInt8(value) {
		this.appendBufferLength(1);

		this._buffer.writeUInt8(value, this._position);

		this._position++;
	}

	writeInt64BE(value) {
		this.appendBufferLength(8);

		this._buffer.writeInt32BE(value >> 8, this._position);
		this._buffer.writeInt32BE(value & 0xFF, this._position + 4);

		this._position += 8;
	}

	writeInt32BE(value) {
		this.appendBufferLength(4);

		this._buffer.writeInt32BE(value, this._position);

		this._position += 4;
	}

	writeFloatBE(value) {
		this.appendBufferLength(4);

		this._buffer.writeFloatBE(value, this._position);

		this._position += 4;
	}
	
	writeDoubleBE(value) {
		this.appendBufferLength(8);

		this._buffer.writeDoubleBE(value, this._position);

		this._position += 8;
	}

	writeVarInt(value) {
		this.appendBufferLength(varIntSize(value));

		do {
			let temp = value & 0b01111111;
			value >>>= 7;

			if (value != 0) {
				temp |= 0b10000000;
			}

			this.writeByte(temp);
		} while (value != 0);
	}

	writeString(value) {
		const length = Buffer.byteLength(value);

		this.writeVarInt(length);
		this.appendBufferLength(length);

		this._buffer.write(value, this._position);

		this._position += length;
	}

	writeBool(value) {
		this.writeUInt8(value ? 1 : 0);
	}

	writePosition(data) {
		this.writeInt32BE((data.x & 0x3FFFFFF) << 6 | (data.y >>> 6));
		this.writeInt32BE(((data.y & 0b111111) << 26) | (data.z & 0x3FFFFFF));

		this._position += 8;
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