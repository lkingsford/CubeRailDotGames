import * as PIXI from 'pixi.js'
import * as State from './state'
import { IEmuBayState, MAP } from '../game/game'

import { Ctx } from 'boardgame.io';

export class Board extends State.State {
    constructor(app: PIXI.Application,
        resources: { [index: string]: PIXI.LoaderResource }) {
        super(app, resources);
        let width = app.screen.width;
        let height = app.screen.height;
        this.container.interactive = true
        // -40 is so mute button works
        this.container.hitArea = new PIXI.Rectangle(0, 0, width, height - 40)

        this.playfield = new PIXI.Container();
        this.container.addChild(this.playfield);
        this.playfield.scale = new PIXI.Point(0.6, 0.6);

        this.terrain = new PIXI.Container();
        this.terrain.x = this.statusWidth;
        this.playfield.addChild(this.terrain);

        this.statusArea = new PIXI.Container();
        this.statusArea.width = this.statusWidth;
        this.container.addChild(this.statusArea);
    }

    statusWidth = 250;

    playfield?: PIXI.Container;
    terrain?: PIXI.Container;
    statusArea?: PIXI.Container;

    onLoop(delta: number): boolean {
        return true;
    }

    onStart(): void {
        this.onResume();
    }

    onResume(): void {
    }

    onKeyDown(): void {
    }

    private static TILE_WIDTH = 187;
    private static TILE_HEIGHT = 215;
    private static OFFSET_X = -50;
    private static OFFSET_Y = -50;

    public drawMap(gamestate: IEmuBayState, ctx: Ctx): void {
        // Obviously, not for use in animation
        this.terrain?.removeChildren();
        MAP.forEach((terrain) => {
            var texture = Board.tileTextures[terrain.textureIndex];
            terrain.locations.forEach(xy => {
                let tileSprite = new PIXI.Sprite(texture);
                tileSprite.x = Board.TILE_WIDTH * xy.x + Board.OFFSET_X;
                tileSprite.y = Board.TILE_HEIGHT * xy.y + Board.OFFSET_Y +
                    (xy.x % 2 == 0 ? Board.TILE_HEIGHT / 2 : 0);
                tileSprite.anchor = new PIXI.Point(0.5, 0.5);
                this.terrain!.addChild(tileSprite);
            });
        });

        gamestate.companies.forEach((co, i) => {
            if (co.home) {
                var texture = Board.companyTextures[i];
                let homeSprite = new PIXI.Sprite(texture);
                let special_offset = 0;
                // Special, because two companies start in the same place
                if (i == 2) { special_offset = Board.TILE_WIDTH * -.3 };
                if (i == 1) { special_offset = Board.TILE_WIDTH * .3 };
                homeSprite.x = Board.TILE_WIDTH * co.home.x + Board.OFFSET_X + special_offset;
                homeSprite.y = Board.TILE_HEIGHT * co.home.y + Board.OFFSET_Y +
                    (co.home.x % 2 == 0 ? Board.TILE_HEIGHT / 2 : 0);
                homeSprite.anchor = new PIXI.Point(0.5, 0.5);
                this.terrain!.addChild(homeSprite);
            }
        })
    }

    public static addResources(loader: PIXI.Loader): void {
        loader.add("map_tiles", "assets/MapTiles.png");
    }

    public static tileTextures: { [index: number]: PIXI.Texture };
    public static companyTextures: { [index: number]: PIXI.Texture };

    private static TEXTURE_TILE_WIDTH = 256;
    private static TEXTURE_TILE_HEIGHT = 256;

    private static COMPANY_TILE_WIDTH = 128;
    private static COMPANY_TILE_HEIGHT = 128;
    private static COMPANY_TILE_Y = 768;

    static getTextures(resources: { [index: string]: PIXI.LoaderResource }) {
        Board.tileTextures = {};
        for (let ix = 0; ix < 3; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                let srcX = ix * Board.TEXTURE_TILE_WIDTH;
                let srcY = iy * Board.TEXTURE_TILE_HEIGHT;
                // TODO: Maybe this shouldn't be hardcoded yaknow
                Board.tileTextures[ix + iy * 3] = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                    new PIXI.Rectangle(srcX, srcY, Board.TEXTURE_TILE_WIDTH, Board.TEXTURE_TILE_HEIGHT));
            }
        }

        Board.companyTextures = {};
        for (let ix = 0; ix < 7; ix++) {
            let srcX = ix * Board.COMPANY_TILE_WIDTH;
            let srcY = Board.COMPANY_TILE_Y;
            // TODO: Maybe this shouldn't be hardcoded yaknow
            Board.companyTextures[ix] = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                new PIXI.Rectangle(srcX, srcY, Board.COMPANY_TILE_WIDTH, Board.COMPANY_TILE_HEIGHT));
        }
    }
}
