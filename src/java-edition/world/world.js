const fs = require('fs-extra');
const Vec3 = require('vec3');
const PrismarineChunk = require('prismarine-chunk');
const Region = require('./region');

class World {
	constructor(server) {
		this.server = server;
		this.seed = this.server.level_seed;
		this.worldDirectory = `${this.server.server_root}/world`;

		this.regions = {};
		this.chunks = {};

		this.Chunk = PrismarineChunk(this.server.version);

		if (fs.pathExistsSync(this.worldDirectory)) {
			this.loadWorldFromDisk();
		}

		this.getChunk(0, 0);
	}

	loadWorldFromDisk() {
		const chunkFiles = fs.readdirSync(`${this.worldDirectory}/region`);

		for (const chunkFileName of chunkFiles) {
			const chunkFile = `${this.worldDirectory}/region/${chunkFileName}`;

			const split = chunkFileName.split('.');
			const [x, z] = [split[1], split[2]];

			const region = new Region(chunkFile, x, z);
			this.regions[[x, z]] = region;
		}
	}

	setChunk(x, z, chunk) { // set a chunk
		this.chunks[[x, z]] = chunk;
	}

	getChunk(x, z) { // get a chunk
		if (this.chunks[[x, z]]) {
			return this.chunks[[x, z]];
		}

		const [regionX, regionZ] = [Math.floor(x / 32), Math.floor(z / 32)];
		const region = this.regions[[regionX, regionZ]];

		// TODO: Generate regions
		if (!region) {
			return;
		}

		const nbt = region.getChunk(x, z);
		// TODO: Generate chunks
		if (!nbt) {
			return;
		}

		const chunk = new this.Chunk();

		const { Sections, Biomes } = nbt.Level;

		for (const section of Sections) {
			const { Blocks, Data, BlockLight, SkyLight, Y } = section;
			const yOffset = Y * 16;

			for (let i = 0; i < 0x1000; i++) {
				const blockId = Blocks[i];
				const blockMetadata = nibble4(Data, i);
				const blockLightLevel = nibble4(BlockLight, i);
				const blockSkyLightLevel = nibble4(SkyLight, i);
				const blockBiome = Biomes[i % 256];

				const x = (i & 0xF);
				const y = (i >> 8) + yOffset;
				const z = ((i >> 4) & 0xF);

				const blockPosition = new Vec3(x, y, z);

				chunk.setBlockType(blockPosition, blockId);
				chunk.setBlockData(blockPosition, blockMetadata);
				chunk.setBlockLight(blockPosition, blockLightLevel);
				chunk.setSkyLight(blockPosition, blockSkyLightLevel);
				chunk.setBiome(blockPosition, blockBiome);
			}
		}

		this.setChunk(x, z, chunk);

		return chunk;
	}
}

module.exports = World;

function nibble4(array, index) {
	const byte = array[index/2];

	return index % 2 ? (byte >> 4) & 0x0F : byte & 0x0F;
}