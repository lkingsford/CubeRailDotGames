const { Server } = require('boardgame.io/server')
//const { TicTacToe } = require('../game/game')
import { PostgresStore } from "bgio-postgres"
import {Server as ServerTypes} from 'boardgame.io';
import * as Koa from 'koa';

const db = new PostgresStore(process.env['DB']!);

const server = Server({ games: [],
                        db})

server.run(2230)

server.router.get("/hello" , async (ctx:Koa.Context) =>
{
    ctx.body = "ROCK YA BODY";
});