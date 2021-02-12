import { Client } from 'boardgame.io/client';
import { State } from 'boardgame.io';
import { SocketIO } from 'boardgame.io/multiplayer'
import { EmuBayRailwayCompany, IEmuBayState } from '../game/game';
import { Board } from './board';

import * as PIXI from 'pixi.js'

class EmuBayRailwayCompanyClient {
    private client: any;
    private rootElement: HTMLElement;
    constructor(rootElement: HTMLElement, playerID: string ) {
        this.rootElement = rootElement;
        this.client = Client({ game: EmuBayRailwayCompany, playerID, numPlayers: 3});
        this.client.start();
    }

    public pixiApp = new PIXI.Application({backgroundColor: 0xEEEEFF});

    private mapState?: Board;

    public startLoop(resources: { [index: string]: PIXI.LoaderResource }): void {
        let mapState = new Board(this.pixiApp, resources);
        mapState.start();
        this.client.subscribe((state: State) => mapState.drawMap(state.G as IEmuBayState, state.ctx));
        //this.client.subscribe((state: State) => mapState.updateStatus(state.G as IEmuBayState))
    }
}

const appElement: HTMLElement = document.getElementById('app')!;
const app = new EmuBayRailwayCompanyClient(appElement, '0');

const loader = PIXI.Loader.shared;
Board.addResources(loader);


loader.load((loader: PIXI.Loader, resources: Partial<Record<string, PIXI.LoaderResource>>) => {
    console.log("Resources loaded");
    Board.getTextures(loader.resources)
    app.startLoop(loader.resources);
  })

  

document.body.appendChild(app.pixiApp.view)
app.pixiApp.resizeTo = window;