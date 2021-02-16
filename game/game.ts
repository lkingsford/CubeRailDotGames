import { INVALID_MOVE } from 'boardgame.io/core'
import { Ctx } from 'boardgame.io'
import { debug, NormalModuleReplacementPlugin } from 'webpack';
import { Events } from 'boardgame.io/dist/types/src/plugins/events/events';
import { BuildMode } from '../client/board';
import { gameEvent } from 'boardgame.io/dist/types/src/core/action-creators';
import { map } from 'bluebird';

enum CompanyID {
  EB = 0,
  TMLC,
  LW,
  GT,
  MLM,
  NED,
  NMF
}

export interface IBond {
  deferred: boolean;
  baseInterest: number;
  interestDelta: number;
  amount: number;
}

interface IPlayer {
  cash: number;
}

export interface ICoordinates {
  x: number,
  y: number
}

interface ITrackBuilt extends ICoordinates {
  owner?: CompanyID;
  narrow: boolean;
}

export enum CompanyType { Major, Minor };

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
  independentHomesOwned: ICoordinates[];
  companyType: CompanyType;
  open: boolean;
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
  buildsRemaining?: number;
  independentOrder: CompanyID[];
  bonds: IBond[];
  toAct?: CompanyID;
};

export interface ILocation extends ICoordinates {
  label?: string;
}

interface ITerrain {
  // What else could I call it?
  biomeName: string;
  canPlaceResource: boolean;
  firstCost: number;
  secondCost: number | null;
  revenue: (gamestate: IEmuBayState, buildmode: BuildMode) => number;
  textureIndex: number;
  locations: ILocation[];
}

const fixedNarrowRevenue = 3;

function getTileBiome(tile: ICoordinates): ITerrain | undefined {
  return MAP.find((T) => {
    return T.locations.find((xy) => xy.x == tile.x && xy.y == tile.y) != undefined;
  })
}

// This should be generatable, or compatible with 18xxMaker or something
export const MAP: ITerrain[] = [
  {
    biomeName: "Farmland",
    canPlaceResource: false,
    firstCost: 4,
    secondCost: 8,
    revenue: (G: IEmuBayState, B: BuildMode) => {
      if (B == BuildMode.Normal) {
        // Is town present?
        let owned = G.track.filter((i) => i.owner == G.toAct)
        let biomes = owned.map((i) => getTileBiome(i))
        let anyTowns = biomes.find((i) => i?.biomeName == "Town") != undefined;
        return anyTowns ? 2 : 0;
      } else {
        return fixedNarrowRevenue;
      }
    },
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
    revenue: (G: IEmuBayState, B: BuildMode) => {
      if (B == BuildMode.Normal) {
        if (!connectedToPort(G, G.toAct!)) {
          // First connection to port = all resource cubes paying more
          return firstPortConnectionRev(G, G.toAct!);
        }
        else {
          return 0;
        }
      } else {
        if (!connectedToPort(G, G.toAct!)) {
          return firstPortConnectionRev(G, G.toAct!) + fixedNarrowRevenue;
        }
        else {
          return fixedNarrowRevenue;
        }
      }
    },
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
    revenue: (G: IEmuBayState, B: BuildMode) => {
      if (B == BuildMode.Normal) {
        return 1;
      } else {
        return fixedNarrowRevenue;
      }
    },
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
    revenue: (G: IEmuBayState, B: BuildMode) => {
      if (B == BuildMode.Normal) {
        return 2;
      } else {
        return fixedNarrowRevenue;
      }
    },
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
    revenue: (G: IEmuBayState, B: BuildMode) => {
      if (B == BuildMode.Normal) {
        let owned = G.track.filter((i) => i.owner == G.toAct)
        let biomes = owned.map((i) => getTileBiome(i))
        let towns = biomes.filter((i) => i?.biomeName == "Town")
        let townRev = [2, 4, 6][towns.length];

        // If first town, check if any farmland needs to increase
        let extraFarmRevenue = 0;
        if (towns.length == 0) {
          let farmsWithTrack = G.track.filter((i) => i.owner == G.toAct)
            .filter((i) => getTileBiome(i!)?.biomeName == "Farmland")
            .length
          extraFarmRevenue = farmsWithTrack * 2;
        }

        return extraFarmRevenue + townRev;

        // TODO: Change to return depending on amount of towns connected
      } else {
        return fixedNarrowRevenue;
      }
    },
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
  G.auctionFinished = true;
  ctx.events!.setPhase!('normalPlay');
}

// More copy paste than there should be
function auctionCompanyWon(G: IEmuBayState, ctx: Ctx) {
  G.players[G.winningBidder!].cash -= G.currentBid!;
  G.companies[G.companyForAuction!].cash += G.currentBid!;
  G.companies[G.companyForAuction!].sharesHeld.push(G.winningBidder!);
  G.companies[G.companyForAuction!].open = true;
  G.companies[G.companyForAuction!].sharesRemaining -= 1;
  G.auctionFinished = true;
  // Make the next independent available
  if (G.companies[G.companyForAuction!].companyType == CompanyType.Minor) {
    G.independentOrder.splice(0, 1);
  }
  ctx.events!.setPhase!('normalPlay');
  ctx.events!.endTurn!({ next: G.playerAfterAuction });
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

export function resourceCubeCost(G: IEmuBayState): number {
  // Putting here to make easy to change into formula if I wish later
  return 3;
}

export function resourceCubeRevenue(G: IEmuBayState, company: number): number {
  // Maybe this should be in Game too...
  if (connectedToPort(G, company)) {
    return 3;
  } else {
    return 1;
  }
}

function firstPortConnectionRev(G: IEmuBayState, company: number): number {
  return G.companies[company].resourcesHeld * 2;
}

function connectedToPort(G: IEmuBayState, company: number): boolean {
  // Connected if one of the companies tracks, or a narrow gauge
  // connected to company owned station

  // Simple first
  let ports = MAP.find((i) => i.biomeName == "Port")!.locations!;
  let accessibleTrack = companyAccessibleTrack(G, company);
  let coTrackOnPort = ports.find((i) =>
    accessibleTrack.find((t) => t.x == i.x && t.y == i.y) != undefined
  ) != undefined;
  if (coTrackOnPort) {
    return true;
  }

  // Now the annoying narrow gauge one
  return false;
}

function companyAccessibleTrack(G: IEmuBayState, company: number): ICoordinates[] {
  // Returning the companies tracks, and the connected narrowgauge tracks

  // Company
  let coTracks: ICoordinates[] = G.track.filter((t) => t.owner == company && !t.narrow)

  // Annoying narrow
  let connectedNarrow: ICoordinates[] = []
  if (company < 3) {
    connectedNarrow.push(...G.companies[company].independentHomesOwned);
  } else {
    connectedNarrow.push(G.companies[company].home!);
  }
  let toCheck: ICoordinates[] = [];
  toCheck = toCheck.concat(...connectedNarrow.map((i) => getAdjacent(i)));

  let allNarrow = G.track.filter((t) => t.narrow);

  while (toCheck.length > 0) {
    let checking = toCheck.pop()!;
    if (connectedNarrow.find((i) => i.x == checking.x && i.y == checking.y)) {
      // already visited
      break;
    }

    if (allNarrow.find((i) => i.x == checking.x && i.y == checking.y)) {
      // Found - so can connect to others nearby
      connectedNarrow.push(checking);
      toCheck.push(...getAdjacent(checking));

      // Don't think efficiency wise worth looping through AGAIN to check if it's
      // already there. May do maths later if proves an issue.
    }
  }

  return coTracks.concat(connectedNarrow);
}

export interface IBuildableSpace extends ICoordinates {
  cost: number;
  rev: number;
}

export function getAllowedBuildSpaces(G: IEmuBayState, buildmode: BuildMode): IBuildableSpace[] {
  // Get all buildable spaces
  let buildableSpaces: IBuildableSpace[] = [];

  MAP.forEach((biome) => {
    if (!biome.firstCost) {
      // Can't build
      return
    }
    biome.locations.forEach((i) => {
      let tracks = G.track.filter((t) => (i.x == t.x && i.y == t.y));
      let homes = G.companies.map((co, idx) => ({ co: co, idx: idx }))
        .filter((t) => (t.co.home?.x == i.x && t.co.home?.y == i.y));
      let count = tracks.length + homes.length;

      // Check for already containing relevant home/track
      if (buildmode == BuildMode.Normal) {
        if (homes.find((i) => i.idx == G.toAct) || tracks.find((i) => i.owner == G.toAct)) {
          return;
        }
      }
      else {
        // IN FUTURE GAME, THIS MIGHT NEED TO CHECK IF HOME STATION IS PRESENT FOR PRIVATE
        if (tracks.find((i) => i.narrow)) {
          return;
        }
      }

      if (count > 0 && !biome.secondCost) {
        return; // Already full
      }

      let cost = (count == 0) ? biome.firstCost : biome.secondCost;

      if (cost! > G.companies[G.toAct!].cash) {
        return; // Not enough cash
      }

      if (buildmode == BuildMode.Normal && G.companies[G.toAct!].trainsRemaining == 0) { return }
      if (buildmode == BuildMode.Narrow && G.companies[G.toAct!].narrowGaugeRemaining == 0) { return }

      // Check for adjacency
      if (buildmode == BuildMode.Normal) {
        let adjacent = getAdjacent(i);
        if (!adjacent.find((i) => {
          let tracks = G.track.filter((t) => (i.x == t.x && i.y == t.y));
          let homes = G.companies.map((co, idx) => ({ co: co, idx: idx }))
            .filter((t) => (t.co.home?.x == i.x && t.co.home?.y == i.y));
          return tracks.find((i) => i.owner == G.toAct) || homes.find((i) => i.idx == G.toAct);
        })) {
          //  None are adjacent, return
          return;
        }
      }
      else {
        // Need to check not only adjacent to narrow, but also connected to relevant home
        let relevantHomes: ICoordinates[];
        if (G.toAct! > 2) {
          // Independent
          relevantHomes = [G.companies[G.toAct!].home!]
        } else {
          // Must have merged in. Need connection to one of its privates
          relevantHomes = G.companies[G.toAct!].independentHomesOwned!;
        }

        // This should be cached - a fair bit of repetition happening here.
        let visited: ICoordinates[] = []
        let toCheck = getAdjacent((i));
        let connected = false;

        while (!connected && toCheck.length > 0) {
          let checking = toCheck.pop()!;
          if (visited.find((i) => i.x == checking.x && i.y == checking.y)) {
            // already visited
            return
          }

          if (relevantHomes.find((i) => i.x == checking.x && i.y == checking.y)) {
            connected = true;
            break;
          }

          let hasTrack = G.track.find((i) => i.x == checking.x && i.y == checking.y && i.narrow);
          if (!hasTrack) {
            // No track - can't help connect (but could be available)
            continue;
          }

          toCheck.push(...getAdjacent(checking));
        }

        if (!connected) {
          return;
        }
      }

      let revenue = biome.revenue(G, buildmode);

      buildableSpaces.push({ x: i.x, y: i.y, cost: cost!, rev: revenue! });
    })
  })

  return buildableSpaces;
}

export function getTakeResourceSpaces(G: IEmuBayState): ICoordinates[] {
  if (G.companies[G.toAct!].cash < resourceCubeCost(G)) {
    // Doing this here too - can't build if no cash to do it (and simplify board)
    // code in the process
    return [];
  };

  let accessible = companyAccessibleTrack(G, G.toAct!);
  return accessible.filter((t) => G.resourceCubes.find((r) => r.x == t.x && r.y == t.y) != undefined);
}

interface IMergable {
  major: number, minor: number
}

export function getMergableCompanies(G: IEmuBayState, ctx: Ctx): IMergable[] {
  // All major minor combinations
  let possibilities: IMergable[] = []
  for (let maj = 0; maj < G.companies.length; ++maj) {
    if (G.companies[maj].companyType == CompanyType.Major) {
      for (let min = 0; min < G.companies.length; ++min) {
        if (G.companies[min].companyType == CompanyType.Minor &&
          G.companies[min].open) {
          possibilities.push({ major: maj, minor: min });
        }
      }
    }
  }

  // Must own at least one share in one
  possibilities = possibilities.filter((i) => (G.companies[i.major].sharesHeld.find((i) => i == +ctx.currentPlayer) != undefined) ||
    (G.companies[i.minor].sharesHeld.find((i) => i == +ctx.currentPlayer) != undefined))
    // TODO: Limit to companies that have enough shares to merge
    .filter((i) => (G.companies[i.major].sharesRemaining > 0) || G.companies[i.major].reservedSharesRemaining > 0)
    // TODO: Limit to companies that are connected
    .filter((i) => {
      let minor = G.companies[i.minor];
      let coTracks: ICoordinates[] = G.track.filter((t) => t!.owner! == i.major && !t.narrow);
      let narrowTracks: ICoordinates[] = G.track.filter((t) => t.narrow);
      let visited: ICoordinates[] = [];
      let toCheck = [minor.home];
      while (toCheck.length > 0) {
        var Z = toCheck.pop()!;
        if (visited.find((i)=>Z.x == i.x && Z.y == i.y) != undefined)
        {
          // Already visited
          break;
        }
        if (coTracks.find((i)=>Z.x == i.x && Z.y == i.y) != undefined)
        {
          // Connected!
          return true;
        }
        if (narrowTracks.find((i)=>Z.x == i.x && Z.y == i.y) != undefined)
        {
          toCheck.push(...getAdjacent(Z));
        }
      }
      return false;
    })
  return possibilities;
}

export const InitialAuctionOrder = [CompanyID.LW, CompanyID.TMLC, CompanyID.EB, CompanyID.GT]

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
    home: { x: 2, y: 3 },
    independentHomesOwned: [],
    companyType: CompanyType.Major,
    open: true
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
    home: { x: 7, y: 3 },
    independentHomesOwned: [],
    companyType: CompanyType.Major,
    open: true
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
    home: { x: 7, y: 3 },
    independentHomesOwned: [],
    companyType: CompanyType.Major,
    open: true
  },
  {
    // GT
    cash: 10,
    trainsRemaining: 0,
    narrowGaugeRemaining: 2,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, amount: 10, baseInterest: 3, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0,
    independentHomesOwned: [],
    companyType: CompanyType.Minor,
    open: true
  },
  {
    // MLM
    cash: 15,
    trainsRemaining: 0,
    narrowGaugeRemaining: 3,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, amount: 15, baseInterest: 4, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0,
    independentHomesOwned: [],
    companyType: CompanyType.Minor,
    open: false,
  },
  {
    // NED
    cash: 15,
    trainsRemaining: 0,
    narrowGaugeRemaining: 3,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, amount: 15, baseInterest: 6, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0,
    independentHomesOwned: [],
    companyType: CompanyType.Minor,
    open: false,
  },
  {
    // NMF
    cash: 15,
    trainsRemaining: 0,
    narrowGaugeRemaining: 4,
    resourcesHeld: 0,
    currentRevenue: IndependentStartingRevenue,
    bonds: [{ deferred: true, amount: 15, baseInterest: 7, interestDelta: 1 }],
    sharesHeld: [],
    sharesRemaining: 1,
    reservedSharesRemaining: 0,
    independentHomesOwned: [],
    companyType: CompanyType.Minor,
    open: false,
  },
]

const INITIAL_AVAILABLE_BONDS: IBond[] = [
  { deferred: true, amount: 10, baseInterest: 6, interestDelta: 1 },
  { deferred: true, amount: 20, baseInterest: 7, interestDelta: 2 },
  { deferred: true, amount: 20, baseInterest: 8, interestDelta: 2 },
  { deferred: true, amount: 30, baseInterest: 9, interestDelta: 2 },
  { deferred: true, amount: 30, baseInterest: 10, interestDelta: 2 },
]

// Bonds that are randomly given to the 3 companies
const STARTING_BONDS: IBond[] = [
  { deferred: true, amount: 0, baseInterest: 0, interestDelta: 0 },
  { deferred: true, amount: 10, baseInterest: 5, interestDelta: 1 },
  { deferred: true, amount: 15, baseInterest: 5, interestDelta: 2 },
]

const SETUP_CARDS = [
  // C N NE SE S SW NW
  // Cube = 1
  // Station = 2
  [[1, 2], [1, 1], [], [1], [], [], []],
  [[2], [1], [1], [], [], [], []],
  [[2], [], [1, 1], [], [], [1], []],
  [[1, 1, 1, 2], [], [], [], [], [], []],
  [[1], [], [], [], [], [1], []],
  [[1], [1], [], [], [], [], [1]],
  [[1], [1], [], [], [], [], []],
  [[], [], [1], [], [1], [], []]
]

const SETUP_POINTS: ICoordinates[] = [
  { x: 2, y: 2 },
  { x: 3, y: 4 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 4, y: 6 },
  { x: 5, y: 8 },
  { x: 9, y: 1 },
  { x: 9, y: 3 }
]

function getAdjacent(xy: ICoordinates): ICoordinates[] {
  // Get points adjacent to point
  if ((xy.x % 2) == 0) {
    // Even x
    return [{ x: xy.x, y: xy.y - 1 }, { x: xy.x + 1, y: xy.y }, { x: xy.x + 1, y: xy.y + 1 }, { x: xy.x, y: xy.y + 1 }, { x: xy.x - 1, y: xy.y + 1 }, { x: xy.x - 1, y: xy.y }]
  }
  else {
    // Odd x
    return [{ x: xy.x, y: xy.y - 1 }, { x: xy.x + 1, y: xy.y - 1 }, { x: xy.x + 1, y: xy.y }, { x: xy.x, y: xy.y + 1 }, { x: xy.x - 1, y: xy.y }, { x: xy.x - 1, y: xy.y - 1 }];
  }
}

// TODO: Detect when there is a stalemate
export const EmuBayRailwayCompany = {
  setup: (ctx: Ctx): IEmuBayState => {
    let companies = Array.from(CompanyInitialState);
    let bondOrder = ctx.random?.Shuffle(STARTING_BONDS);
    bondOrder?.forEach((i, idx) => {
      companies[idx].bonds.push(i);
      companies[idx].cash = i.amount;
    });
    let track: ITrackBuilt[] = [];
    // Setting up resource cubes and homes
    let homeOrder = ctx.random?.Shuffle([CompanyID.GT, CompanyID.MLM, CompanyID.NED, CompanyID.NMF])!;
    let setupCardOrder = ctx.random?.Shuffle(SETUP_CARDS);
    let resourceCubes: ICoordinates[] = [];
    let resourceToAttemptToPlace: ICoordinates[] = [];
    setupCardOrder?.forEach((setupCard, idx) => {
      let O = SETUP_POINTS[idx];
      let buildPoints = [O].concat(getAdjacent(O));
      setupCard.forEach((space, idx) => {
        let buildCoord = buildPoints[idx];
        space.forEach((resource) => {
          // Station
          if (resource == 1) {
            // Must be on mountain or forest to build resource
            resourceToAttemptToPlace.push(buildCoord);
          };
          if (resource == 2) {
            let co = homeOrder?.pop()!;
            companies[co].home = buildCoord;
          };
        });
      });
    });

    // Build track for each home station
    companies.forEach((co, idx) => {
      track.push({ x: co.home!.x, y: co.home!.y, narrow: idx > 2, owner: idx <= 2 ? idx : undefined });
    });

    MAP.forEach((terrain) => {
      if (!terrain.canPlaceResource) {
        return;
      }
      terrain.locations.forEach((xy) => {
        let toPlace = resourceToAttemptToPlace.filter((i) => i.x == xy.x && i.y == xy.y).length;
        for (let i = 0; i < toPlace; ++i) {
          resourceCubes.push(xy);
        }
      });
    });

    return {
      players: [...new Array(ctx.numPlayers)].map((): IPlayer => ({
        cash: Math.ceil(STARTING_CASH / ctx.numPlayers)
      })),
      companies: companies,
      // Starting with take resources spaces filled and pay dividends filled
      actionCubeLocations: [false, false, false, false, false, true, true, true, false, false, true],
      resourceCubes: resourceCubes,
      // GT Excluded because in initial auction already
      independentOrder: [CompanyID.MLM, CompanyID.NED, CompanyID.NMF],
      track: track,
      bonds: Array.from(INITIAL_AVAILABLE_BONDS),
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
                G.toAct = company;
                G.buildsRemaining = 3;
                G.anyActionsTaken = false;
                ctx.events?.setStage!("buildingTrack");
              },
              mineResource: (G: IEmuBayState, ctx: Ctx, company: number) => {
                if (jiggleCubes(G, actions.TakeResources) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
                G.toAct = company;
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
                if (G.companies[company].companyType == CompanyType.Minor) {
                  if ((G.independentOrder.length == 0) || (company != G.independentOrder[0])) {
                    console.log("Independent not available");
                  }
                }

                G.playerInitialBidder = +ctx.currentPlayer;

                ctx.events?.setPhase!("auction");
              },

              issueBond: (G: IEmuBayState, ctx: Ctx, company: number, bond: number) => {
                if (jiggleCubes(G, actions.IssueBond) == INVALID_MOVE) {
                  return INVALID_MOVE;
                };
                G.companies[company].bonds.push(G.bonds[bond]);
                G.companies[company].cash += G.bonds[bond].amount;
                G.bonds.splice(bond, 1);
                ctx.events?.endTurn!();
              },

              merge: (G: IEmuBayState, ctx: Ctx, major: number, minor: number) => {
                if (getMergableCompanies(G, ctx).find((i) => i.major == major && i.minor == minor) == undefined) {
                  console.log("Merge is invalid")
                  return INVALID_MOVE;
                }

                // Exchange shares
                G.companies[major].sharesHeld.push(G.companies[minor].sharesHeld[0]);
                G.companies[minor].sharesHeld = [];
                if (G.companies[major].reservedSharesRemaining > 0) {
                  G.companies[major].reservedSharesRemaining -= 1;
                } else {
                  G.companies[major].sharesRemaining -= 1;
                  // Special rule for Emu Bay: When any other company is merged in,
                  // EB reserved share becomes regular share
                  G.companies[CompanyID.EB].sharesRemaining += 1;
                  G.companies[CompanyID.EB].reservedSharesRemaining -= 1;
                }

                // Merge stuff in
                G.companies[major].bonds.push(...G.companies[minor].bonds);
                G.companies[major].cash += G.companies[minor].cash;
                G.companies[major].currentRevenue += G.companies[minor].currentRevenue;
                G.companies[major].resourcesHeld += G.companies[minor].resourcesHeld;
                G.companies[major].narrowGaugeRemaining += G.companies[minor].narrowGaugeRemaining;
                G.companies[major].independentHomesOwned.push(G.companies[minor].home!);

                // Close minor
                G.companies[minor].open = false;

                ctx.events?.endTurn!();
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
              buildTrack: (G: IEmuBayState, ctx: Ctx, xy: ICoordinates, buildMode: BuildMode) => {
                // Must have track remaining
                if (buildMode == BuildMode.Normal) {
                  if (G.companies[G.toAct!].trainsRemaining == 0) {
                    return INVALID_MOVE;
                  }
                } else {
                  if (G.companies[G.toAct!].narrowGaugeRemaining == 0) {
                    return INVALID_MOVE;
                  }
                }

                // Must have build remaining
                if (G.buildsRemaining! <= 0) {
                  return INVALID_MOVE;
                }

                // Must be in permitted space
                let allowed = getAllowedBuildSpaces(G, buildMode);
                let thisSpace = allowed.find((i) => i.x == xy.x && i.y == xy.y);
                if (!thisSpace) {
                  return INVALID_MOVE;
                };

                if (G.companies[G.toAct!].cash < thisSpace.cost) {
                  return INVALID_MOVE;
                }
                G.companies[G.toAct!].cash -= thisSpace.cost;
                G.companies[G.toAct!].currentRevenue += thisSpace.rev;

                G.track.push({
                  x: xy.x,
                  y: xy.y,
                  narrow: buildMode == BuildMode.Narrow,
                  owner: buildMode == BuildMode.Normal ? G.toAct! : undefined
                });
                if (buildMode == BuildMode.Normal) {
                  G.companies[G.toAct!].trainsRemaining -= 1;
                }
                else {
                  G.companies[G.toAct!].narrowGaugeRemaining -= 1;
                }
                G.anyActionsTaken = true;
                G.buildsRemaining! -= 1;
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
          },
          takeResources: {
            moves: {
              takeResource: (G: IEmuBayState, ctx: Ctx, xy: ICoordinates) => {
                if (!getTakeResourceSpaces(G).find((i) => i.x == xy.x && i.y == xy.y)) {
                  console.log("Can't take from location");
                  return INVALID_MOVE;
                }
                // Remove resource cube from space
                G.resourceCubes.splice(
                  G.resourceCubes.findIndex((i) => i.x == xy.x && i.y == xy.y), 1
                )

                // Pay to remove resource cube
                let co = G.companies[G.toAct!];
                co.cash -= resourceCubeCost(G);

                // Increase revenue
                co.currentRevenue += resourceCubeRevenue(G, G.toAct!);

                co.resourcesHeld += 1;

                G.anyActionsTaken = true;
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
          first: (G: IEmuBayState, ctx: Ctx) => G.playerInitialBidder!,
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
