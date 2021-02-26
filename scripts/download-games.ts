import { Clone, Repository, Oid, Reference, Revparse, Checkout, Commit } from "nodegit";
import * as fs from "fs";
import * as path from 'path';

const games: IGameDefinition[] = require("../games.json")

interface IGameDefinition {
    repository: string,
    hash: string,
    object: string,
    gameid: string,
}

const gamerepos = "gamerepos"

async function main() {

    if (!fs.existsSync(gamerepos)) {
        fs.mkdirSync(gamerepos);
    }

    return Promise.all(games.map(async (i) => {
        console.log("Starting %s", i.gameid);
        var target = path.join(gamerepos, i.gameid);
        var justCloned: boolean = false;
        if (!fs.existsSync(target)) {
            // New - so clone 
            console.log("Cloning %s", i.gameid);
            await Clone.clone(i.repository, target, {});
            justCloned = true;
        }
        var repo = await Repository.open(target);
        if (!justCloned) {
            // Old - so fetch and checkout
            console.log("Fetching %s", i.gameid);
            await repo.fetchAll();
        }
        console.log("Checking out %s", i.gameid);
        var object = await Revparse.single(repo, i.hash);
        var commit = await Commit.lookup(repo, object.id());
        await Checkout.tree(repo, commit, {checkoutStrategy: 2});
        await repo.setHeadDetached(commit.id());
        console.log("%s finished", i.gameid)
    }));
}

main().then(() => { console.log("done") }).catch((e) => { console.log("Errored {e}", e) });