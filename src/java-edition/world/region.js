const fs = require('fs-extra');

const NBT = require('../nbt');
const NBTReader = new NBT();

const SECTOR_SIZE = 4096;

class Region {
	constructor(file, x, z) {
		this.file = fs.openSync(file);

		this.x = x;
		this.z = z;

		this.locations = Buffer.alloc(SECTOR_SIZE);
		this.timestamps = Buffer.alloc(SECTOR_SIZE);

		fs.readSync(this.file, this.locations, 0, SECTOR_SIZE);
		fs.readSync(this.file, this.timestamps, 0, SECTOR_SIZE);

		this.chunks = {};
	}

	getLocationOffset(x, z) {
		return 4 * ((x & 31) + (z & 31) * 32);
	}

	getTimestampOffset(x, z) {
		return this.getLocationOffset(x, z) + SECTOR_SIZE;
	}

	getChunk(x, z) {
		return this.chunks[[x, z]] ? this.chunks[[x, z]] : this.loadchunk(x, z);
	}

	loadchunk(x, z) {
		const locationEntry = this.getLocationOffset(x, z);
		const location = this.locations.readUInt32BE(locationEntry);
		const sectorOffset = ((location >> 8) & 0xFFFFFF); // First 3 bytes are offset 
		const sectorCount = location & 0xFF; // Last byte is size of section of file

		const sectorStart = sectorOffset * SECTOR_SIZE;
		const sectorEnd = (sectorOffset + sectorCount) * SECTOR_SIZE;
		const sectorSize = sectorEnd - sectorStart;
		const sectorBuffer = Buffer.alloc(sectorSize);

		if (sectorStart === 0 && sectorEnd === 0) {
			return;
		}

		fs.readSync(this.file, sectorBuffer, 0, sectorSize, sectorStart);

		const chunkSize = sectorBuffer.readUInt32BE();
		//const chunkCompression = sectorBuffer.readUInt8(4); // Unused, nbt.js checks this
		const chunkData = sectorBuffer.subarray(5, chunkSize + 5);
		const chunkNBT = NBTReader.parse(chunkData);

		const {xPos, zPos} = chunkNBT.Level;

		this.chunks[[xPos, zPos]] = chunkNBT;
		
		return chunkNBT;
	}
}

module.exports = Region;