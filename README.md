CUBE RAIL DOT GAMES
-----------------------

This is the server for cuberail.games.

It is being programmed to be a generic server for boardgame.io games.

# Development

## Running for development

Requirements: Linux system with Docker and Docker Compose

```
docker-compose -f docker-compose.dev.yml up
```

Then, in Docker

```
npm i
npm run-script update-games
npm run-script start-dev
```

## Adding games

Games must be in their own repository. Add the reference to the repository to
[games.json], with the hash that is being deployed.

The requirements of that game repo are:
- The game object must be in `/game/game.ts`, and must match the name in `games.json`
- The game name in the game object must be set
- `./game/game.ts` must rely on no other libraries or files that aren't in the server
- `npm ci` must get the build requirements
- `npm run-script build-prod` must build the client to `./dist-client`
- The client must have an index.html, which loads the client. It may get the params:
    - `matchId` (the matchId to join)
    - `playerId` (the playerId to join)
    - `playerCount` (the player count for a hotseat match)
- The client must use window.location.host for the socketio server

Presently, it's a little finicky. I recommend seeing `app.ts` and the
`index.html` file in the emu-bay-railway-company-1 repo as a template.