import { Context } from "koa";
import { User } from "./db/user";

export interface ICubeRailContext extends Context {
    state: ICubeRailState;
}

export interface ICubeRailState {
    user?: User;
}