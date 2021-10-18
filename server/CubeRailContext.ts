import { Context } from "koa";
import { User } from "./db/user";

export interface CubeRailContext extends Context {
    state: CubeRailState;
}

export interface CubeRailState {
    user?: User;
}

export default CubeRailContext