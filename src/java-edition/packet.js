const { BufferStreamReadable } = require('./bufferStream');
const MCServerError = require('./errors/mcserver.error');

// Generic packet class
class Packet {
	constructor(buffer, struct) {
		this.buffer = buffer;
		this.struct = struct;
		this.stream = new BufferStreamReadable(this.buffer);

		this.length = this.stream.readVarInt();
		this.id = this.stream.readVarInt();
		this.payload = new BufferStreamReadable(this.stream.read(this.length));

		if (this.struct) {
			this.serializePayload();
		}
	}

	serializePayload() {
		this.packet_specific_data = {};
		for (const definition of this.struct) {
			switch (definition.type) {
				case 'varint':
					this[definition.name] = this.payload.readVarInt();
					break;
				case 'string':
					this[definition.name] = this.payload.readString();
					break;
				case 'bool':
					this[definition.name] = this.payload.readBool();
					break;
				case 'restBuffer':
					// Could be a better way to handle this? This just gets whatever is left of the buffer
					this[definition.name] = this.payload.readBytes(this.payload._buffer.length - this.payload._position);
					break;
				case 'position':
					this[definition.name] = this.payload.readPosition();
					break;
				case 'slot':
					this[definition.name] = this.payload.readSlot();
					break;
				case 'i8':
					this[definition.name] = this.payload.readInt8();
					break;
				case 'u8':
					this[definition.name] = this.payload.readUInt8();
					break;
				case 'i16':
					this[definition.name] = this.payload.readInt16BE();
					break;
				case 'u16':
					this[definition.name] = this.payload.readUInt16BE();
					break;
				case 'i64':
					this[definition.name] = this.payload.readInt64BE();
					break;
				case 'f32':
					this[definition.name] = this.payload.readFloatBE();
					break;
				case 'f64':
					this[definition.name] = this.payload.readDoubleBE();
					break;
			
				default:
					throw new MCServerError(`Unhandled packet data type ${definition.type}`);
			}

			this.packet_specific_data[definition.name] = this[definition.name];
		}
	}
}

module.exports = Packet;