const { Server } = require('boardgame.io/server')
const { TicTacToe } = require('../game/game')
import { PostgresStore } from "bgio-postgres"

const db = new PostgresStore(process.env['DB']!);
const server = Server({ games: [TicTacToe], db});
server.run(3500)