const { Server } = require('boardgame.io/server')
const { TicTacToe } = require('../game/game')
import { PostgresStore } from "bgio-postgres"
import {Server as ServerTypes} from 'boardgame.io';
import * as Koa from 'koa';

const db = new PostgresStore(process.env['DB']!);

const server = Server({ games: [TicTacToe],
                        db})

server.run(3500)

server.router.get("/hello" , async (ctx:Koa.Context) =>
{
    ctx.body = "ROCK YA BODY";
});