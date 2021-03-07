import { systems } from "pixi.js";
import { pool } from "./db";
import { nanoid } from "nanoid";

export class Credentials {
    public static async CreateCredential(userId: number): Promise<string | undefined> {
        let cred = nanoid();
        let client = await pool.connect()
        try {
            const q = {
                text: 'INSERT INTO credstore ("userId", credential, created) VALUES ($1, $2, NOW())',
                values: [userId, cred]
            }
            await client.query(q);
            return cred;
        }
        finally {
            client.release();
        }
    }

    public static async CheckCredential(userId: number, credential: string): Promise<boolean> {
        let client = await pool.connect()
        try {
            const q = {
                text: 'SELECT "userId" FROM credstore WHERE credential = $1',
                values: [credential]
            }
            let result = await client.query(q);
            return result.rows[0].userId == userId;
        }
        finally {
            client.release();
        }
    }
}