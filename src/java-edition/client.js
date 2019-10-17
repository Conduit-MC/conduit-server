const Player = require('./entities/living/player');

const States = require('./states'); // Possible states
const Packet = require('./packet'); // Packet class
const util = require('./util'); // util methods
const MCServerError = require('./errors/mcserver.error');
const { BufferStreamReadable, BufferStreamWritable } = require('./bufferStream');

// Client represents a TCP connection, but not necessarily a player though it almost always is
class Client extends Player {
	constructor(socket, server) {
		super(server);

		this.socket = socket; // TCP socket
		this.socket.setNoDelay(true); // Disable Nagle algorithm

		this.state = States.HANDSHAKE; // Initial client state

		// Bind socket packets to event handler
		this.socket.on('data', data => {
			this.constructor.handlePacket.call(this, data);
		});

		// Handle socket closing
		this.socket.on('close', () => {
			this.emit('exit');
		});

		this.socket.on('error', error => {
			console.log(error);
		});

		// Update the client and server ever tick
		this.server.on('tick', () => {
			if (this.getState() === States.PLAY) {
				this.write('entity', {
					entityId: this.id
				});
			}
		});
	}

	// Write packets using packet name and struct
	write(name, data) {
		// Do nothing if socket is supposed to be closed
		if (this.socket.destroyed) {
			return;
		}

		let protocol_set; // Different protocol sets based on the clients state

		// Find the protocol set
		switch (this.state) {
			case States.HANDSHAKE:
				protocol_set = this.server.data.protocol.handshaking.toClient;
				break;
			case States.STATUS:
				protocol_set = this.server.data.protocol.status.toClient;
				break;
			case States.LOGIN:
				protocol_set = this.server.data.protocol.login.toClient;
				break;
			case States.PLAY:
				protocol_set = this.server.data.protocol.play.toClient;
				break;
			default:
				throw new MCServerError(`Unknown client state '${this.state}'`);
		}

		const packetID = util.packetNameToProtocolID(protocol_set, name); // Get the packet ID based on the packet name string
		const struct = util.getProtocolIDStruct(protocol_set, packetID); // Get the packet struct

		const packetData = new BufferStreamWritable();
		packetData.writeVarInt(packetID);

		for (let definition of struct) {
			for (const key in data) {
				if (key == definition.name) {
					if (definition.type instanceof Array) {
						definition = {
							type: definition.type[0],
							options: definition.type[1],
						};
					}

					switch (definition.type) {
						case 'varint':
							packetData.writeVarInt(data[key]);
							break;
						case 'string':
							packetData.writeString(data[key]);
							break;
						case 'bool':
							packetData.writeBool(data[key]);
							break;
						case 'position':
							packetData.writePosition(data[key]);
							break;
						case 'buffer':
							packetData.writeBuffer(data[key], definition.options);
							break;
						case 'array':
							packetData.writeArray(data[key], definition.options, data);
							break;
						case 'UUID':
							packetData.writeUUID(data[key]);
							break;
						case 'switch':
							packetData.writeSwitch(data[key], definition.options, data);
							break;
						case 'entityMetadata':
							packetData.writeEntityMetadata(data[key]);
							break;
						case 'i8':
							packetData.writeInt8(data[key]);
							break;
						case 'u8':
							packetData.writeUInt8(data[key]);
							break;
						case 'i32':
							packetData.writeInt32BE(data[key]);
							break;
						case 'i64':
							packetData.writeInt64BE(data[key]);
							break;
						case 'f32':
							packetData.writeFloatBE(data[key]);
							break;
						case 'f64':
							packetData.writeDoubleBE(data[key]);
							break;
						default:
							throw new MCServerError(`Unsupported data type found ${definition.type}`);
					}
				}
			}
		}

		const packet = new BufferStreamWritable();
		packet.writeVarInt(packetData.data().length);
		packet.write(packetData.data());

		this.writeRaw(packet.data());
	}

	writeRaw(data) {
		this.socket.write(data);
	}

	static handlePacket(stream) {
		if (stream[0x00] == 0xFE) {
			this.emit('legacy_ping', this, stream);
			return;
		}
		
		const packets = util.splitPacketStream(stream); // TCP is a streaming protocol. Assume all packets are merged
		
		for (const buffer of packets) {
			if (buffer[0x00] == 0x01) { // ignore packets with no payload
				continue;
			}

			let protocol_set;
			const packetData = new BufferStreamReadable(buffer);
			packetData.readVarInt(); // Packet length
			const packet_id =packetData.readVarInt();
	
			switch (this.state) {
				case States.HANDSHAKE:
					protocol_set = this.server.data.protocol.handshaking.toServer;
					break;
				case States.STATUS:
					protocol_set = this.server.data.protocol.status.toServer;
					break;
				case States.LOGIN:
					protocol_set = this.server.data.protocol.login.toServer;
					break;
				case States.PLAY:
					protocol_set = this.server.data.protocol.play.toServer;
					break;
				default:
					throw new Error(`Unknown client state '${this.state}'`);
			}
	
			const packet_name = util.protocolIDToName(protocol_set, packet_id);
			const packet = new Packet(buffer, util.getProtocolIDStruct(protocol_set, packet_id));
			packet.state = this.state;
			packet.name = packet_name;
	
			this.emit('packet', packet);
			this.emit(packet_name, packet);
		}
	}

	kill() {
		this.socket.destroy();

		return this;
	}

	setState(state) {
		this.state = state;

		return this;
	}

	getState() {
		return this.state;
	}

	sendServerInfoPing() {
		this.setState(States.STATUS);

		const payload = {
			version: {
				name: this.server.version,
				protocol: this.server.protocolVersion
			},
			players: {
				max: this.server.max_players,
				online: this.server.players.length,
				sample: []
			},
			description: {
				text: this.server.motd
			}
		};

		if (payload.players.online > 0) {
			const sample = [];

			// size 10 sample size
			for (let i = 9; i >= 0; i--) {
				const player = this.server.players[i];
				if (player) {
					sample.push({
						name: player.username,
						id: player.uuid
					});
				}
				
			}
			payload.players.sample = sample;
		}

		this.write('server_info', {
			response: JSON.stringify(payload)
		});

		return this;
	}

	ping(time) {
		this.write('ping', { time });

		return this;
	}
}

module.exports = Client;