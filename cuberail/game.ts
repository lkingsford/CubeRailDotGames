export type PlayerId = number
export type Action = (playerId: PlayerId, action: Serializable) => ActionResult;
export type Serializable = any

export enum ActionSuccess {
    OK,
    RulesViolation,
    InvalidPlayer
}

export interface ActionResult {
    status: ActionSuccess,
    newState: GameState
}

export interface GameState {
    playerStates: {privateState?: Serializable, publicState?: Serializable}[],
    commonState?: Serializable
    secretState?: Serializable
}

export interface Game {
    gameName: string
    currentState: GameState
    initialState?: GameState
}

export default Game