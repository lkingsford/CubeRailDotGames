import { INVALID_MOVE } from 'boardgame.io/core'
import { Ctx } from 'boardgame.io'

enum CompanyID { 
  EB = 0,
  TMLC,
  LW,
  GT,
  MLM,
  NED,
  NMF
}

interface IBond {
  deferred: boolean;
  baseInterest: number;
  interestDelta: number;
}

interface IPlayer {
  cash: number;
}

interface ICoordinates {
  x: number,
  y: number
}

interface ITrackBuilt extends ICoordinates {
  owner?: CompanyID;
  narrow: boolean;
}

interface IEmuBayState {
  players: IPlayer[];
  companies: {
    cash: number;
    trainsRemaining: number;
    narrowGaugeRemaining: number;
    resourcesHeld: number;
    currentRevenue: number;
    bonds: IBond[];
    sharesHeld: number[];
    reservedSharesRemaining: number;
  }[];
  actionCubeLocations: boolean [];
  actionCubeTakenFrom?: actions;
  resourceCubes: ICoordinates[];
  track: ITrackBuilt[];
  winningBidder?: number;
  passed?: boolean[];
  playerAfterAuction?: number;
};

interface ILocation extends ICoordinates {
  label?: string;
}

interface ITerrain {
    // What else could I call it?
    biomeName: string;
    canPlaceResource: boolean;
    firstCost: number;
    secondCost: number | null;
    revenueRequiresTown: boolean;
    revenue: number[];
    locations: ILocation[];
}

// This should be generatable, or compatible with 18xxMaker or something
const MAP : ITerrain[] = [
  {
    biomeName: "Farmland",
    canPlaceResource: false,
    firstCost: 4,
    secondCost: 8,
    revenueRequiresTown: true,
    revenue: [2],
    locations: [{x: 1, y: 1},
                {x: 3, y: 2},
                {x: 3, y: 3},
                {x: 4, y: 2},
                {x: 5, y: 3},
                {x: 6, y: 1},
                {x: 6, y: 2},
                {x: 6, y: 3},
                {x: 6, y: 4},
                {x: 6, y: 5},
                {x: 7, y: 2},
                {x: 7, y: 4},
                {x: 7, y: 5},
                {x: 7, y: 6},
                {x: 8, y: 3},
                {x: 8, y: 4},
                {x: 8, y: 5},
                {x: 8, y: 6},
              ],
  },

  {
    biomeName: "Port",
    canPlaceResource: false,
    firstCost: 6,
    secondCost: 10,
    revenueRequiresTown: false,
    revenue: [0],
    locations: [ {x: 1, y: 4, label: "Port of Strahan"},
                 {x: 4, y: 1, label: "Port of Burnie"},
                 {x: 5, y: 1, label: "Port of Devenport"},
                 {x: 7, y: 8, label: "Port of Hobart"}],
  },

  {
    biomeName: "Forest",
    canPlaceResource: true,
    firstCost: 4,
    secondCost: null,
    revenueRequiresTown: false,
    revenue: [1],
    locations: [{x: 1, y: 2},
                {x: 1, y: 3},
                {x: 2, y: 1},
                {x: 2, y: 3},
                {x: 2, y: 4},
                {x: 2, y: 5},
                {x: 3, y: 7},
                {x: 4, y: 3},
                {x: 4, y: 8},
                {x: 5, y: 4},
                {x: 5, y: 4},
                {x: 6, y: 6},
                {x: 6, y: 7},
                {x: 6, y: 8},
                {x: 8, y: 1},
                {x: 8, y: 2},
                {x: 9, y: 1},
                {x: 9, y: 2},
                {x: 9, y: 3},
                {x: 9, y: 4},
                ],
  },

  {
    biomeName: "Mountain",
    canPlaceResource: true,
    firstCost: 10,
    secondCost: null,
    revenueRequiresTown: false,
    revenue: [2],
    locations: [{x: 2, y: 2},
                {x: 3, y: 4},
                {x: 3, y: 5},
                {x: 3, y: 6},
                {x: 4, y: 4},
                {x: 4, y: 5},
                {x: 4, y: 6},
                {x: 4, y: 7},
                {x: 5, y: 6},
                {x: 5, y: 7},
                {x: 5, y: 8},
                ],
  },

  {
    biomeName: "Town",
    canPlaceResource: false,
    firstCost: 6,
    secondCost: 10,
    revenueRequiresTown: false,
    revenue: [2, 4, 6],
    locations: [{x: 5, y: 2, label: "Devenport"},
                {x: 7, y: 3, label: "Launceston"},
                {x: 7, y: 7, label: "Hobart" }],
  },
];

const STARTING_CASH = 24;

enum actions {
  BuildTrack,
  AuctionShare,
  TakeResources,
  IssueBond,
  Merge,
  PayDividend
}
const ACTION_CUBE_LOCATION_ACTIONS = [actions.BuildTrack, actions.BuildTrack, actions.BuildTrack,
                                      actions.AuctionShare, actions.AuctionShare,
                                      actions.TakeResources, actions.TakeResources, actions.TakeResources,
                                      actions.IssueBond,
                                      actions.Merge,
                                      actions.PayDividend];

export const EmuBayRailwayCompany = {
  setup: (ctx: Ctx):IEmuBayState => {
    return {
        players: [...new Array(ctx.numPlayers)].map(():IPlayer=>({
          cash: Math.ceil(STARTING_CASH / ctx.numPlayers) 
        })),
        companies: [],
        // Starting with take resources spaces filled and pay dividends filled
        actionCubeLocations: [false, false, false, false, false, true, true, true, false, false, true],
        resourceCubes: [],
        track: []
      }
  },

  phases: {
    initalAuction: {
      start: true,
      moves: {
        makeBid: (G: IEmuBayState, ctx: Ctx, amount: number) => {
        },
        pass: (G: IEmuBayState, ctx: Ctx) => {
        },
      },
    },
    normalPlay: {
      turn: {
        stages: {
          removeCube: {
            moves: {
              removeCube: (G: IEmuBayState, ctx: Ctx, space: number) => {
                // Remove a cube to place
              }
            }
          },
          takeAction: {
            moves: {
              buildTrack: (G: IEmuBayState, ctx: Ctx, company: number) => {
              },
              mineResource: (G: IEmuBayState, ctx: Ctx, company: number) => {
              },
              auctionShare: (G: IEmuBayState, ctx: Ctx, company: number) => {
              },
              issueBond: (G: IEmuBayState, ctx: Ctx, company: number) => {
              },
              payDividends: (G: IEmuBayState, ctx: Ctx) => {
              },
            }
          },
          buildingTrack: {
            moves: {
              buildTrack: (G: IEmuBayState, ctx: Ctx, x: number, y: number, narrowGauge: boolean) => {
              },
              done: (G: IEmuBayState, ctx: Ctx) => {
              }
            }
          },
        }
      }
    }
  }
};
