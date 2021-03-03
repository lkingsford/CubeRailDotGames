import { pool } from "./db";
import { getHash, passwordOk } from '../auth';

export enum UserCreateResult {
    success,
    badPassword,
    badUsername,
    userExists
}

export class User {
    public userId?: number;
    public username: string = "";
    public passwordHash: string = "";
    public set password(val: string) {
        this.passwordHash = getHash(val);
    }
    public role: string = "";

    constructor() {
    }

    private static FromRow(row: any): User {
        let result = new User();
        result.userId = row.user_id;
        result.username = row.username;
        result.passwordHash = row.pass_hash;
        result.role = row.role;
        return result;
    }

    public static async Find(userId: number): Promise<User | undefined> {
        let client = await pool.connect();
        try {
            const q = {
                text: 'SELECT user_id, username, pass_hash, role FROM users WHERE user_id = $1;',
                values: [userId]
            }
            let result = await client.query(q)
            if (result.rowCount == 0) {
                return undefined;
            }
            else {
                return this.FromRow(result.rows[0]);
            }
        }
        finally {
            client.release();
        }
    }

    public static async FindUsername(username: string): Promise<User | undefined> {
        let client = await pool.connect();
        try {
            const q = {
                text: 'SELECT user_id, username, pass_hash, role FROM users WHERE username = $1;',
                values: [username]
            }
            let result = await client.query(q)
            if (result.rowCount == 0) {
                return undefined;
            }
            else {
                return this.FromRow(result.rows[0]);
            }
        }
        finally {
            client.release();
        }
    }

    public async Save(): Promise<void> {
        let client = await pool.connect();
        try {
            if (this.userId == undefined) {
                const select = {
                    text: 'INSERT INTO users (username, pass_hash, role) VALUES ($1, $2, $3) RETURNING user_id;',
                    values: [this.username, this.passwordHash, this.role]
                }
                let result = await client.query(select);
                await client.release();
                this.userId = result.rows[0][0];
            } else {
                const update = {
                    text: 'UPDATE user SET username = $1, pass_hash = $2, role = $3 WHERE user_id = $4',
                    values: [this.username, this.passwordHash, this.role, this.userId]
                }
                await client.query(update);
            }
        }
        finally {
            client.release;
        }
    }

    public static async CreateUser(username: string, password: string): Promise<UserCreateResult> {
        if (!passwordOk(password)) {
            return UserCreateResult.badPassword;
        }
        if (username.trim().length == 0) {
            return UserCreateResult.badUsername;
        }
        let client = await pool.connect();
        try {
            const q = {
                text: 'SELECT count(user_id) FROM users WHERE username = $1;',
                values: [username]
            }
            let result = await client.query(q)
            if (result.rows[0][0] > 0) {
                return UserCreateResult.userExists;
            }
        }
        finally {
            client.release();
        }
        let user = new User();
        user.username = username;
        user.password = password;
        user.role = "p";
        await user.Save();
        return UserCreateResult.success;
    }
}