import { pool } from "./db";

export interface IUser {
    userId?: number;
    username: string;
    passwordHash: string;
    role: string;
}

export class User implements IUser {
    public userId?: number;
    public username: string = "";
    public passwordHash: string = "";
    public role: string = "";

    constructor(initialValues: IUser) {
        this.userId = initialValues.userId;
        this.username = initialValues.username;
        this.passwordHash = initialValues.passwordHash;
        this.role = initialValues.role;
    }

    public static async Find(userId: number): Promise<User | undefined> {
        let client = await pool.connect();
        try {
            const q = {
                text: 'SELECT user_id, user_name, pass_hash, role FROM users WHERE user_id = $1',
                values: [userId]
            }
            let result = await client.query(q)
            await client.release();
            if (result.rowCount == 0) {
                return undefined;
            }
            else {
                return new User({
                    userId: result.rows[0][0],
                    username: result.rows[0][1],
                    passwordHash: result.rows[0][2],
                    role: result.rows[0][3]
                });
            }
        }
        finally {
            client.release();
        }
    }
}