import { Server } from 'boardgame.io/server';
import { PostgresStore } from "bgio-postgres";
import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import session, * as KoaSession from 'koa-session';
import koaBody from 'koa-body';
import * as Handlebars from 'handlebars';
import games from '../games/games';
import * as Fs from 'fs/promises';
import { Session as DbSession } from './db/session'
import { User, UserCreateResult } from './db/user'

const db = new PostgresStore(process.env['DB']!);
const PORT = 2230;
const server = Server({ games: games, db })
const COOKIE_KEY = process.env['COOKIE_KEY'] ?? "koa.session"
const APP_KEY = process.env['APP_KEY'] ?? "veryverysecret"
const DEVELOPMENT = process.env['NODE_ENV'] == "development";

main();

async function registerEndpoints() {
    var router: KoaRouter = server.router;
    router.get("/hello", async (ctx: Koa.Context) => {
        ctx.body = "ROCK YA BODY";
    });

    // This might be better datadriven, but keeping this until amount of pages is untenable
    var indexCompiled = Handlebars.compile((await Fs.readFile("templates/index.hbs")).toString());
    router.get("/", async (ctx: Koa.Context) => {
        ctx.body = indexCompiled({ name: ctx.request.ip, loggedin: false });
    });

    var newuserCompiled = Handlebars.compile((await Fs.readFile("templates/newuser.hbs")).toString());
    router.get("/newuser", async (ctx: Koa.Context) => {
        ctx.body = newuserCompiled({ name: ctx.session!.username || "No idea who ", loggedin: false });
    });

    router.put("/register_user", koaBody(), putRegister);
}

async function putRegister(ctx: Koa.Context) {
    var body = JSON.parse(ctx.request.body);
    let result = await User.CreateUser(body.username, body.password);
    switch (result) {
        case UserCreateResult.badPassword:
            ctx.response.status = 400;
            ctx.response.body = "Invalid password - must be > 8 characters";
            break;
        case UserCreateResult.success:
            ctx.response.status = 200;
            break;
        case UserCreateResult.userExists:
            ctx.response.status = 400;
            ctx.response.body = "User already exists"
    }
}

async function registerPartials() {
    Handlebars.registerPartial('main', await (await Fs.readFile("templates/main.hbs")).toString());
}

function main() {
    if (DEVELOPMENT) {
        console.log("Detected development mode");
    }
    let session_config = {
        key: COOKIE_KEY,
        maxAge: 86400000,
        autoCommit: true, /** (boolean) automatically commit headers (default true) */
        overwrite: true, /** (boolean) can overwrite or not (default true) */
        httpOnly: true, /** (boolean) httpOnly or not (default true) */
        signed: true, /** (boolean) signed or not (default true) */
        rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
        renew: true, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
        secure: !DEVELOPMENT, /** (boolean) secure cookie*/
        store: new DbSession()
    }
    server.app.keys = [APP_KEY];
    server.app.use(session(session_config, server.app));

    registerPartials().then(() => {
        registerEndpoints()
    })
        .then(() => server.run(PORT))
        .catch((e) => console.log(e));
}