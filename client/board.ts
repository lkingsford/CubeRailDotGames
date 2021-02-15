import * as PIXI from 'pixi.js'
import * as State from './state'
import { IEmuBayState, MAP, ICoordinates, getAllowedBuildSpaces, getTakeResourceSpaces } from '../game/game'

import { Ctx } from 'boardgame.io';


enum CubeTexture { EB, TMLC, LW, Narrow, Resource };
export enum BuildMode { Normal, Narrow };

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
        this.playfield.scale = new PIXI.Point(this.view_scale, this.view_scale);

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

    public buildMode?: BuildMode;

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
    private static OFFSET_X = -250;
    private static OFFSET_Y = -50;
    private view_scale = 0.5;
    private cube_place_radius = 60;

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
                tileSprite.interactive = true;
                tileSprite.on("pointertap", () => {
                    if (this.tileClickedOn) {
                        this.tileClickedOn(xy)
                    }
                });
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

        // Draw rails and cubes together
        let CubeLocations: { [index: string]: PIXI.Texture[] } = {};

        gamestate.resourceCubes.forEach((xy) => {
            let location = CubeLocations[`${xy.x},${xy.y}`];
            if (!location) {
                location = [];
            }
            location.push(Board.cubeTextures[CubeTexture.Resource]);
            CubeLocations[`${xy.x},${xy.y}`] = location;
        })

        gamestate.track.forEach((xy) => {
            let location = CubeLocations[`${xy.x},${xy.y}`];
            if (!location) {
                location = [];
            }
            location.push(Board.cubeTextures[xy.narrow ? CubeTexture.Narrow : xy.owner!]);
            CubeLocations[`${xy.x},${xy.y}`] = location;
        })

        MAP.forEach((terrain) => {
            terrain.locations.forEach(xy => {
                let cubesToPlace = CubeLocations[`${xy.x},${xy.y}`];
                if (!cubesToPlace) {
                    return;
                }

                cubesToPlace.forEach((t, i) => {
                    let sprite = new PIXI.Sprite(t);
                    sprite.anchor = new PIXI.Point(0.5, 0.5);
                    // If more than one, they're circled around centre of point
                    let angle = (i * 2 * Math.PI) / cubesToPlace.length;
                    let x = Board.TILE_WIDTH * xy.x + Board.OFFSET_X + Math.sin(angle) * this.cube_place_radius;
                    let y = Board.TILE_HEIGHT * xy.y + Board.OFFSET_Y + (xy.x % 2 == 0 ? Board.TILE_HEIGHT / 2 : 0)
                        + Math.cos(angle) * this.cube_place_radius;
                    sprite.x = x;
                    sprite.y = y;
                    this.terrain!.addChild(sprite);
                });
            });
        })

        let stage = "nostage";
        if (ctx.activePlayers) {
            stage = ctx.activePlayers![+ctx.currentPlayer];
        }

        let costStyle = new PIXI.TextStyle();
        costStyle.fill = "#ff0000";
        costStyle.stroke = "black";
        costStyle.strokeThickness = 4;
        costStyle.fontWeight = "bold";
        costStyle.fontSize = 38;
        let revStyle = new PIXI.TextStyle();
        revStyle.fill = "#00aa00";
        revStyle.stroke = "black";
        revStyle.strokeThickness = 4;
        revStyle.fontWeight = "bold";
        revStyle.fontSize = 38;

        if (stage == "buildingTrack") {
            if (gamestate.buildsRemaining! > 0) {
                let allowedSpaces = getAllowedBuildSpaces(gamestate, this.buildMode!);
                allowedSpaces.forEach((xy) => {
                    let sprite = new PIXI.Sprite(Board.canChooseTexture);
                    sprite.anchor = new PIXI.Point(0.5, 0.5);
                    // If more than one, they're circled around centre of point
                    let x = Board.TILE_WIDTH * xy.x + Board.OFFSET_X;
                    let y = Board.TILE_HEIGHT * xy.y + Board.OFFSET_Y + (xy.x % 2 == 0 ? Board.TILE_HEIGHT / 2 : 0);
                    sprite.x = x;
                    sprite.y = y;
                    this.terrain!.addChild(sprite);

                    let priceSprite = new PIXI.Text(`-₤${(xy).cost}`)
                    priceSprite.x = x - Board.TILE_WIDTH / 5;
                    priceSprite.y = sprite.y + (Board.TILE_HEIGHT / 2) - (Board.TILE_HEIGHT / 5);
                    priceSprite.anchor = new PIXI.Point(0.5, 0.5);
                    priceSprite.style = costStyle;
                    this.terrain!.addChild(priceSprite);

                    let revSprite = new PIXI.Text(`+₤${(xy).rev}`)
                    revSprite.x = x + Board.TILE_WIDTH / 5;
                    revSprite.y = sprite.y + (Board.TILE_HEIGHT / 2) - (Board.TILE_HEIGHT / 5);
                    revSprite.anchor = new PIXI.Point(0.5, 0.5);
                    revSprite.style = revStyle;
                    this.terrain!.addChild(revSprite);
                 })
            }
        }

        if (stage == "takeResources") {
            let allowedSpaces = getTakeResourceSpaces(gamestate);
                allowedSpaces.forEach((xy) => {
                    let sprite = new PIXI.Sprite(Board.canChooseTexture);
                    sprite.anchor = new PIXI.Point(0.5, 0.5);
                    // If more than one, they're circled around centre of point
                    let x = Board.TILE_WIDTH * xy.x + Board.OFFSET_X;
                    let y = Board.TILE_HEIGHT * xy.y + Board.OFFSET_Y + (xy.x % 2 == 0 ? Board.TILE_HEIGHT / 2 : 0);
                    sprite.x = x;
                    sprite.y = y;
                    this.terrain!.addChild(sprite);
                })
        }
    }

    public tileClickedOn?: (xy: ICoordinates) => void;

    public static addResources(loader: PIXI.Loader): void {
        loader.add("map_tiles", "assets/MapTiles.png");
    }

    public static tileTextures: { [index: number]: PIXI.Texture };
    public static companyTextures: { [index: number]: PIXI.Texture };
    public static canChooseTexture: PIXI.Texture;
    public static cubeTextures: { [index: number]: PIXI.Texture };

    private static TEXTURE_TILE_WIDTH = 256;
    private static TEXTURE_TILE_HEIGHT = 256;

    private static COMPANY_TILE_WIDTH = 128;
    private static COMPANY_TILE_HEIGHT = 128;
    private static COMPANY_TILE_Y = 768;

    private static CUBE_TILE_WIDTH = 128;
    private static CUBE_TILE_HEIGHT = 128;
    private static CUBE_TILE_Y = 512;


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

        {
            let srcX = 3 * Board.TEXTURE_TILE_WIDTH;
            let srcY = 0;

            Board.canChooseTexture = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                new PIXI.Rectangle(srcX, srcY, Board.TEXTURE_TILE_WIDTH, Board.TEXTURE_TILE_HEIGHT));
        }

        Board.companyTextures = {};
        for (let ix = 0; ix < 7; ix++) {
            let srcX = ix * Board.COMPANY_TILE_WIDTH;
            let srcY = Board.COMPANY_TILE_Y;
            // TODO: Maybe this shouldn't be hardcoded yaknow
            Board.companyTextures[ix] = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                new PIXI.Rectangle(srcX, srcY, Board.COMPANY_TILE_WIDTH, Board.COMPANY_TILE_HEIGHT));
        }

        Board.cubeTextures = {};
        for (let ix = 0; ix < 5; ix++) {
            let srcX = ix * Board.CUBE_TILE_WIDTH;
            let srcY = this.CUBE_TILE_Y;
            Board.cubeTextures[ix] = new PIXI.Texture(resources["map_tiles"].texture.baseTexture as PIXI.BaseTexture,
                new PIXI.Rectangle(srcX, srcY, Board.CUBE_TILE_WIDTH, Board.CUBE_TILE_HEIGHT));
        }
    }
}
