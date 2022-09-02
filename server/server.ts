import { Server } from "boardgame.io/server";
import { PostgresStore } from "bgio-postgres";
import * as Koa from "koa";
import * as KoaRouter from "koa-router";
import session, * as KoaSession from "koa-session";
import koaBody from "koa-body";
import * as Handlebars from "handlebars";
import games from "../games/games";
import * as Fs from "fs/promises";
import { Session as DbSession } from "./db/session";
import { Role, User, UserCreateResult } from "./db/user";
import { IGameDefinition } from "./IGameDefinition";
import { Game, Game as GameModel } from "./db/game";
import { Credentials } from "./db/credentials";
import { promisify } from "util";
import { Pool } from "./db/db";
const sleep = promisify(setTimeout);

// Not using types due to the types being older versions of Koa
const passport = require("koa-passport");

var hash: string = "";

interface IPlayerMetadata {
    id: number;
    name?: string;
    credentials?: string;
    data?: any;
    isConnected?: boolean;
}

// Use the player ID as the credentials. The client has to get an actual credential
// which is stored in the DB and checked against in authCredentials (because
// boardgame.io doesn't pass ctx to authCredentials)
const generateCredentials = (ctx: Koa.DefaultContext): string => {
    if (ctx.isAuthenticated()) {
        return ctx.state?.user?.userId;
    } else {
        throw new Error("user is not logged in");
    }
};

const authCredentials = async (
    credentials: string,
    playerMetadata: IPlayerMetadata
): Promise<boolean> => {
    if (credentials) {
        if (!playerMetadata) {
            // Player is not in game - needs auth true for observation
            // (but not authenticating against a player who can do things)
            return true;
        }
        if (!playerMetadata.credentials) {
            return false;
        }
        return await Credentials.CheckCredential(
            Number(playerMetadata.credentials!),
            credentials
        );
    }
    if (!playerMetadata) {
        // Same observer deal as above, but not logged int
        return true;
    }
    return false;
};

function getCommonState(ctx: Koa.Context) {
    let authenticated = ctx.isAuthenticated();
    return {
        username: ctx.state.user?.username,
        loggedin: authenticated,
        version: hash,
        observer: ctx.state.user?.roles.includes(Role.observer),
        player: ctx.state.user?.roles.includes(Role.player),
        gamemaster: ctx.state.user?.isGamemaster(),
        admin: ctx.state.user?.isAdmin(),
    };
}

async function getVersion() {
    if (hash == "") {
        let hashFile = await Fs.readFile("version.txt");
        if (!hashFile) {
            hash = "DEV";
        } else {
            hash = hashFile.toString();
        }
    }
    return hash;
}

async function registerEndpoints(
    router: KoaRouter,
    gameList: IGameDefinition[]
) {
    // This might be better datadriven, but keeping this until amount of pages is untenable
    let aboutCompiled = Handlebars.compile(
        (await Fs.readFile("templates/about.hbs")).toString()
    );
    let lobbyCompiled = Handlebars.compile(
        (await Fs.readFile("templates/lobby.hbs")).toString()
    );
    router.get("/", async (ctx: Koa.Context) => {
        if (!ctx.isAuthenticated()) {
            ctx.redirect("/about");
        } else {
            ctx.redirect("/lobby");
        }
    });

    router.get("/about", async (ctx: Koa.Context) => {
        ctx.body = aboutCompiled({ state: getCommonState(ctx) });
    });

    let newuserCompiled = Handlebars.compile(
        (await Fs.readFile("templates/newuser.hbs")).toString()
    );
    router.get("/newuser", async (ctx: Koa.Context) => {
        ctx.body = newuserCompiled({ state: getCommonState(ctx) });
    });

    let createGameCompiled = Handlebars.compile(
        (await Fs.readFile("templates/createGame.hbs")).toString()
    );
    router.get("/createGame", async (ctx: Koa.Context) => {
        let gameOptions = gameList
            .filter((i) => i.available)
            .map((i) => ({
                id: i.gameid,
                title: `${i.title} (${i.version})`,
                minPlayers: i.minPlayers,
                maxPlayers: i.maxPlayers,
            }));
        ctx.body = createGameCompiled({
            state: getCommonState(ctx),
            games: gameOptions,
        });
    });

    router.get("/lobby", async (ctx: Koa.Context) => {
        // TBD if this is a performance issue. It will improve with paging.
        let authenticated = ctx.isAuthenticated();
        let allGames = await GameModel.FindAll();
        let yourgame: any[] = [];
        let donegame: any[] = [];
        if (authenticated) {
            let allYourgames = allGames.filter((i) =>
                i.players?.some((j) => j.userId == ctx?.state.user?.userId)
            );
            yourgame = allYourgames
                .filter((i) => !i.gameover)
                .map((i) => {
                    let titleData = gameList.find(
                        (j) => j.gameid == i?.gameName
                    );
                    return {
                        description: i?.description,
                        title: titleData?.title,
                        version: titleData?.version,
                        players: i?.players?.map((k) => k.name).join(", "),
                        matchId: i?.gameId,
                        gameId: titleData?.gameid,
                        remaining: i?.openSlots,
                        anyRemaining: i?.openSlots ?? 0 > 0,
                        playerId: i?.players?.find(
                            (k) => k.userId == ctx?.state.user?.userId
                        )?.id,
                        clientUri: `/clients/${titleData?.gameid}/index.html`,
                        playerIsCurrent:
                            i?.currentPlayerId == ctx.state.user.userId,
                    };
                });
            donegame = allYourgames
                .filter((i) => i.gameover)
                .map((i) => {
                    let titleData = gameList.find(
                        (j) => j.gameid == i?.gameName
                    );
                    return {
                        description: i?.description,
                        title: titleData?.title,
                        version: titleData?.version,
                        players: i?.players?.map((k) => k.name).join(", "),
                        matchId: i?.gameId,
                        gameId: titleData?.gameid,
                        playerId: i?.players?.find(
                            (k) => k.userId == ctx?.state.user?.userId
                        )?.id,
                        clientUri: `/clients/${titleData?.gameid}/index.html`,
                    };
                });
        }
        let opengame: any = (
            await GameModel.FindOpen(ctx.state.user?.userId)
        ).map((i) => {
            let titleData = gameList.find((j) => j.gameid == i?.gameName);
            return {
                description: i?.description,
                title: titleData?.title,
                version: titleData?.version,
                players: i?.players?.map((k) => k.name).join(", "),
                matchId: i?.gameId,
                remaining: i?.openSlots,
                gameId: titleData?.gameid,
            };
        });

        let allOtherActiveGames = allGames
            .filter(
                (i) =>
                    !i.players?.some((j) => j.userId == ctx?.state.user?.userId)
            )
            .map((i) => {
                let titleData = gameList.find((j) => j.gameid == i?.gameName);
                return {
                    description: i?.description,
                    title: titleData?.title,
                    version: titleData?.version,
                    players: i?.players?.map((k) => k.name).join(", "),
                    matchId: i?.gameId,
                    remaining: i?.openSlots,
                    gameId: titleData?.gameid,
                    clientUri: `/clients/${titleData?.gameid}/index.html`,
                };
            });

        ctx.body = lobbyCompiled({
            state: getCommonState(ctx),
            yourgame: yourgame,
            opengame: opengame,
            donegame: donegame,
            otherActive: allOtherActiveGames,
        });
    });

    router.get("/logout", async (ctx: Koa.Context) => {
        ctx.logout();
        ctx.redirect("/");
    });

    let adminCompiled = Handlebars.compile(
        (await Fs.readFile("templates/admin.hbs")).toString()
    );
    router.get("/admin", async (ctx: Koa.Context) => {
        if (
            !(
                ctx.isAuthenticated() &&
                ctx.state.user?.roles.includes(Role.admin)
            )
        ) {
            ctx.status = 401;
            ctx.body = "Unauthorized to access admin tools";
            return;
        }
        let users = await User.FindAll();
        let usersState = users!.map((u) => {
            return {
                userId: u.userId!,
                username: u.username,
                admin: u.isAdmin(),
                gamemaster: u.isGamemaster(),
            };
        });
        ctx.body = adminCompiled({
            state: getCommonState(ctx),
            user: usersState,
        });
    });

    let loginCompiled = Handlebars.compile(
        (await Fs.readFile("templates/login.hbs")).toString()
    );
    router.get("/login", async (ctx: Koa.Context) => {
        ctx.body = loginCompiled({ state: getCommonState(ctx) });
    });
    router.post("/login_user", koaBody(), postLogin);

    router.put("/register_user", koaBody(), putRegister);

    router.get("/get_credentials", koaBody(), getGetCredentials);
    router.get("/get_match_player_id/:id", koaBody(), getPlayerIdInGame);

    // Default 'join' permits joining a game twice. Not allowed.
    router.use("/games/:name/:id/join", joinGame);

    // Set game name when creating
    router.use("/games/:name/create", createGame);

    router.put("/admin/change_password", koaBody(), adminChangePassword);
    router.put("/admin/save_roles", koaBody(), adminSaveRoles);
}

async function adminChangePassword(ctx: Koa.Context) {
    if (
        !(ctx.isAuthenticated() && ctx.state.user?.roles.includes(Role.admin))
    ) {
        ctx.status = 401;
        ctx.body = "Unauthorized to access admin tools";
        return;
    }
    var body = ctx.request.body;
    var user = await User.Find(body.userId);
    user!.password = body.password;
    await user?.Save();
    ctx.status = 200;
}

async function adminSaveRoles(ctx: Koa.Context) {
    if (
        !(ctx.isAuthenticated() && ctx.state.user?.roles.includes(Role.admin))
    ) {
        ctx.status = 401;
        ctx.body = "Unauthorized to access admin tools";
        return;
    }
    var body = ctx.request.body;
    var user = await User.Find(body.userId);
    user!.SetRole(Role.admin, body.admin);
    user!.SetRole(Role.gamemaster, body.gamemaster);
    await user?.Save();
    ctx.status = 200;
}

async function joinGame(ctx: Koa.Context, next: Koa.Next) {
    let game = await GameModel.Find(ctx.params.id);
    if (
        game?.players?.some((i) => {
            return i.userId == ctx.state.user?.userId;
        })
    ) {
        ctx.response.body = "Attempting to join same game twice";
        ctx.response.status = 400;
        return;
    }
    await next();
}

async function getPlayerIdInGame(ctx: Koa.Context) {
    if (!ctx.isAuthenticated()) {
        ctx.response.status = 401;
        return;
    }

    let game = await GameModel.Find(ctx.params.id);
    let playerInGame = game?.players?.find((i) => {
        return i.userId == ctx.state.user?.userId;
    });
    if (!playerInGame) {
        ctx.response.status = 400;
        ctx.response.body =
            "Player attempting to leave game that they're not in";
        return;
    }

    ctx.response.body = playerInGame.id;
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
            ctx.response.body =
                "Invalid username - must be >0 characters, no whitespace";
            break;
        case UserCreateResult.success:
            ctx.response.status = 200;
            break;
        case UserCreateResult.userExists:
            ctx.response.status = 400;
            ctx.response.body = "User already exists";
    }
    if (result.result == UserCreateResult.success) {
        // Log in to newly created user
        await ctx.login(result.user);
    }
}

async function createGame(ctx: Koa.Context, next: Koa.Next) {
    await next();
    let gameId = ctx.body.matchID;
    let desiredName = ctx.request.body.name;
    var game = await Game.Find(gameId);
    // If is empty or whitespace
    if (desiredName.match(/^ *$/) !== null) {
        desiredName = `${ctx.state.user.username}'s game`;
    }
    Game.SaveMetadata(game!.gameId!, desiredName);
    ctx.response.status = 200;
}

async function postLogin(ctx: Koa.Context) {
    return passport.authenticate(
        "local",
        (err: any, user: User, info: any, status: any) => {
            if (err) {
                console.log("error logging in");
                ctx.status = 400;
            }
            if (user) {
                console.log(`${user.username} logged in.`);
                ctx.login(user);
                ctx.status = 200;
            } else {
                ctx.status = 400;
                ctx.response.body = "Incorrect username or password";
            }
        }
    )(ctx);
}

async function getGetCredentials(ctx: Koa.Context) {
    let authenticated = ctx.isAuthenticated();
    if (!authenticated) {
        ctx.status = 200;
        ctx.body = "DummyObserver";
        return;
    }
    let cred = await Credentials.CreateCredential(ctx.state.user?.userId);
    ctx.status = 200;
    ctx.body = cred;
}

async function registerPartials() {
    Handlebars.registerPartial(
        "main",
        await (await Fs.readFile("templates/main.hbs")).toString()
    );
}

async function main() {
    const DEVELOPMENT = process.env["NODE_ENV"] == "development";
    if (DEVELOPMENT) {
        console.log("Detected development mode");
    }
    // Wait for pool before DB
    await Pool();
    const db = new PostgresStore(process.env["DB"]!);
    const PORT = 2230;
    const server = Server({
        games: games,
        db: db,
        generateCredentials: generateCredentials,
        authenticateCredentials: authCredentials,
    });
    const COOKIE_KEY = process.env["COOKIE_KEY"] ?? "koa.session";
    const APP_KEY = process.env["APP_KEY"] ?? "veryverysecret";
    const gameList: IGameDefinition[] = require("../games.json");

    let session_config = {
        key: COOKIE_KEY,
        maxAge: 86400000 * 90 /** 90 days between session/logins */,
        autoCommit:
            true /** (boolean) automatically commit headers (default true) */,
        overwrite: true /** (boolean) can overwrite or not (default true) */,
        httpOnly: true /** (boolean) httpOnly or not (default true) */,
        signed: true /** (boolean) signed or not (default true) */,
        rolling:
            false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
        renew: true /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
        secure: false /** (boolean) secure cookie - OK cause over nginx **/,
        store: new DbSession(),
    };
    // These shouldn't be ignored, but there's compatibility problems
    // following an upgrade (I think in dependency)
    // @ts-ignore
    server.app.use(session(session_config, server.app));
    server.app.use(passport.initialize());
    server.app.use(passport.session());
    server.db = db!;
    server.app.keys = [APP_KEY];

    await getVersion();

    await registerPartials();
    // @ts-ignore
    await registerEndpoints(server.router, gameList);
    server.run(PORT);
}

(async function () {
    await main();
})();
