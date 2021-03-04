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
import { IGameDefinition } from './IGameDefinition';

// Not using types due to the types being older versions of Koa
const passport = require('koa-passport');


// Use the player ID as the credentials
const generateCredentials = (ctx: Koa.DefaultContext): string => {
    if (ctx.isAuthenticated()) {
        return ctx.state?.user?.user_id;
    } else {
        throw new Error('user is not logged in')
    }
}


const db = new PostgresStore(process.env['DB']!);
const PORT = 2230;
const server = Server({ games: games, db: db, generateCredentials: generateCredentials })
const COOKIE_KEY = process.env['COOKIE_KEY'] ?? "koa.session"
const APP_KEY = process.env['APP_KEY'] ?? "veryverysecret"
const DEVELOPMENT = process.env['NODE_ENV'] == "development";
const gameList: IGameDefinition[] = require("../games.json");

main();

async function registerEndpoints() {
    var router: KoaRouter = server.router;

    // This might be better datadriven, but keeping this until amount of pages is untenable
    var aboutCompiled = Handlebars.compile((await Fs.readFile("templates/about.hbs")).toString());
    var lobbyCompiled = Handlebars.compile((await Fs.readFile("templates/lobby.hbs")).toString());
    router.get("/", async (ctx: Koa.Context) => {
        if (!ctx.isAuthenticated()) {
            ctx.body = aboutCompiled({ username: ctx.state?.user?.username, loggedin: ctx.isAuthenticated() });
        }
        else {
            ctx.body = lobbyCompiled({ username: ctx.state?.user?.username, loggedin: ctx.isAuthenticated() });
        }
    });

    router.get("/about", async (ctx: Koa.Context) => {
        ctx.body = aboutCompiled({ username: ctx.state?.user?.username, loggedin: ctx.isAuthenticated() });
    });

    var newuserCompiled = Handlebars.compile((await Fs.readFile("templates/newuser.hbs")).toString());
    router.get("/newuser", async (ctx: Koa.Context) => {
        ctx.body = newuserCompiled({});
    });

    var createGameCompiled = Handlebars.compile((await Fs.readFile("templates/createGame.hbs")).toString());
    router.get("/createGame", async (ctx: Koa.Context) => {
        let gameOptions = gameList.filter((i) => i.available)
            .map((i) => ({ id: i.gameid, title: `${i.title} (${i.version})` }));
        ctx.body = createGameCompiled({
            username: ctx.state?.user?.username,
            loggedin: ctx.isAuthenticated(),
            games: gameOptions
        });
    });

    router.get("/logout", async (ctx: Koa.Context) => {
        ctx.logout();
        ctx.redirect('/');
    });

    var loginCompiled = Handlebars.compile((await Fs.readFile("templates/login.hbs")).toString());
    router.get("/login", async (ctx: Koa.Context) => {
        ctx.body = loginCompiled({});
    });
    router.post("/login_user", koaBody(), postLogin);

    router.put("/register_user", koaBody(), putRegister);
}

async function putRegister(ctx: Koa.Context) {
    var body = JSON.parse(ctx.request.body);
    let result = await User.CreateUser(body.username, body.password);
    switch (result.result) {
        case UserCreateResult.badPassword:
            ctx.response.status = 400;
            ctx.response.body = "Invalid password - must be >8 characters";
            break;
        case UserCreateResult.badUsername:
            ctx.response.status = 400;
            ctx.response.body = "Invalid username - must be >0 characters, no whitespace";
            break;
        case UserCreateResult.success:
            ctx.response.status = 200;
            break;
        case UserCreateResult.userExists:
            ctx.response.status = 400;
            ctx.response.body = "User already exists"
    }
    if (result.result == UserCreateResult.success) {
        // Log in to newly created user
        await ctx.login(result.user);
    }
}

async function postLogin(ctx: Koa.Context) {
    return passport.authenticate('local', (err: any, user: User, info: any, status: any) => {
        if (err) {
            console.log('error logging in')
            ctx.status = 400
        }
        if (user) {
            console.log(`${user.username} logged in.`)
            ctx.login(user)
            ctx.session!.role = { role: user.role }
            ctx.status = 200
        } else {
            ctx.status = 400
            ctx.response.body = "Incorrect username or password"
        }
    })(ctx);
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
    server.app.use(passport.initialize());
    server.app.use(passport.session());
    server.db = db;

    registerPartials().then(() => {
        registerEndpoints()
    })
        .then(() => server.run(PORT))
        .catch((e) => console.log(e));
}