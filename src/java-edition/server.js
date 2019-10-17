const dgram = require('dgram');
const net = require('net');
const execSync = require('child_process').execSync;
const fs = require('fs-extra');
const ini = require('ini');
const crypto = require('crypto');
const RSA = require('node-rsa');
const async = require('async');
const MCData = require('minecraft-data');

const udp_socket = dgram.createSocket('udp4');
const tcp_server = net.createServer();

const EventEmitter = require('eventemitter2').EventEmitter2;

const Logger = require('./logger');

const Client = require('./client');

const RCON = require('./rcon');
const Query = require('./query');

const World = require('./world');

class MCServer extends EventEmitter {
	constructor(version, properties = {}) {
		super();

		// protocol spec for given server version
		this.data = MCData(version);

		// key pair for Encryption Request packet (currently unused)
		this.key = new RSA({ b: 1024 });

		// server initialized state
		this.initialized = false;

		this.server_root = process.cwd(); // path to the working directory where the server instance was created
		this.logger = new Logger(this.server_root);

		this.plugins = []; // plugin storage
		this.commands = {}; // command handlers

		// the world used on the server (currently unused)
		this.world = new World();

		this.version = version; // Minecraft version
		this.protocolVersion = this.data.version.version; // Protocol version
		this.properties = properties; // server properties

		// server sockets
		this.udp_socket = udp_socket;
		this.tcp_server = tcp_server;

		// query and rcon protocol properties
		this.query = {};
		this.rcon = {};

		// populate query and rcon protocol property objects
		this.properties.query = (this.properties.query == null ? {} : this.properties.query);
		this.properties.rcon  = (this.properties.rcon  == null ? {} : this.properties.query);

		// server property defaults (https://minecraft.gamepedia.com/Server.properties)
		// TODO: add support for 'server.properties' file
		this.allow_flight = (this.properties.allow_flight == null ? false : this.properties.allow_flight);
		this.allow_nether = (this.properties.allow_nether == null ? true : this.properties.allow_nether);
		this.difficulty = (this.properties.difficulty == null ? 1 : this.properties.difficulty);
		this.enable_query = (this.properties.enable_query == null ? false : this.properties.enable_query);
		this.enable_rcon = (this.properties.enable_rcon == null ? false : this.properties.enable_rcon);
		this.enable_command_block = (this.properties.enable_command_block == null ? false : this.properties.enable_command_block);
		this.force_gamemode = (this.properties.force_gamemode == null ? false : this.properties.force_gamemode);
		this.gamemode = (this.properties.gamemode == null ? 0 : this.properties.gamemode);
		this.generate_structures = (this.properties.generate_structures == null ? true : this.properties.generate_structures);
		this.generator_settings = (this.properties.generator_settings == null ? null : this.properties.generator_settings);
		this.hardcore = (this.properties.hardcore == null ? false : this.properties.hardcore);
		this.level_name = (this.properties.level_name == null ? 'world' : this.properties.level_name);
		this.level_seed = (this.properties.level_seed == null ? this.constructor.generateSeed() : this.properties.level_seed);
		this.level_type = (this.properties.level_type == null ? 'DEFAULT' : this.properties.level_type);
		this.max_build_height = (this.properties.max_build_height == null ? 256 : this.properties.max_build_height);
		this.max_players = (this.properties.max_players == null ? 20 : this.properties.max_players);
		this.max_tick_time = (this.properties.max_tick_time == null ? 60000 : this.properties.max_tick_time);
		this.max_world_size = (this.properties.max_world_size == null ? 29999984 : this.properties.max_world_size);
		this.motd = (this.properties.motd == null ? 'A Minceraft Server' : this.properties.motd);
		this.network_compression_threshold = (this.properties.network_compression_threshold == null ? 256 : this.properties.network_compression_threshold);
		this.online_mode = (this.properties.online_mode == null ? true : this.properties.online_mode);
		this.op_permission_level = (this.properties.op_permission_level == null ? 4 : this.properties.op_permission_level);
		this.player_idle_timeout = (this.properties.player_idle_timeout == null ? 0 : this.properties.player_idle_timeout);
		this.prevent_proxy_connections = (this.properties.prevent_proxy_connections == null ? false : this.properties.prevent_proxy_connections);
		this.pvp = (this.properties.pvp == null ? true : this.properties.pvp);
		this.query.port = (this.properties.query.port == null ? 25565 : this.properties.query.port);
		this.rcon.password = (this.properties.rcon.password == null ? null : this.properties.rcon.password);
		this.rcon.port = (this.properties.rcon.port == null ? 25575 : this.properties.rcon.port);
		this.resource_pack = (this.properties.resource_pack == null ? null : this.properties.resource_pack);
		this.resource_pack_sha1 = (this.properties.resource_pack_sha1 == null ? null : this.properties.resource_pack_sha1);
		this.server_ip = (this.properties.server_ip == null ? null : this.properties.server_ip);
		this.server_port = (this.properties.server_port == null ? 25565 : this.properties.server_port);
		this.snooper_enabled = (this.properties.snooper_enabled == null ? true : this.properties.snooper_enabled);
		this.spawn_animals = (this.properties.spawn_animals == null ? true : this.properties.spawn_animals);
		this.spawn_monsters = (this.properties.spawn_monsters == null ? true : this.properties.spawn_monsters);
		this.spawn_npcs = (this.properties.spawn_npcs == null ? true : this.properties.spawn_npcs);
		this.spawn_protection = (this.properties.spawn_protection == null ? 16 : this.properties.spawn_protection);
		this.use_native_transport = (this.properties.use_native_transport == null ? true : this.properties.use_native_transport);
		this.view_distance = (this.properties.view_distance == null ? 10 : this.properties.view_distance);
		this.white_list = (this.properties.white_list == null ? false : this.properties.white_list);

		// bind socket events to internal handlers
		this.udp_socket.on('message', this.constructor.handleUDPPacket.bind(this));
		this.tcp_server.on('connection', this.constructor.handleTCPConnection.bind(this));

		this.connected_clients = []; // connect socket clients (not only player clients)
		this.players = {}; // connected player clients
		this.current_eid = 0; // incrementing entity ID
		
		if (this.properties.enable_rcon) { // enable RCON protocol if needed
			this.RCON = new RCON(this.properties.rcon);
		}

		if (this.properties.enable_query) { // enable query protocol if needed
			this.QueryProtocol = new Query(this);
		}

		// Begin starting the server
		this.startServer();
	}

	async startServer() {

		this.logger.info(`Starting minecraft server version ${this.version}`);

		// Check if the EULA file exists and create it if not
		// TODO: make this cleaner (appendFileSync opens and closes a file handle on each call)
		if (await !fs.pathExists(`${this.server_root}/eula.txt`)) {
			this.logger.warn('Failed to load eula.txt');

			await fs.ensureFile(`${this.server_root}/eula.txt`);
			await fs.appendFile(`${this.server_root}/eula.txt`, '#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).\n');
			await fs.appendFile(`${this.server_root}/eula.txt`, 'eula=false');
		}

		// Check if the EULA has been accepted and kill the server if not
		const EULA = ini.parse(fs.readFileSync(`${this.server_root}/eula.txt`).toString());
		if (!EULA.eula) {
			this.logger.warn('You need to agree to the EULA in order to run the server. Go to eula.txt for more info.');
			return this.killServer();
		}

		// Load all *3rd party* plugins first. These are not internal plugins
		// loading them first ensures that they are run first during events,
		// meaning they will always be able to change internal server behavior
		if (await fs.pathExists(`${this.server_root}/plugins`)) {
			await this.loadPlugins();
		}

		// Load all the plugins that handle server logic
		// Using the async module this is done in parallel
		const logic_plugins = await fs.readdir(`${__dirname}/server_logic`);
		async.each(logic_plugins, (plugin_name, callback) => {
			// Get the full file path to the plugin
			const plugin_path = `${__dirname}/server_logic/${plugin_name}`;

			this.logger.info(`Loading plugin ${plugin_name}`);

			// Create object to store the plugin data and instance
			const logic_plugin_data = {};
			const logic_plugin = require(plugin_path); // Require the plugin
			logic_plugin_data.plugin = new logic_plugin(this); // Create a new instance
			logic_plugin_data.plugin.enabled = true; // Set it to enabled (currently unused. added to feel more like Spigot)
			logic_plugin_data.plugin.onEnabled ? logic_plugin_data.plugin.onEnabled() : null;
			this.plugins.push(logic_plugin_data); // Store plugin

			this.logger.success(`Successfully loaded logic plugin: ${plugin_name}!`);
			callback();
		}, () => {
			// Server is now initialized and ready to start
			this.initialized = true;
			this.emit('initialized');
	
			// Start listening on the socket
			this.listen();
		});
	}

	// Stops the server and kills the sockets
	killServer() {
		this.logger.info('Stopping server');

		this.udp_socket.close();
		this.tcp_server.close();
	}

	// Load 3rd party plugins
	async loadPlugins() {
		/*
			Returns a list of folder names of valid plugins
			A plugin is only valid if it:
				- is a folder
				- has an index.js or a package.json
			otherwise, the plugin entry point cannot be properly assumed
		*/
		const plugins = fs.readdirSync(`${this.server_root}/plugins`).filter(async plugin_name => {
			const plugin_path = `${this.server_root}/plugins/${plugin_name}`;

			return (
				fs.statSync(plugin_path).isDirectory() &&
				(await fs.pathExists(`${plugin_path}/package.json`) || await fs.pathExists(`${plugin_path}/index.js`))
			);
		});

		// Load all the plugins in parallel
		// Return a promise so this can be 'await'-ed
		return new Promise(resolve => {
			async.each(plugins, (plugin_name, callback) => {
				this.logger.info(`Loading plugin ${plugin_name}`);

				const plugin_path = `${this.server_root}/plugins/${plugin_name}`; // Get the full file path to the plugin
				let package_data; // package.json data

				// check if the plugin has a package.json file and if so read it
				if (fs.pathExistsSync(`${plugin_path}/package.json`)) {
					package_data = require(`${plugin_path}/package.json`);
				}

				// check if the plugin has package data and dependencies
				if (package_data && package_data.dependencies) {
					// assume that if node modules exists then we don't have to install anything
					if (!fs.pathExistsSync(`${plugin_path}/node_modules`)) {
						this.logger.info(`Installing dependencies for plugin ${plugin_name}. This may take a while...`);

						// install plugin dependencies
						execSync('npm i', {
							cwd: plugin_path
						});
					}
				}

				this.logger.info(`All ${plugin_name} plugin dependencies met`);

				// Create object to store the plugin data and instance
				const plugin_data = {};
				let plugin;
				plugin_data.metadata = package_data || {};

				// Try to require the plugin and gracefully return if failed
				try {
					plugin = require(plugin_path);
				} catch (error) {
					this.logger.error(`Failed to load plugin '${plugin_name}'! ${error}`);
					return callback();
				}

				plugin_data.plugin = new plugin(this); // Create a new instance
				plugin_data.plugin.enabled = true; // Set it to enabled (currently unused. added to feel more like Spigot)
				plugin_data.plugin.onEnabled ? plugin_data.plugin.onEnabled() : null;
				this.plugins.push(plugin_data); // Store plugin

				this.logger.success(`Successfully loaded ${plugin_name}!`);

				callback();
			}, resolve);
		});
	}

	// Generate a world seed (currently unused)
	static generateSeed() {
		return crypto.randomBytes(24).toString('hex');
	}

	// Handle UDP packet (currently unused)
	static handleUDPPacket(packet, client) {
		console.log(packet, client);
	}

	// Handle TCP connection request
	static handleTCPConnection(socket) {
		// Create a new Client with the TCP socket
		const client = new Client(socket, this);

		this.connected_clients[client.getEntityId()] = client; // Store client

		// Track ALL events sent by the client (including all packets to be handled by plugins)
		client.onAny((name, ...data) => {
			this.emit(name, client, ...data);
		});
	}

	// Start the socket servers
	listen() {
		this.udp_socket.bind(this.server_port);
		this.tcp_server.listen(this.server_port);

		this.logger.info('Server listening');

		this.emit('listening');

		this.startTicking(20); // 20 ticks per second
	}

	startTicking(TPS) {
		function stopTicking() {
			if (this.ticker) {
				clearInterval(this.ticker);
			}
			this.ticker = null;
		}

		this.ticks = 0;
		this.last_tick = 0;

		stopTicking.call(this);

		this.ticker = setInterval(() => {
			this.ticks++;

			const current_time = Date.now();

			let time = (current_time - this.last_tick) / 1000;
			if (time > 100) {
				time = 0;
			}
			
			this.emit('tick', time, this.ticks);
			
			this.last_tick = current_time;
		}, 1000 / TPS);
	}

	keepAlive(client) {
		setInterval(() => {
			client.write('keep_alive', {
				//keepAliveId: bignum(9223372036854775807).rand().toNumber()
			});
		}, 20000); // wiki.vg states to send this every 30 seconds, lets send it every 20 just to be safe
	}

	nextEntityId() {
		return ++this.current_eid;
	}

	broadcast(name, data, except) {
		for (const uuid in this.players) {
			const player = this.players[uuid];

			if (except && player.id === except.id) {
				continue;
			}

			console.log('writing', name, 'to player', player.getUsername());
			player.write(name, data);
		}
	}
}

module.exports = MCServer;