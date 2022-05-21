import { Pool } from "./db";

export interface IGameUser {
    id: number; // <- Place
    name: string;
    userId: number; // <- Entry in the User table
}

export class Game {
    gameId?: number;
    gameName?: string;
    players?: IGameUser[];
    gameover?: any;
    updatedAt?: Date;
    openSlots?: number;
    description?: string;

    private static PlayersFromResult(row: any): IGameUser[] {
        var returns: IGameUser[] = [];
        for (var key in row) {
            if (row[key].credentials) {
                returns.push({
                    id: row[key].id,
                    name: row[key].name,
                    userId: row[key].credentials
                })
            }
        };
        return returns;
    }

    private static OpenSlotsFromResults(row: any): number {
        var result = 0;
        for (var key in row) {
            if (!row[key].credentials) {
                result += 1;
            }
        }
        return result;
    }

    public static async Find(gameId: string): Promise<Game | undefined> {
        let client = await (await Pool()).connect();
        try {
            const q = {
                text: 'SELECT id, "gameName", players, gameover, "updatedAt", description FROM "Games" LEFT JOIN "game_metadata" ON ("game_metadata"."gameId" = "Games"."id") WHERE "id" = $1;',
                values: [gameId]
            }
            let result = await client.query(q)
            if (result.rowCount == 0) {
                return undefined;
            }
            else {
                var game = new Game();
                game.gameId = result.rows[0].id;
                game.gameName = result.rows[0].gameName;
                game.players = Game.PlayersFromResult(result.rows[0].players);
                game.gameover = result.rows[0].gameover;
                game.updatedAt = result.rows[0].updatedAt;
                game.openSlots = this.OpenSlotsFromResults(result.rows[0].players);
                game.description = result.rows[0].description;
                return game;
            }
        }
        finally {
            client.release();
        }
    }

    public static async FindAll(): Promise<Game[]> {
        let client = await (await Pool()).connect();
        try {
            const q = {
                // TODO: Make this way less awful
                // This relies on json for gameover because boardgame.io doesn't seem to correctly set it
                text: `SELECT id, "gameName", players, state->'ctx'->>'gameover' as gameover, "updatedAt", description FROM "Games" LEFT JOIN "game_metadata" ON ("game_metadata"."gameId" = "Games"."id")`
            }
            let result = await client.query(q)
            return result.rows.map((row => {
                var game = new Game();
                game.gameId = row.id;
                game.gameName = row.gameName;
                game.players = Game.PlayersFromResult(row.players);
                game.gameover = row.gameover;
                game.updatedAt = row.updatedAt;
                game.description = row.description;
                game.openSlots = this.OpenSlotsFromResults(row.players);
                return game;
            }));
        }
        finally {
            client.release();
        }
    }

    public static async FindOpen(userId: number): Promise<Game[]> {
        let client = await (await Pool()).connect();
        try {

            const q = {
                // TODO: Make this way less awful
                text: `SELECT id, "gameName", players, gameover, "updatedAt" , description FROM "Games" LEFT JOIN "game_metadata" ON ("game_metadata"."gameId" = "Games"."id") WHERE "gameover" is null AND (
                    ((players->'0'->>'credentials' IS NULL) OR CAST(players->'0'->>'credentials' AS INTEGER) != $1) AND
                    ((players->'1'->>'credentials' IS NULL) OR CAST(players->'1'->>'credentials' AS INTEGER) != $1) AND
                    ((players->'2'->>'credentials' IS NULL) OR CAST(players->'2'->>'credentials' AS INTEGER) != $1) AND
                    ((players->'3'->>'credentials' IS NULL) OR CAST(players->'3'->>'credentials' AS INTEGER) != $1) AND
                    ((players->'4'->>'credentials' IS NULL) OR CAST(players->'4'->>'credentials' AS INTEGER) != $1) AND
                    ((players->'5'->>'credentials' IS NULL) OR CAST(players->'5'->>'credentials' AS INTEGER) != $1) AND
                    ((players->'6'->>'credentials' IS NULL) OR CAST(players->'6'->>'credentials' AS INTEGER) != $1)		
                 ) AND (
                 (players->'0' IS NOT null AND players->'1'->'credentials' IS NULL) OR
                 (players->'1' IS NOT null AND players->'1'->'credentials' IS NULL) OR
                 (players->'2' IS NOT null AND players->'2'->'credentials' IS NULL) OR
                 (players->'3' IS NOT null AND players->'3'->'credentials' IS NULL) OR
                 (players->'4' IS NOT null AND players->'4'->'credentials' IS NULL) OR
                 (players->'5' IS NOT null AND players->'5'->'credentials' IS NULL) OR
                 (players->'6' IS NOT null AND players->'6'->'credentials' IS NULL)
                 )`,
                values: [userId]
            }
            let result = await client.query(q)
            return result.rows.map((row => {
                var game = new Game();
                game.gameId = row.id;
                game.gameName = row.gameName;
                game.players = Game.PlayersFromResult(row.players);
                game.gameover = row.gameover;
                game.updatedAt = row.updatedAt;
                game.openSlots = this.OpenSlotsFromResults(row.players);
                game.description = row.description;
                return game;
            }));
        }
        finally {
            client.release();
        }
    }

    public static async SaveMetadata(gameId: number, description: string) {
        // Limit to not insanely long name
        let descriptionToSave = description.slice(0, 60);
        const q = {
            text: 'INSERT INTO game_metadata ("gameId", description) VALUES ($1, $2) ON CONFLICT ("gameId") DO UPDATE SET description = EXCLUDED.description;',
            values: [gameId, descriptionToSave]
        }
        let client = await (await Pool()).connect();
        try {
            await client.query(q)
        }
        finally {
            client.release();
        }
    }
}