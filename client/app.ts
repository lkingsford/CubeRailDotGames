import { Client } from 'boardgame.io/client';
import { State } from 'boardgame.io';
import { SocketIO } from 'boardgame.io/multiplayer'
import { TicTacToe } from '../game/game';

class TicTacToeClient {
    private client: any;
    private rootElement: HTMLElement;
    constructor(rootElement: HTMLElement, playerID: string ) {
        this.rootElement = rootElement;
        this.client = Client({ game: TicTacToe, multiplayer: SocketIO({server: 'localhost:8000'}), playerID });
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
const app = new TicTacToeClient(appElement, 'playername1');