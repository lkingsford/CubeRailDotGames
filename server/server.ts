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
import { Game, Game as GameModel } from './db/game';
import { Credentials } from './db/credentials';
import { promisify } from 'util';
import { Pool } from './db/db';
const sleep = promisify(setTimeout);

// Not using types due to the types being older versions of Koa
const passport = require('koa-passport');

interface IPlayerMetadata {
    id: number;
    name?: string;
    credentials?: string;
    data?: any;
    isConnected?: boolean;
};

// Use the player ID as the credentials. The client has to get an actual credential
// which is stored in the DB and checked against in authCredentials (because 
// boardgame.io doesn't pass ctx to authCredentials)
const generateCredentials = (ctx: Koa.DefaultContext): string => {
    if (ctx.isAuthenticated()) {
        return ctx.state?.user?.userId;
    } else {
        throw new Error('user is not logged in')
    }
}

const authCredentials = async (credentials: string, playerMetadata: IPlayerMetadata): Promise<boolean> => {
    if (credentials) {
        if (!playerMetadata.credentials) { return false }
        return await Credentials.CheckCredential(Number(playerMetadata.credentials!), credentials);
    }
    return false;
}


function getCommonState(ctx: Koa.Context) {
    let authenticated = ctx.isAuthenticated();
    return {
        username: ctx.state?.user?.username,
        loggedin: authenticated,
    }
}

async function registerEndpoints(router: KoaRouter, gameList: IGameDefinition[]) {
    // This might be better datadriven, but keeping this until amount of pages is untenable
    var aboutCompiled = Handlebars.compile((await Fs.readFile("templates/about.hbs")).toString());
    var lobbyCompiled = Handlebars.compile((await Fs.readFile("templates/lobby.hbs")).toString());
    router.get("/", async (ctx: Koa.Context) => {
        if (!ctx.isAuthenticated()) {
            ctx.redirect("/about");
        }
        else {
            ctx.redirect("/lobby");
        }
    });


    router.get("/about", async (ctx: Koa.Context) => {
        ctx.body = aboutCompiled({ state: getCommonState(ctx) });
    });

    var newuserCompiled = Handlebars.compile((await Fs.readFile("templates/newuser.hbs")).toString());
    router.get("/newuser", async (ctx: Koa.Context) => {
        ctx.body = newuserCompiled({ state: getCommonState(ctx) });
    });

    var createGameCompiled = Handlebars.compile((await Fs.readFile("templates/createGame.hbs")).toString());
    router.get("/createGame", async (ctx: Koa.Context) => {
        if (!ctx.isAuthenticated()) {
            ctx.response.status = 401;
            return;
        }
        let gameOptions = gameList.filter((i) => i.available)
            .map((i) => ({ id: i.gameid, title: `${i.title} (${i.version})`, minPlayers: i.minPlayers, maxPlayers: i.maxPlayers }));
        ctx.body = createGameCompiled({
            state: getCommonState(ctx),
            games: gameOptions
        });
    });

    router.get("/lobby", async (ctx: Koa.Context) => {
        // TBD if this is a performance issue. It will improve with paging.
        let authenticated = ctx.isAuthenticated();
        let allGames = (await GameModel.FindAll());
        let yourgame: any[] = [];
        let donegame: any[] = [];
        if (authenticated) {
            let allYourgames = allGames.filter((i) => i.players?.some((j) => j.userId == ctx?.state?.user?.userId));
            yourgame = allYourgames.filter((i) => !i.gameover).map(i => {
                let titleData = gameList.find((j) => j.gameid == i?.gameName);
                return {
                    description: i?.description,
                    title: titleData?.title,
                    version: titleData?.version,
                    players: i?.players?.map((k) => k.name).join(', '),
                    matchId: i?.gameId,
                    gameId: titleData?.gameid,
                    remaining: i?.openSlots,
                    playerId: i?.players?.find((k) => k.userId == ctx?.state?.user?.userId)?.id,
                    clientUri: `/clients/${titleData?.gameid}/index.html`
                }
            })
            donegame = allYourgames.filter((i) => i.gameover).map(i => {
                let titleData = gameList.find((j) => j.gameid == i?.gameName);
                return {
                    description: i?.description,
                    title: titleData?.title,
                    version: titleData?.version,
                    players: i?.players?.map((k) => k.name).join(', '),
                    matchId: i?.gameId,
                    gameId: titleData?.gameid,
                    playerId: i?.players?.find((k) => k.userId == ctx?.state?.user?.userId)?.id,
                    clientUri: `/clients/${titleData?.gameid}/index.html`
                }
            })
        }
        let opengame: any = (await GameModel.FindOpen(ctx?.state?.user?.userId)).map(i => {
            let titleData = gameList.find((j) => j.gameid == i?.gameName);
            return {
                description: i?.description,
                title: titleData?.title,
                version: titleData?.version,
                players: i?.players?.map((k) => k.name).join(', '),
                matchId: i?.gameId,
                remaining: i?.openSlots,
                gameId: titleData?.gameid
            }
        })

        let allOtherActiveGames = allGames.filter((i) => !i.players?.some((j) => j.userId == ctx?.state?.user?.userId)).map(i => {
            let titleData = gameList.find((j) => j.gameid == i?.gameName);
            return {
                description: i?.description,
                title: titleData?.title,
                version: titleData?.version,
                players: i?.players?.map((k) => k.name).join(', '),
                matchId: i?.gameId,
                remaining: i?.openSlots,
                gameId: titleData?.gameid,
                clientUri: `/clients/${titleData?.gameid}/index.html`
            }
        });

        ctx.body = lobbyCompiled({ state: getCommonState(ctx), yourgame: yourgame, opengame: opengame, donegame: donegame, otherActive: allOtherActiveGames });
    });

    router.get("/logout", async (ctx: Koa.Context) => {
        ctx.logout();
        ctx.redirect('/');
    });

    var loginCompiled = Handlebars.compile((await Fs.readFile("templates/login.hbs")).toString());
    router.get("/login", async (ctx: Koa.Context) => {
        ctx.body = loginCompiled({ state: getCommonState(ctx) });
    });
    router.post("/login_user", koaBody(), postLogin);

    router.put("/register_user", koaBody(), putRegister);

    router.get("/get_credentials", koaBody(), getGetCredentials);

    router.put("/set_game_name", koaBody(), putSetGameName);
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

async function putSetGameName(ctx: Koa.Context) {
    var body = JSON.parse(ctx.request.body);
    if (ctx.isAuthenticated()) {
        // If player is in game, can set the name
        var game = await Game.Find(body.gameId);
        if (!game?.players?.find((i) => i.userId == ctx?.state?.user?.userId)) {
            ctx.response.status = 401;
            return;
        }
        // If is empty or whitespace
        if (body.description.match(/^ *$/) !== null) {
            body.description = `${ctx.state?.user?.username}'s game`;
        }
        Game.SaveMetadata(game.gameId!, body.description);
        ctx.response.status = 200;
        return;
    }
    ctx.response.status = 401;
    return;
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

async function getGetCredentials(ctx: Koa.Context) {
    let authenticated = ctx.isAuthenticated();
    if (!authenticated) {
        ctx.status = 200;
        ctx.body = "DummyObserver";
        return;
    }
    let cred = await Credentials.CreateCredential(ctx.state!.user!.userId);
    ctx.status = 200;
    ctx.body = cred;
}

async function registerPartials() {
    Handlebars.registerPartial('main', await (await Fs.readFile("templates/main.hbs")).toString());
}

async function main() {
    const DEVELOPMENT = process.env['NODE_ENV'] == "development";
    if (DEVELOPMENT) {
        console.log("Detected development mode");
    }
    // Wait for pool before DB
    await Pool();
    const db = new PostgresStore(process.env['DB']!);
    const PORT = 2230;
    const server = Server({ games: games, db: db, generateCredentials: generateCredentials, authenticateCredentials: authCredentials })
    const COOKIE_KEY = process.env['COOKIE_KEY'] ?? "koa.session"
    const APP_KEY = process.env['APP_KEY'] ?? "veryverysecret"
    const gameList: IGameDefinition[] = require("../games.json");

    let session_config = {
        key: COOKIE_KEY,
        maxAge: 86400000,
        autoCommit: true, /** (boolean) automatically commit headers (default true) */
        overwrite: true, /** (boolean) can overwrite or not (default true) */
        httpOnly: true, /** (boolean) httpOnly or not (default true) */
        signed: true, /** (boolean) signed or not (default true) */
        rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
        renew: true, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
        secure: false, /** (boolean) secure cookie - OK cause over nginx **/
        store: new DbSession()
    }
    server.app.use(session(session_config, server.app));
    server.app.use(passport.initialize());
    server.app.use(passport.session());
    server.db = db!;
    server.app.keys = [APP_KEY];

    await registerPartials();
    await registerEndpoints(server.router, gameList);
    server.run(PORT);
}


(async function () {
    await main();
})();
