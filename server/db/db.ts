import { Pool as pgPool, Client, PoolClient } from "pg";
import { promisify } from 'util';

var _pool: pgPool | undefined;
var canConnect: boolean = false;

const sleep = promisify(setTimeout);

export async function Pool(): Promise<pgPool> {
    while (!_pool || !canConnect) {
        try {
            _pool = new pgPool({ connectionString: process.env['DB'] });
            const q = { text: 'SELECT 1;' }
            let client: PoolClient | undefined;
            try {
                client = await _pool.connect();
                await client.query(q);
                canConnect = true;
            }
            finally {
                client?.release();
            }
        }
        catch (ex) {
            console.error(ex)
            console.error("Failed to connect to pg - retry in 500ms");
            await sleep(500);
        }
    }
    return _pool!;
}