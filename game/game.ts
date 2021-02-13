import { INVALID_MOVE } from 'boardgame.io/core'
import { Ctx } from 'boardgame.io'
import { debug } from 'webpack';
import { Events } from 'boardgame.io/dist/types/src/plugins/events/events';

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

interface ICompany {
  cash: number;
  trainsRemaining: number;
  narrowGaugeRemaining: number;
  resourcesHeld: number;
  currentRevenue: number;
  bonds: IBond[];
  sharesHeld: number[];
  sharesRemaining: number;
  reservedSharesRemaining: number;
  home?: ICoordinates;
}

export interface IEmuBayState {
  players: IPlayer[];
  companies: ICompany[];
  actionCubeLocations: boolean[];
  actionCubeTakenFrom?: actions | null;
  resourceCubes: ICoordinates[];
  track: ITrackBuilt[];
  currentBid?: number;
  winningBidder?: number;
  companyForAuction?: CompanyID;
  passed?: boolean[];
  playerAfterAuction?: number;
  playerInitialBidder?: number;
  auctionFinished?: boolean;
  anyActionsTaken?: boolean;
  independentAvailable?: CompanyID | null;
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
  textureIndex: number;
  locations: ILocation[];
}

// This should be generatable, or compatible with 18xxMaker or something
export const MAP: ITerrain[] = [
  {
    biomeName: "Farmland",
    canPlaceResource: false,
    firstCost: 4,
    secondCost: 8,
    revenueRequiresTown: true,
    revenue: [2],
    textureIndex: 0,
    locations: [{ x: 1, y: 1 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 4, y: 2 },
    { x: 5, y: 3 },
    { x: 6, y: 1 },
    { x: 6, y: 2 },
    { x: 6, y: 3 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 7, y: 2 },
    { x: 7, y: 4 },
    { x: 7, y: 5 },
    { x: 7, y: 6 },
    { x: 8, y: 3 },
    { x: 8, y: 4 },
    { x: 8, y: 5 },
    { x: 8, y: 6 },
    ],
  },

  {
    biomeName: "Port",
    canPlaceResource: false,
    firstCost: 6,
    secondCost: 10,
    revenueRequiresTown: false,
    revenue: [0],
    textureIndex: 3,
    locations: [{ x: 1, y: 4, label: "Port of Strahan" },
    { x: 4, y: 1, label: "Port of Burnie" },
    { x: 5, y: 1, label: "Port of Devenport" },
    { x: 7, y: 8, label: "Port of Hobart" }],
  },

  {
    biomeName: "Forest",
    canPlaceResource: true,
    firstCost: 4,
    secondCost: null,
    revenueRequiresTown: false,
    revenue: [1],
    textureIndex: 1,
    locations: [{ x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 1 },
    { x: 2, y: 3 },
    { x: 2, y: 4 },
    { x: 2, y: 5 },
    { x: 3, y: 7 },
    { x: 4, y: 3 },
    { x: 4, y: 8 },
    { x: 5, y: 4 },
    { x: 5, y: 5 },
    { x: 6, y: 6 },
    { x: 6, y: 7 },
    { x: 6, y: 8 },
    { x: 8, y: 1 },
    { x: 8, y: 2 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
    { x: 9, y: 3 },
    { x: 9, y: 4 },
    ],
  },

  {
    biomeName: "Mountain",
    canPlaceResource: true,
    firstCost: 10,
    secondCost: null,
    revenueRequiresTown: false,
    revenue: [2],
    textureIndex: 4,
    locations: [{ x: 2, y: 2 },
    { x: 3, y: 4 },
    { x: 3, y: 5 },
    { x: 3, y: 6 },
    { x: 4, y: 4 },
    { x: 4, y: 5 },
    { x: 4, y: 6 },
    { x: 4, y: 7 },
    { x: 5, y: 6 },
    { x: 5, y: 7 },
    { x: 5, y: 8 },
    ],
  },

  {
    biomeName: "Town",
    canPlaceResource: false,
    firstCost: 6,
    secondCost: 10,
    revenueRequiresTown: false,
    revenue: [2, 4, 6],
    textureIndex: 2,
    locations: [{ x: 5, y: 2, label: "Devenport" },
    { x: 7, y: 3, label: "Launceston" },
    { x: 7, y: 7, label: "Hobart" }],
  },
];

const STARTING_CASH = 24;

export enum actions {
  BuildTrack,
  AuctionShare,
  TakeResources,
  IssueBond,
  Merge,
  PayDividend
}

export const ACTION_CUBE_LOCATION_ACTIONS = [actions.BuildTrack, actions.BuildTrack, actions.BuildTrack,
actions.AuctionShare, actions.AuctionShare,
actions.TakeResources, actions.TakeResources, actions.TakeResources,
actions.IssueBond,
actions.Merge,
actions.PayDividend];

export function getMinimumBid(G: IEmuBayState) {
  var sharesHeldCount = G.companies[G.companyForAuction!].sharesHeld.length + 1;
  return Math.max(1, Math.ceil(G.companies[G.companyForAuction!].currentRevenue / sharesHeldCount));
}

function initialAuctionCompanyWon(G: IEmuBayState, ctx: Ctx) {
  G.players[G.winningBidder!].cash -= G.currentBid!;
  G.companies[G.companyForAuction!].cash += G.currentBid!;
  G.companies[G.companyForAuction!].sharesHeld.push(G.winningBidder!);
  G.companies[G.companyForAuction!].sharesRemaining -= 1;

  var auctionNumber = InitialAuctionOrder.indexOf(G.companyForAuction!);
  if ((auctionNumber + 1) < InitialAuctionOrder.length) {
    G.companyForAuction = InitialAuctionOrder[auctionNumber + 1];
    G.currentBid = 0;
    G.passed = new Array(ctx.numPlayers).fill(false);
    ctx.events!.endTurn!({ next: G.winningBidder });
    return;
  }
  G.playerAfterAuction = G.companies[CompanyID.GT].sharesHeld[0];
  setNextIndependent(G);
  G.auctionFinished = true;
  ctx.events!.setPhase!('normalPlay');
}

// More copy paste than there should be
function auctionCompanyWon(G: IEmuBayState, ctx: Ctx) {
  G.players[G.winningBidder!].cash -= G.currentBid!;
  G.companies[G.companyForAuction!].cash += G.currentBid!;
  G.companies[G.companyForAuction!].sharesHeld.push(G.winningBidder!);
  G.auctionFinished = true;
  // Make the next independent available
  setNextIndependent(G);
  ctx.events!.setPhase!('normalPlay');
  ctx.events!.endTurn!({ next: G.playerAfterAuction });
}

function setNextIndependent(G: IEmuBayState) {
  var notSold = IndependentOrder.filter((i) => G.companies[i].sharesHeld.length == 0);
  if (notSold.length == 0) {
    G.independentAvailable = null;
  } else {
    G.independentAvailable = notSold[0];
  }
}

function jiggleCubes(G: IEmuBayState, actionToTake: actions): string | void {
  if (G.actionCubeTakenFrom == actionToTake) {
    console.log("Must take different action to removed action cube")
    return INVALID_MOVE;
  }
  var availableSpaces = ACTION_CUBE_LOCATION_ACTIONS.map((v, i) => ({ value: v, idx: i }))
    .filter(v => v.value == actionToTake)
    .filter(v => G.actionCubeLocations[v.idx] == false);
  if (availableSpaces.length == 0) {
    console.log("No action spaces available");
    return INVALID_MOVE;
  }
  G.actionCubeLocations[availableSpaces[0].idx] = true
}

export const InitialAuctionOrder = [CompanyID.LW, CompanyID.TMLC, CompanyID.EB, CompanyID.GT]
export const IndependentOrder = [CompanyID.GT, CompanyID.MLM, CompanyID.NED, CompanyID.NMF];

const IndependentStartingRevenue = 3;

export const CompanyInitialState: ICompany[] = [
  {
    // EB
    cash: 0,
    trainsRemaining: 4,
    narrowGaugeRemaining: 0,
    resourcesHeld: 0,
    currentRevenue: 1,
    bonds: [],
    sharesHeld: [],
    sharesRemaining: 2,
    reservedSharesRemaining: 4,
    home: { x: 2, y: 3 }
  },
  {
    // TMLC
    cash: 0,
    trainsRemaining: 8,
    narrowGaugeRemaining: 0,
    resourcesHeld: 0,
    currentRevenue: 2,
    bonds: [],
    sharesHeld: [],
    sharesRemaining: 4,
    reservedSharesRemaining: 0,
    home: { x: 7, y: 3 }
  },
  {
    // LW
    cash: 0,
    trainsRemaining: 7,
    narrowGaugeRemaining: 0,
    resourcesHeld: 0,
    currentRevenue: 2,
    bonds: [],
    sharesHeld: [],
    sharesRemaining: 3,
    reservedSharesRemaining: 0,
    home: { x: 7, y: 3 }
  },
  {
    // GT
    cash: 10,
    trainsRemaining: 0,
    narrowGaugeRemaining: 2,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, baseInterest: 3, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0
  },
  {
    // MLM
    cash: 15,
    trainsRemaining: 0,
    narrowGaugeRemaining: 3,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, baseInterest: 4, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0
  },
  {
    // NED
    cash: 15,
    trainsRemaining: 0,
    narrowGaugeRemaining: 3,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, baseInterest: 6, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0
  },
  {
    // NMF
    cash: 15,
    trainsRemaining: 0,
    narrowGaugeRemaining: 4,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, baseInterest: 7, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0
  },
]

// TODO: Detect when there is a stalemate
export const EmuBayRailwayCompany = {
  setup: (ctx: Ctx): IEmuBayState => {
    return {
      players: [...new Array(ctx.numPlayers)].map((): IPlayer => ({
        cash: Math.ceil(STARTING_CASH / ctx.numPlayers)
      })),
      companies: Array.from(CompanyInitialState),
      // Starting with take resources spaces filled and pay dividends filled
      actionCubeLocations: [false, false, false, false, false, true, true, true, false, false, true],
      resourceCubes: [],
      track: []
    }
  },

  phases: {
    initialAuction: {
      start: true,
      onBegin: (G: IEmuBayState, ctx: Ctx) => {
        G.companyForAuction = CompanyID.LW;
        G.passed = new Array(ctx.numPlayers).fill(false);
        G.currentBid = 0;
        G.winningBidder = 0;
        G.auctionFinished = false;
      },
      turn: {
        moveLimit: 1,
        order: {
          first: (G: IEmuBayState, ctx: Ctx) => 0,
          next: (G: IEmuBayState, ctx: Ctx) => {
            var biddersRemaining = G.passed!.reduce<number>((last: number, current: boolean): number => last - (current ? 1 : 0), ctx.numPlayers);
            if (!G.auctionFinished) {
              let nextPlayerPos = (ctx.playOrderPos + 1) % ctx.numPlayers;
              while (G.passed![+ctx.playOrder[nextPlayerPos]]) {
                console.log("next player pos", nextPlayerPos);
                nextPlayerPos = (nextPlayerPos + 1) % ctx.numPlayers;
                console.log("after next player pos", nextPlayerPos);
              }
              return nextPlayerPos;
            }
            else {
              // For some reason, boardgame.io still runs this after phase change - 
              // so go to the sensible thing that it will need next
              return ctx.playOrder.indexOf(G.playerAfterAuction!.toString());
            }
          }
        }
      },
      moves: {
        makeBid: (G: IEmuBayState, ctx: Ctx, amount: number) => {
          if (amount >= getMinimumBid(G) && amount > G.currentBid!) {
            G.winningBidder = +ctx.currentPlayer;
            G.currentBid = amount;
            var biddersRemaining = G.passed!.reduce<number>((last: number, current: boolean): number => last - (current ? 1 : 0), ctx.numPlayers);
            if (biddersRemaining == 1) {
              initialAuctionCompanyWon(G, ctx);
            }
          }
          else {
            return INVALID_MOVE;
          }
        },
        pass: (G: IEmuBayState, ctx: Ctx) => {
          G.passed![+ctx.currentPlayer] = true;
          var biddersRemaining = G.passed!.reduce<number>((last: number, current: boolean): number => last - (current ? 1 : 0), ctx.numPlayers);
          if (biddersRemaining <= 1) {
            if (G.currentBid != 0 || biddersRemaining == 0) {
              // All other players passed and bid made, or all players passed
              initialAuctionCompanyWon(G, ctx);
            }
          }
        },
      },
    },
    normalPlay: {
      turn: {
        order: {
          first: (G: IEmuBayState, ctx: Ctx) => {
            var first = ctx.playOrder.indexOf(G.playerAfterAuction!.toString())
            return first;
          },
          next: (G: IEmuBayState, ctx: Ctx) => (ctx.playOrderPos + 1) % ctx.numPlayers
        },
        onBegin: (G: IEmuBayState, ctx: Ctx) => {
          ctx.events!.setStage!("removeCube");
          // Had to do this, as active player was regularly wrong
          ctx.events?.setActivePlayers!({
            currentPlayer: { stage: "removeCube", moveLimit: 1 }
          });
          G.anyActionsTaken = false;
        },
        stages: {
          removeCube: {
            moves: {
              removeCube: (G: IEmuBayState, ctx: Ctx, action: actions) => {
                let filledSpaces =
                  ACTION_CUBE_LOCATION_ACTIONS.map((v, i) => ({ value: v, idx: i }))
                    .filter(v => v.value == action)
                    .filter(v => G.actionCubeLocations[v.idx] == true);
                  let filledSpaceCount = filledSpaces.length;
                if (filledSpaceCount == 0) {
                  console.log("No cube to remove")
                  return INVALID_MOVE;
                }
                // Remove a cube to place
                G.actionCubeTakenFrom = action;
                G.actionCubeLocations[filledSpaces[0].idx] = false;
                ctx.events?.setStage!("takeAction");
              },
            },
            turn: {
              moveLimit: 1
            },
          },
          takeAction: {
            moves: {
              buildTrack: (G: IEmuBayState, ctx: Ctx, company: number) => {
                if (jiggleCubes(G, actions.BuildTrack) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
                ctx.events?.setStage!("buildingTrack");
              },
              mineResource: (G: IEmuBayState, ctx: Ctx, company: number) => {
                if (jiggleCubes(G, actions.TakeResources) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
                ctx.events?.setStage!("takeResources");
              },
              auctionShare: (G: IEmuBayState, ctx: Ctx, company: number) => {
                if (jiggleCubes(G, actions.AuctionShare) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
                G.playerAfterAuction = (ctx.playOrderPos + 1) % ctx.numPlayers;
                G.companyForAuction = company;
                if (G.players[+ctx.currentPlayer].cash < getMinimumBid(G)) {
                  console.log("Player must be able to pay minimum bid");
                  return INVALID_MOVE;
                }
                if (G.companies[company].sharesRemaining <= 0) {
                  console.log("No shares remaining");
                  return INVALID_MOVE;
                }
                // Check that it's the next independent available if it's independent
                if ([CompanyID.GT, CompanyID.MLM, CompanyID.NED, CompanyID.NMF].includes(company)) {
                  if (company != G.independentAvailable) {
                    console.log("Independent not available");
                  }
                }

                G.playerInitialBidder = +ctx.currentPlayer;

                ctx.events?.setPhase!("auction");
              },
              issueBond: (G: IEmuBayState, ctx: Ctx, company: number) => {
                if (jiggleCubes(G, actions.IssueBond) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
              },
              payDividends: (G: IEmuBayState, ctx: Ctx) => {
                if (jiggleCubes(G, actions.PayDividend) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
                ctx.events?.endTurn!();
              },
            },
            turn: {
              moveLimit: 1
            }
          },
          buildingTrack: {
            moves: {
              buildTrack: (G: IEmuBayState, ctx: Ctx, x: number, y: number, narrowGauge: boolean) => {
              },
              doneBuilding: (G: IEmuBayState, ctx: Ctx) => {
                if (!G.anyActionsTaken) {
                  console.log("No track built - can't pass");
                  return INVALID_MOVE;
                }
                ctx.events?.endTurn!();
              }
            },
            turn: {
              moveLimit: 3
            },
            next: "takeAction"
          },
          takeResources: {
            moves: {
              takeResource: (G: IEmuBayState, ctx: Ctx, x: number, y: number) => {
              },
              doneTaking: (G: IEmuBayState, ctx: Ctx) => {
                if (!G.anyActionsTaken) {
                  console.log("No resources taken - can't pass");
                  return INVALID_MOVE;
                }
                ctx.events?.endTurn!();
              }
            },
            turn: {
              moveLimit: 3
            },
            next: "takeAction"
          },
        }
      }
    },
    "auction": {
      // There is more copy paste here than there should be
      onBegin: (G: IEmuBayState, ctx: Ctx) => {
        G.passed = new Array(ctx.numPlayers).fill(false);
        G.currentBid = 0;
        G.winningBidder = 0;
        G.auctionFinished = false;
      },
      turn: {
        moveLimit: 1,
        order: {
          first: (G: IEmuBayState, ctx: Ctx) => 0,
          next: (G: IEmuBayState, ctx: Ctx) => {
            if (!G.auctionFinished) {
              var nextPlayerPos = (ctx.playOrderPos + 1) % ctx.numPlayers;
              while (G.passed![+ctx.playOrder[nextPlayerPos]]) {
                nextPlayerPos = (ctx.playOrderPos + 1) % ctx.numPlayers;
              }
              return nextPlayerPos;
            }
            else {
              // For some reason, boardgame.io still runs this after phase change - 
              // so go to the sensible thing that it will need next
              return ctx.playOrder.indexOf(G.playerAfterAuction!.toString());
            }
          }
        }
      },
      moves: {
        makeBid: (G: IEmuBayState, ctx: Ctx, amount: number) => {
          if (amount >= getMinimumBid(G) && amount > G.currentBid!) {
            G.winningBidder = +ctx.currentPlayer;
            G.currentBid = amount;
            var biddersRemaining = G.passed!.reduce<number>((last: number, current: boolean): number => last - (current ? 1 : 0), ctx.numPlayers);
            if (biddersRemaining == 1) {
              auctionCompanyWon(G, ctx);
            }
          }
          else {
            return INVALID_MOVE;
          }
        },
        pass: (G: IEmuBayState, ctx: Ctx) => {
          if (G.currentBid == 0 && +ctx.currentPlayer == G.playerInitialBidder) {
            // First player must bid
            return INVALID_MOVE;
          }
          G.passed![+ctx.currentPlayer] = true;
          var biddersRemaining = G.passed!.reduce<number>((last: number, current: boolean): number => last - (current ? 1 : 0), ctx.numPlayers);
          if (biddersRemaining <= 1) {
            auctionCompanyWon(G, ctx);
          }
        },
      },
    },
  }
};
