import { Client } from 'boardgame.io/client';
import { State } from 'boardgame.io';
import { SocketIO } from 'boardgame.io/multiplayer'
import { EmuBayRailwayCompany, IEmuBayState } from '../game/game';
import { Board } from './board';
import { Ui } from './ui';

import * as PIXI from 'pixi.js'

class EmuBayRailwayCompanyClient {
    private client: any;
    private rootElement: HTMLElement;
    constructor(rootElement: HTMLElement, playerID: string ) {
        this.rootElement = rootElement;
        this.client = Client({ game: EmuBayRailwayCompany, numPlayers: 3});
        this.client.start();
    }

    public pixiApp = new PIXI.Application({backgroundColor: 0xEEEEFF, width: 1000, height: 1000});

    public startLoop(resources: { [index: string]: PIXI.LoaderResource }): void {
        let mapState: Board = new Board(this.pixiApp, resources);
        let theUi = new Ui()
        mapState.start();
        this.client.subscribe((state: State) => mapState.drawMap(state.G as IEmuBayState, state.ctx));
        this.client.subscribe((state: State) => theUi.update(state.G as IEmuBayState, state.ctx, this.client, mapState));
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

  

document.querySelector("#board")?.appendChild(app.pixiApp.view)
