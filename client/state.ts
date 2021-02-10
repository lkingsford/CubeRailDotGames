import * as PIXI from 'pixi.js'
interface PIXILoaderResource { [index: string]: PIXI.LoaderResource };
export class State {
    public resources: { [index: string]: PIXI.LoaderResource };
    public app: PIXI.Application;
    public container: PIXI.Container;

    constructor ( app: PIXI.Application, resources: { [index: string]: PIXI.LoaderResource })
    {
        this.app = app;
        this.resources = resources;
        this.container = new PIXI.Container();
    }

    onStart(): void {};
    onLoop(delta: number): boolean { return false };
    onDone(): void {};
    onPause(): void {};
    onResume(): void {};
    onKeyUp(event: KeyboardEvent): void {};
    onKeyDown(event: KeyboardEvent): void {};

    private lastState: State | null = null;
    private curState: State | null = null;
    private doNotResume: boolean = false;

    setState(nextState: State, doNotResume: boolean = false) : void {
        this.doNotResume = doNotResume;
        if (this.curState != null)
        {
            this.curState.onDone();
        }
        this.curState = nextState;
    };

    pause(): void {
        this.onPause();
        this.app.stage.removeChild(this.container);
    };

    resume(): void {
        this.onResume();
        this.app.stage.addChild(this.container);
    };

    start(): void {
        this.onStart();
        this.app.stage.addChild(this.container);
    };

    done(): void {
        this.onDone();
        this.app.stage.removeChild(this.container);
    };

    loop(delta: number): boolean {
        if (this.curState == null) {
            this.lastState = null;
            return this.onLoop(delta);
        }
        if (this.lastState != this.curState) {
            this.pause();
            this.curState.start();
        }
        this.lastState = this.curState;
        if (!this.curState.loop(delta)) {
            this.curState.done();
            this.curState = null;
            if (!this.doNotResume) {
                this.resume();
            } else {
                return false;
            }
        }
        return true;
    }

    keyUp(event: KeyboardEvent): void {
        if (this.curState == null) {
            this.onKeyUp(event);
        } else {
            this.curState.keyUp(event);
        }
    }

    keyDown(event: KeyboardEvent): void {
        if (this.curState == null) {
            this.onKeyDown(event);
        } else {
            this.curState.keyDown(event);
        }
    }
}
