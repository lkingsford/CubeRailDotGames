import { Client } from 'boardgame.io/client';
import { State } from 'boardgame.io';
import { SocketIO } from 'boardgame.io/multiplayer'
import { EmuBayRailwayCompany } from '../game/game';

class EmuBayRailwayCompanyClient {
    private client: any;
    private rootElement: HTMLElement;
    constructor(rootElement: HTMLElement, playerID: string ) {
        this.rootElement = rootElement;
        this.client = Client({ game: EmuBayRailwayCompany, playerID, numPlayers: 3});
        this.client.start();
        this.client.subscribe((state: State) => this.update(state))
    }

    update(state: any) {
        if (state === null) return;
        // Update UI to reflect state of game
        this.rootElement.innerText = JSON.stringify(state);
    }
}

const appElement: HTMLElement = document.getElementById('app')!;
const app = new EmuBayRailwayCompanyClient(appElement, '0');