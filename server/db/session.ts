import { pool } from "./db";

export class Session {
    constructor () {
    }
    async destroy(key: string) {
        const q = {
            text: 'DELETE FROM data WHERE KEY = $1',
            values: [key]
        }
        let client = await pool.connect();
        try {
            await client.query(q);
        } 
        finally {
            client.release();
        }
    }

    async get(key: string): Promise<any> {
        const q = {
            text: 'SELECT data FROM session WHERE key = $1;',
            values: [key]
        };
        let client = await pool.connect();
        try {
            let result = await client.query(q);
            if (result.rowCount == 0) {
                return {};
            }
            let data = result.rows[0].data;
            return data;
        }
        finally {
            client.release();
        }
    }

    async set(key: string, sess: any, data: any) {
        const q = {
            text: 'INSERT INTO session (key, data, expires) VALUES ($1, $2, to_timestamp( $3 )) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, expires = EXCLUDED.expires;',
            values: [key, JSON.stringify(sess), sess._expire / 1000]
        }
        let client = await pool.connect();
        try {
            await client.query(q)
        }
        finally {
            client.release();
        }
        
    }
}