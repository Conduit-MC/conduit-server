# Conduit

Conduit is a custom Minecraft server written from the ground up in NodeJS

![Example gif](https://i.imgur.com/Ym9dpLJ.gif)

**THIS IS NOT MEANT TO BE USED AS A PRACTICAL ALTERNATIVE TO EXISTING SERVERS** (yet). I started this for fun to see if I could. Many things do not work.

I would eventually like to make this server feature-complete and have it be a viable replacement for servers like Spigot

## Currently only supports offline mode! Logins are NOT authenticated yet!

## Implemented (Java Edition Protocol):
- [x] Server list handshake
- [x] Server list info
- [x] Server list ping/pong
- [x] Login/join handshake
- [ ] Authentication
- [x] Server Joining
- [x] World rendering (Partially done. Chunks can render, but world generation does not exist yet)
- [x] World loading from disk (Partially done. Worlds can be loaded from disk but only on initial login. New chunks are not loaded when player moves)
- [ ] World generating
- [ ] World saving
- [ ] World interactions
- [x] Player/entity rendering
- [ ] Player/entity saving
- [x] Chat
- [x] Command handling
- [ ] Implement all vanilla commands
- [ ] Entity spawning
- [x] Movement (Mostly done. Entities now move and rotate as normal, but no checks for illegal movement are done yet)
- [ ] Entity interactions
- [x] Basic plugin system

## Implemented (Bedrock Protocol):
Not started

# Setup

You can customize the server by passing in several settings into the server object.
> ## new JavaEditionServer(version, [settings]);
## Params:
> - version: Minecraft version (IE, `1.12.2`)
> - settings: Optional. Minecraft server settings. Supports all vanilla settings, using underscores (_) instead of hyphens (-) (`allow-flight` becomes `allow_flight`)

## Example
```javascript
// Creates a 1.12.2 server with custom MOTD and 100 max players
const { JavaEditionServer } = require('conduit-server');

new JavaEditionServer('1.12.2', {
	motd: '§bWelcome to Conduit',
	max_players: 100,
	online_mode: false
});
```

# Plugins
Conduit comes with a simple plugin API. For more information, see the [Conduit Plugin repo](https://github.com/Conduit-MC/conduit-plugin)