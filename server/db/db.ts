import {Pool, Client} from "pg";
export const pool = new Pool({connectionString: process.env['DB']});
