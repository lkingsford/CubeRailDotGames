import * as PIXI from 'pixi.js'
import * as State from './state'
import { IEmuBayState, MAP } from '../game/game'

export class Map extends State.State {
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
    }

    playfield?: PIXI.Container;

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
    private static TILE_HEIGHT = 215 ;
    private static OFFSET_X = -100;
    private static OFFSET_Y = -100;

    public drawMap(gamestate: IEmuBayState): void {
         MAP.forEach((terrain) => {
            var texture = Map.tileTextures[terrain.textureIndex];
            terrain.locations.forEach(xy => {
                let tileSprite = new PIXI.Sprite(texture);
                tileSprite.x = Map.TILE_WIDTH * xy.x + Map.OFFSET_X;
                tileSprite.y = Map.TILE_HEIGHT * xy.y + Map.OFFSET_Y +
                    (xy.x % 2 == 0 ? Map.TILE_HEIGHT / 2 : 0);
                this.playfield!.addChild(tileSprite);
            });
         });

         gamestate.companies.forEach((co, i) => {
             if (co.home) {
                 var texture = Map.companyTextures[i];
                 let homeSprite = new PIXI.Sprite(texture);
                 let special_offset = 0;
                 if (i == 2) { special_offset = Map.TILE_WIDTH * -.25};
                 if (i == 1) { special_offset = Map.TILE_WIDTH * .5};
                homeSprite.x = Map.TILE_WIDTH * co.home.x + Map.OFFSET_X + special_offset + 
                    (Map.TILE_WIDTH - Map.COMPANY_TILE_WIDTH) / 2;
                homeSprite.y = Map.TILE_HEIGHT * co.home.y + Map.OFFSET_Y +
                    (Map.TILE_HEIGHT - Map.COMPANY_TILE_HEIGHT) / 2 +
                    (co.home.x % 2 == 0 ? Map.TILE_HEIGHT / 2 : 0);
                this.playfield!.addChild(homeSprite);
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

    static getTextures(resources: { [index: string]: PIXI.LoaderResource }) 
    {
        Map.tileTextures = {};
        for (let ix = 0; ix < 3; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                let srcX = ix * Map.TEXTURE_TILE_WIDTH;
                let srcY = iy * Map.TEXTURE_TILE_HEIGHT;
                // TODO: Maybe this shouldn't be hardcoded yaknow
                Map.tileTextures[ix + iy * 3] = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                    new PIXI.Rectangle(srcX, srcY, Map.TEXTURE_TILE_WIDTH, Map.TEXTURE_TILE_HEIGHT));
            }
        }

        Map.companyTextures = {};
        for (let ix = 0; ix < 7; ix++) {
                let srcX = ix * Map.COMPANY_TILE_WIDTH;
                let srcY = Map.COMPANY_TILE_Y;
                // TODO: Maybe this shouldn't be hardcoded yaknow
                Map.companyTextures[ix ] = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                    new PIXI.Rectangle(srcX, srcY, Map.COMPANY_TILE_WIDTH, Map.COMPANY_TILE_HEIGHT));
        }
    }
}
