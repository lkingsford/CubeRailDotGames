export interface GameDefinition {
    repository: string;
    hash: string;
    object: string;
    gameid: string;
    title: string;
    designer: string;
    version: string;
    available: boolean;
    minPlayers: number;
    maxPlayers: number;
}
