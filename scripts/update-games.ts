import {
    Clone,
    Repository,
    Oid,
    Reference,
    Revparse,
    Checkout,
    Commit,
} from "nodegit";
import * as fs from "fs";
import * as path from "path";
import { IGameDefinition } from "../server/IGameDefinition";
import * as child from "child_process";
import * as fsx from "fs-extra";

const games: IGameDefinition[] = require("../games.json");

const gamerepos = "gamerepos";
const gamefiles = "games";
const clientstatic = "clients";

async function updateRepo(game: IGameDefinition) {
    console.log("Updating repo for %s", game.gameid);
    var target = path.join(gamerepos, game.gameid);
    var justCloned: boolean = false;
    if (!fs.existsSync(target)) {
        // New - so clone
        console.log("Cloning %s", game.gameid);
        await Clone.clone(game.repository, target, {});
        justCloned = true;
    }
    var repo = await Repository.open(target);
    if (!justCloned) {
        // Old - so fetch and checkout
        console.log("Fetching %s", game.gameid);
        await repo.fetchAll();
    }
    console.log("Checking out %s", game.gameid);
    var object = await Revparse.single(repo, game.hash);
    var commit = await Commit.lookup(repo, object.id());
    await Checkout.tree(repo, commit, { checkoutStrategy: 2 });
    await repo.setHeadDetached(commit.id());
    console.log("%s repo is ready", game.gameid);
}

async function extractGameTs(game: IGameDefinition) {
    console.log("Getting game.ts for %s", game.gameid);
    return new Promise<void>(function (resolve) {
        fs.copyFile(
            path.join(gamerepos, game.gameid, "game", "game.ts"),
            path.join(gamefiles, `${game.gameid}.ts`),
            () => {
                resolve();
            }
        );
    });
}

async function generateGameslistTs(games: IGameDefinition[]) {
    console.log("Generating games.ts");
    var output: string = "";
    output += games
        .map(
            (i, idx) =>
                `import { ${i.object} as ${i.object}_${idx} } from "./${i.gameid}"`
        )
        .join("\n");
    output += "\n";
    output += `const games = [${games
        .map((i, idx) => `${i.object}_${idx}`)
        .join(", ")}];\n`;
    output += `export default games`;
    await fsx.writeFile(path.join(gamefiles, "games.ts"), output);
}

async function installClientPackages(game: IGameDefinition) {
    console.log("Installing client packages for %s", game.gameid);
    await new Promise<void>(function (resolve) {
        var npm = child.spawn("npm", [
            "--prefix",
            path.join(gamerepos, game.gameid),
            "install",
        ]);
        npm.stdout.on("data", (data) => {
            console.log("[%s]  %s", game.gameid, data);
        });
        npm.stderr.on("data", (data) => {
            console.log("[%s]! %s", game.gameid, data);
        });
        npm.on("close", (code) => {
            resolve();
        });
    });
}

async function compileClient(game: IGameDefinition) {
    console.log("Compiling client packages for %s", game.gameid);
    await new Promise<void>(function (resolve) {
        var env = { ...process.env };
        env["NODE_ENV"] = "production";
        var npm = child.spawn(
            "npm",
            [
                "--prefix",
                path.join(gamerepos, game.gameid),
                "run-script",
                "build-prod",
            ],
            { env: env }
        );
        npm.stdout.on("data", (data) => {
            console.log("[%s]  %s", game.gameid, data);
        });
        npm.stderr.on("data", (data) => {
            console.log("[%s]! %s", game.gameid, data);
        });
        npm.on("close", (code) => {
            resolve();
        });
    });
}

async function extractClientDist(game: IGameDefinition) {
    let clientPath = path.join(clientstatic, game.gameid);
    if (fsx.existsSync(clientPath)) {
        await fsx.rm(clientPath, { recursive: true });
    }
    console.log("Copying distribution for %s", game.gameid);
    await fsx.copy(
        path.join(gamerepos, game.gameid, "dist-client"),
        path.join(clientstatic, game.gameid),
        { recursive: true }
    );
}

async function main() {
    await fsx.mkdir(gamerepos, { recursive: true });
    await fsx.mkdir(gamefiles, { recursive: true });
    await fsx.mkdir(clientstatic, { recursive: true });

    await Promise.all(
        games.map(async (i) => {
            await updateRepo(i);
            await installClientPackages(i);
            await compileClient(i);
            await extractGameTs(i);
            await extractClientDist(i);
        })
    );
    await generateGameslistTs(games);
}

main()
    .then(() => {
        console.log("done");
    })
    .catch((e) => {
        console.log("Errored {e}", e);
    });
