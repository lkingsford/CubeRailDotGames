const { Server } = require('boardgame.io/server')
//const { TicTacToe } = require('../game/game')
import { PostgresStore } from "bgio-postgres"
import { Server as ServerTypes, Game } from 'boardgame.io';
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import * as Handlebars from 'handlebars';
import games from '../games/games';
import * as Fs from 'fs/promises';
import { writeFileSync } from "fs-extra";

const db = new PostgresStore(process.env['DB']!);
const PORT = 2230;
const server = Server({ games: games, db })

main();

async function registerEndpoints() {
    var router: KoaRouter = server.router;
    router.get("/hello", async (ctx: Koa.Context) => {
        ctx.body = "ROCK YA BODY";
    });

    // This might be better datadriven, but keeping this until amount of pages is untenable
    var indexCompiled = Handlebars.compile((await Fs.readFile("templates/index.hbs")).toString());
    router.get("/", async (ctx: Koa.Context) => {
        ctx.body = indexCompiled({ name: ctx.request.ip });
    });
}

async function registerPartials() {
    Handlebars.registerPartial('main', await (await Fs.readFile("templates/main.hbs")).toString());
}

function main() {
    registerPartials().then(() => {
        registerEndpoints()
    })
        .then(server.run(PORT))
        .catch((e) => console.log(e));
}