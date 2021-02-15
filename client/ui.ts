import { Ctx } from "boardgame.io";
import { Client } from "boardgame.io/dist/types/packages/client";
import { getMinimumBid, IEmuBayState, actions, ACTION_CUBE_LOCATION_ACTIONS, IBond, ICoordinates } from "../game/game";
import { BuildMode, Board } from "../client/board";

const muuri = require("muuri/dist/muuri")
var grid = new muuri("#maingrid", { dragEnabled: true, layout: {} });

const COMPANY_ABBREV = ["EBR", "TMLC", "LW", "GT", "MLM", "NED", "NMF"]
const COMPANY_NAME = ["Emu Bay Railway Co.", "Tasmanian Main Line Railroad",
    "Launceston & Western", "Grubb's Tramway", "Mount Lyell Mining and Railway Co.",
    "North East Dundas Tramway", "North Mount Farrell"];
const ACTIONS = ["Build track", "Auction Share", "Take Resource", "Issue Bond", "Merge Private", "Pay Dividend"];

export class Ui {
    private buildMode: BuildMode = BuildMode.Normal;
    public update(gamestate: IEmuBayState, ctx: Ctx, client: any, board: Board): void {
        // Reset this on update, will set correctly during update
        board.tileClickedOn = undefined;

        // Action selector
        {
            let outerDiv = document.querySelector(`#actions`);
            let contentDiv = document.querySelector(`#actions .card .content`);
            let cardDiv = document.querySelector(`#actions .card`)
            if (!outerDiv) {
                outerDiv = document.createElement("div");
                outerDiv.id = `actions`;
                document.querySelector("#maingrid")?.appendChild(outerDiv);
                outerDiv.classList.add("item");

                cardDiv = document.createElement("div");
                outerDiv.appendChild(cardDiv);
                cardDiv.classList.add("card");

                let h = document.createElement("h1");
                h.innerText = `actions`
                cardDiv.appendChild(h);

                contentDiv = document.createElement("div");
                cardDiv.appendChild(contentDiv);
                contentDiv.classList.add("content")

                grid.add(outerDiv);
            }

            contentDiv!.innerHTML = '';
            let statusDiv = document.createElement("div");
            statusDiv.classList.add("actionStatus");
            contentDiv?.appendChild(statusDiv);

            let actionsDiv = document.createElement("div")
            actionsDiv.classList.add("actioncontainer");
            contentDiv?.appendChild(actionsDiv);

            let stage = "nostage";
            if (ctx.activePlayers) {
                stage = ctx.activePlayers![+ctx.currentPlayer];
            }

            switch (stage) {
                case "takeAction":
                    statusDiv.innerText = "Choose an action"
                    break;
                case "removeCube":
                    statusDiv.innerText = "Remove a cube"
                    break;
            }

            ACTIONS.forEach((actionName, idx) => {
                let actionDiv = document.createElement("div");
                actionDiv.innerText = actionName;
                actionDiv.classList.add("actionbox");

                let availableSpaceCount =
                    ACTION_CUBE_LOCATION_ACTIONS.map((v, i) => ({ value: v, idx: i }))
                        .filter(v => v.value == idx)
                        .filter(v => gamestate.actionCubeLocations[v.idx] == false)
                        .length;

                let filledSpaceCount =
                    ACTION_CUBE_LOCATION_ACTIONS.map((v, i) => ({ value: v, idx: i }))
                        .filter(v => v.value == idx)
                        .filter(v => gamestate.actionCubeLocations[v.idx] == true)
                        .length;

                let spacesP = document.createElement("p");
                spacesP.classList.add("actioncubes")
                spacesP.innerText = "□".repeat(availableSpaceCount) + "■".repeat(filledSpaceCount);
                actionDiv?.appendChild(spacesP);

                actionDiv!.dataset.actionid = idx.toString();
                actionDiv!.onclick = (ev) => {
                    if (!(ev.currentTarget as HTMLElement).classList.contains("chooseableaction")) { return; }
                    if (stage == "removeCube") {
                        client.moves.removeCube(+(ev.currentTarget as HTMLDivElement)!.dataset!.actionid!)
                    }

                    if (stage == "takeAction") {
                        switch (+(ev.currentTarget as HTMLDivElement)!.dataset!.actionid!) {
                            case actions.AuctionShare:
                                this.clearActionExtras();
                                contentDiv?.appendChild(this.auctionShareExtra(gamestate, ctx, client));
                                break;
                            case actions.BuildTrack:
                                this.clearActionExtras();
                                contentDiv?.appendChild(this.buildTrackExtra(gamestate, ctx, client));
                                break;
                            case actions.IssueBond:
                                this.clearActionExtras();
                                contentDiv?.appendChild(this.issueBondExtra(gamestate, ctx, client));
                                break;
                            case actions.Merge:
                                this.clearActionExtras();
                                break;
                            case actions.TakeResources:
                                this.clearActionExtras();
                                contentDiv?.appendChild(this.takeResourcesExtra(gamestate, ctx, client));
                                break;
                            case actions.PayDividend:
                                this.clearActionExtras();
                                client.moves.payDividends();
                        }
                    }

                    grid.refreshItems();
                    grid.layout();
                }

                if (stage == "removeCube") {
                    if (filledSpaceCount > 0) {
                        actionDiv.classList.add("chooseableaction")
                    }
                }

                if (stage == "takeAction") {
                    if (availableSpaceCount > 0 && idx != gamestate.actionCubeTakenFrom) {
                        actionDiv.classList.add("chooseableaction")
                    }
                }
                actionsDiv?.appendChild(actionDiv);
            });

            {
                let undoDiv = document.createElement("div");
                undoDiv.innerText = "Undo";
                undoDiv.classList.add("actionbox");
                if (ctx?.numMoves ?? 0 > 0) {
                    undoDiv.classList.add("chooseableaction");
                    undoDiv.onclick = (ev) => {
                        client.undo()
                    };
                }
                actionsDiv?.appendChild(undoDiv);
            }

            if (stage == "buildingTrack") {
                board.tileClickedOn = (xy) => {
                    client.moves.buildTrack(xy, this.buildMode);
                }
                contentDiv?.append(this.buildTrackStage(gamestate, ctx, client, board));
            }

            if (stage == "takeResources") {
                board.tileClickedOn = (xy) => {
                    client.moves.takeResource(xy);
                }
                contentDiv?.append(this.takeResourcesStage(gamestate, ctx, client));
            }

            let phase = ctx.phase;
            if (phase == "auction" || phase == "initialAuction") {
                let auctionH1 = document.createElement("h1");
                auctionH1.innerText = "Auction"
                contentDiv?.append(auctionH1);

                let auctionH2 = document.createElement("h2");
                auctionH2.innerText = `Auctioning ${COMPANY_NAME[gamestate.companyForAuction!]}`;
                auctionH2.classList.add(COMPANY_ABBREV[gamestate.companyForAuction!]);
                contentDiv?.append(auctionH2);

                let playerCash = gamestate.players[+ctx.currentPlayer].cash;

                let playerH2 = document.createElement("h2");
                playerH2.innerText = `Player ${ctx.currentPlayer} (₤${playerCash})`;
                contentDiv?.append(playerH2);

                let statusP = document.createElement("p");
                let statusText = "";
                if (gamestate.currentBid == 0) {
                    statusText = "No bids"
                }
                else {
                    statusText = `Player ${gamestate.winningBidder} winning on ₤${gamestate.currentBid}`;
                }

                statusP.innerText = statusText;

                // Can only pass during initial auction, or if you're not required to make initial bid
                if (phase == "initialAuction" || (phase == "auction" && gamestate.currentBid! > 0)) {
                    let passP = document.createElement("p");
                    passP.innerText = "Pass";
                    passP.classList.add("chooseableaction");
                    passP.onclick = (pass_ev) => { client.moves.pass(); };
                    contentDiv?.appendChild(passP);
                }

                let minBid = Math.max(getMinimumBid(gamestate), gamestate.currentBid! + 1);
                if (playerCash >= minBid) {
                    let bidsP = document.createElement("p");
                    bidsP.innerText = "Bid: ";
                    for (let bid = minBid; bid <= playerCash; ++bid) {
                        let bidS = document.createElement("span");
                        bidS.innerText = bid.toString();
                        bidS.classList.add("chooseableaction");
                        bidS.classList.add("bid");
                        bidS.dataset.bid = bid.toString();
                        bidS.onclick = (bidS_ev) => {
                            client.moves.makeBid(+((bidS_ev.currentTarget as HTMLElement)!.dataset.bid!));
                        }
                        bidsP.appendChild(bidS);
                    }
                    contentDiv?.appendChild(bidsP);
                }

                contentDiv?.append(statusP);
            }
        }

        // Player states
        gamestate.players.forEach((player, idx) => {
            let outerDiv = document.querySelector(`#player${idx}`);
            let contentDiv = document.querySelector(`#player${idx} .card .content`);
            let cardDiv = document.querySelector(`#player${idx} .card`)
            if (!outerDiv) {
                outerDiv = document.createElement("div");
                outerDiv.id = `player${idx}`;
                document.querySelector("#maingrid")?.appendChild(outerDiv);
                outerDiv.classList.add("item");

                cardDiv = document.createElement("div");
                outerDiv.appendChild(cardDiv);
                cardDiv.classList.add("card");

                let playerName = document.createElement("h1");
                playerName.innerText = `Player ${idx}`
                cardDiv.appendChild(playerName);

                contentDiv = document.createElement("div");
                cardDiv.appendChild(contentDiv);
                contentDiv.classList.add("content")

                grid.add(outerDiv);
            }

            if (idx == +ctx.currentPlayer) {
                cardDiv?.classList.add("currentplayer");
            } else {
                cardDiv?.classList.remove("currentplayer");
            }

            // So, we do the item thing, but these are just going to delete and replace
            // items
            contentDiv!.innerHTML = '';

            let cashP = document.createElement("p");
            cashP.innerText = `Cash ₤${player.cash}`;
            cashP.classList.add("cash");
            contentDiv?.appendChild(cashP);

            gamestate.companies.forEach((co, coidx) => {
                var held = co.sharesHeld.filter((holder) => holder == idx).length;
                if (held == 0) {
                    return
                };
                var shareText: string;
                if (held == 1) {
                    shareText = COMPANY_ABBREV[coidx];
                } else {
                    shareText = `${held} × ${COMPANY_ABBREV[coidx]}`;
                };

                let shareP = document.createElement("p");
                shareP.innerText = shareText;
                shareP.classList.add(`${COMPANY_ABBREV[coidx]}`);
                contentDiv?.appendChild(shareP);
            });
        });

        gamestate.companies.forEach((co, idx) => {
            let outerDiv = document.querySelector(`#company${idx}`);
            let contentDiv = document.querySelector(`#company${idx} .card .content`);
            let cardDiv = document.querySelector(`#company${idx} .card`)
            if (!outerDiv) {
                outerDiv = document.createElement("div");
                outerDiv.id = `company${idx}`;
                outerDiv.classList.add("companyCard");
                document.querySelector("#maingrid")?.appendChild(outerDiv);
                outerDiv.classList.add("item");

                cardDiv = document.createElement("div");
                outerDiv.appendChild(cardDiv);
                cardDiv.classList.add("card");

                let coName = document.createElement("h1");
                coName.innerText = `${COMPANY_NAME[idx]}`;
                coName.classList.add(`${COMPANY_ABBREV[idx]}`);
                cardDiv.appendChild(coName);

                contentDiv = document.createElement("div");
                cardDiv.appendChild(contentDiv);
                contentDiv.classList.add("content")

                grid.add(outerDiv);
            }

            contentDiv!.innerHTML = '';
            let cashP = document.createElement("p");
            cashP.innerText = `Cash ₤${co.cash}`;
            cashP.classList.add("cash");
            contentDiv?.appendChild(cashP);

            let revP = document.createElement("p");
            revP.innerText = `Rev ${co.currentRevenue < 0 ? '-' : ''}₤${co.currentRevenue}`;
            revP.classList.add("cash");
            contentDiv?.appendChild(revP);

            if (co.sharesHeld.length != 0) {
                let revsplitP = document.createElement("p");
                revsplitP.innerText += ` (${co.currentRevenue < 0 ? '-' : ''}₤${co.currentRevenue > 0 ? Math.ceil(co.currentRevenue / co.sharesHeld.length) : Math.floor(co.currentRevenue / co.sharesHeld.length)} / share)`;
                contentDiv?.appendChild(revsplitP);
            }

            let sharesRemainingText = co.sharesRemaining > 0 ? `${co.sharesRemaining} shares remaining` : "No shares remaining";
            let srP = document.createElement("p");
            srP.innerText = sharesRemainingText;
            contentDiv?.appendChild(srP);

            if (co.reservedSharesRemaining > 0) {
                let rsrP = document.createElement("p")
                rsrP.innerText = `${co.reservedSharesRemaining} reserved shares remaining`;
                contentDiv?.append(rsrP);
            }

            if (co.bonds.length > 0) {
                let bondsP = document.createElement("p")
                bondsP.innerText = `Bonds issued: `;
                contentDiv?.append(bondsP);

                co.bonds.forEach((i) => {
                    let bondP = document.createElement("p")
                    bondP.innerText = this.bondToString(i);
                    contentDiv?.append(bondP);
                })
            }

            if (co.trainsRemaining > 0) {
                let trainsP = document.createElement("p")
                trainsP.innerText = `${co.trainsRemaining} track remaining`;
                contentDiv?.append(trainsP);
            }

            if (co.narrowGaugeRemaining > 0) {
                let narrowP = document.createElement("p")
                narrowP.innerText = `${co.narrowGaugeRemaining} narrow gauge track remaining`;
                contentDiv?.append(narrowP);
            }
        });

        // Bonds
        {
            let outerDiv = document.querySelector(`#bonds`);
            let contentDiv = document.querySelector(`#bonds .card .content`);
            let cardDiv = document.querySelector(`#bonds .card`)
            if (!outerDiv) {
                outerDiv = document.createElement("div");
                outerDiv.id = `bonds`;
                document.querySelector("#maingrid")?.appendChild(outerDiv);
                outerDiv.classList.add("item");

                cardDiv = document.createElement("div");
                outerDiv.appendChild(cardDiv);
                cardDiv.classList.add("card");

                let h = document.createElement("h1");
                h.innerText = `Bonds Remaining`
                cardDiv.appendChild(h);

                contentDiv = document.createElement("div");
                cardDiv.appendChild(contentDiv);
                contentDiv.classList.add("content")

                grid.add(outerDiv);
            };

            contentDiv!.innerHTML = "";

            gamestate.bonds.forEach((i) => {
                let bondP = document.createElement("p");
                bondP.innerText = this.bondToString(i, false);
                contentDiv?.appendChild(bondP);
            });
        };

        // Map always at bottom
        grid.move(document.querySelector("#boarditem"), -1);

        // Size may have changed - rearrange them
        grid.refreshItems();
        grid.layout();
    }

    // Clear the additional 'extra data' selector things from actions
    private clearActionExtras() {
        document.querySelectorAll(`#actions .card .content .actionextra`)?.forEach((i) => i.remove());
    }

    private auctionShareExtra(gamestate: IEmuBayState, ctx: Ctx, client: any): HTMLElement {
        let auctionExtraDiv = document.createElement("div");
        auctionExtraDiv.classList.add("actionextra");

        let toList = gamestate.companies.map((v, i) => ({ value: v, idx: i }))
            .filter((c) => {
                // If a public company, or private but next, and share available - list
                if (c.value.sharesRemaining == 0) { return false; }
                if (c.idx > 3 && c.idx != gamestate.independentAvailable) { return false; }
                return true;
            })
        let dirH1 = document.createElement("h1");
        dirH1.innerText = "Pick a company to auction";
        auctionExtraDiv.appendChild(dirH1);
        if (toList.length == 0) {
            let warningP = document.createElement("p");
            warningP.innerText = "No shares available";
            auctionExtraDiv.appendChild(warningP);
        }
        else {
            toList.forEach((i) => {
                let coP = document.createElement("p");
                coP.classList.add(COMPANY_ABBREV[i.idx]);
                coP.classList.add("chooseableaction");
                coP.innerText = COMPANY_NAME[i.idx];
                coP.dataset.co = i.idx.toString();
                coP.onclick = (cop_ev) => {
                    client.moves.auctionShare(+(cop_ev.currentTarget as HTMLElement)!.dataset!.co!);
                }
                auctionExtraDiv.appendChild(coP);
            })
        }
        return auctionExtraDiv;
    }

    private issueBondExtra(gamestate: IEmuBayState, ctx: Ctx, client: any): HTMLElement {
        let issueBondExtraDiv = document.createElement("div");
        issueBondExtraDiv.classList.add("actionextra");

        let available = gamestate.companies.map((v, i) => ({ value: v, idx: i }))
            .filter((c) => {
                // Have to have share, has to not be private
                if (c.idx >= 3) { return false; }
                if (c.value.sharesHeld.filter((player) => player == +ctx.currentPlayer).length > 0) { return true };
                return false;
            })
        let dirH1 = document.createElement("h1");
        dirH1.innerText = "Pick a company to issue";
        issueBondExtraDiv.appendChild(dirH1);
        if (gamestate.bonds.length == 0) {
            let warningP = document.createElement("p");
            warningP.innerText = "No bonds remaining";
            issueBondExtraDiv.appendChild(warningP);
        }
        else {
            available.forEach((i) => {
                let coP = document.createElement("p");
                coP.classList.add(COMPANY_ABBREV[i.idx]);
                coP.classList.add("chooseableaction");
                coP.classList.add("coToChoose")
                coP.innerText = COMPANY_NAME[i.idx];
                coP.dataset.co = i.idx.toString();
                coP.onclick = (cop_ev) => {
                    let element = (cop_ev.currentTarget as HTMLElement)
                    let co = +element!.dataset!.co!;
                    document.querySelectorAll(`.coToChoose:not([data-co="${co}"])`).forEach((i) => (i as HTMLElement).remove());
                    element.classList.remove("chooseableaction")
                    element.onclick = null;
                    issueBondExtraDiv.appendChild(this.issueBondExtra2(gamestate, ctx, client, co));
                    grid.refreshItems();
                    grid.layout();
                }
                issueBondExtraDiv.appendChild(coP);
            })
        }

        grid.refreshItems();
        grid.layout();

        return issueBondExtraDiv;
    }

    private issueBondExtra2(gamestate: IEmuBayState, ctx: Ctx, client: any, company: number): HTMLElement {
        let issueBondExtraDiv = document.createElement("div");
        issueBondExtraDiv.classList.add("actionextra");
        let dirH1 = document.createElement("h1");
        dirH1.innerText = "Pick a bond to issue";
        issueBondExtraDiv.appendChild(dirH1);
        let bondsP = document.createElement("p");
        gamestate.bonds.forEach((bond, idx) => {
            let bondS = document.createElement("span");
            bondS.classList.add("chooseableaction");
            bondS.innerText = this.bondToString(bond, false);
            bondS.dataset!.bondId = idx.toString();
            bondS.onclick = (ev) => {
                client.moves.issueBond(company, +(ev.currentTarget as HTMLElement)!.dataset!.bondId!);
            }
            bondsP.appendChild(bondS);
        })
        issueBondExtraDiv.appendChild(bondsP);

        return issueBondExtraDiv;
    }

    private bondToString(bond: IBond, held: boolean = true): string {
        if (held) {
            return `₤${bond.amount!} (₤${bond.baseInterest}Δ₤${bond.interestDelta}/div)${bond.deferred ? " (def)" : ""}`;
        }
        else {
            return `₤${bond.amount!} (₤${bond.baseInterest}Δ₤${bond.interestDelta}/div)`;
        }
    }

    private buildTrackExtra(gamestate: IEmuBayState, ctx: Ctx, client: any): HTMLElement {
        let buildTrackExtraDiv = document.createElement("div");
        buildTrackExtraDiv.classList.add("actionextra");

        let available = gamestate.companies.map((v, i) => ({ value: v, idx: i }))
            .filter((c) => {
                if (c.value.trainsRemaining == 0 && c.value.narrowGaugeRemaining == 0) { return false };
                if (c.value.sharesHeld.filter((player) => player == +ctx.currentPlayer).length > 0) { return true };
                return false;
            })
        let dirH1 = document.createElement("h1");
        dirH1.innerText = "Pick a company to issue";
        buildTrackExtraDiv.appendChild(dirH1);
        available.forEach((i) => {
            let coP = document.createElement("p");
            coP.classList.add(COMPANY_ABBREV[i.idx]);
            coP.classList.add("chooseableaction");
            coP.classList.add("coToChoose")
            coP.innerText = COMPANY_NAME[i.idx];
            coP.dataset.co = i.idx.toString();
            coP.onclick = (cop_ev) => {
                let element = (cop_ev.currentTarget as HTMLElement)
                let co = +element!.dataset!.co!;
                if (gamestate.companies[co].trainsRemaining > 0) {
                    this.buildMode = BuildMode.Normal;
                } else {
                    this.buildMode = BuildMode.Narrow;
                }
                client.moves.buildTrack(+(cop_ev.currentTarget as HTMLElement)!.dataset!.co!);
            }
            buildTrackExtraDiv.appendChild(coP);
        })
        return buildTrackExtraDiv;
    }

    private buildTrackStage(gamestate: IEmuBayState, ctx: Ctx, client: any, board: Board): HTMLElement {
        let stageDiv = document.createElement("div");
        let title = document.createElement("h1");
        title.innerText = `Building Track (${COMPANY_NAME[gamestate.toAct!]})`;
        title.classList.add(COMPANY_ABBREV[gamestate.toAct!]);
        stageDiv.append(title);

        let co = gamestate.companies[gamestate.toAct!]!;

        {
            let cashP = document.createElement("p")
            cashP.innerText = `₤${co.cash} - ${gamestate.buildsRemaining} builds remaining`;
            stageDiv?.append(cashP);
        }

        if (co.trainsRemaining > 0) {
            let trainsH = document.createElement("h3");
            trainsH.innerText = "Normal track" + (this.buildMode == BuildMode.Normal ? " (building)" : "");
            stageDiv?.appendChild(trainsH);

            let trainsP = document.createElement("p")
            trainsP.innerText = `${co.trainsRemaining} track remaining`;
            stageDiv?.append(trainsP);
            if (this.buildMode != BuildMode.Normal) {
                if (gamestate.buildsRemaining! > 0) {
                    let switchP = document.createElement("p")
                    switchP.classList.add("chooseableaction");
                    switchP.innerText = "Switch to normal track"
                    switchP.onclick = (ev) => {
                        board.buildMode = BuildMode.Normal;
                        this.buildMode = BuildMode.Normal;
                        // Refresh panel
                        let parent = stageDiv.parentNode;
                        parent?.removeChild(stageDiv);
                        parent?.appendChild(this.buildTrackStage(gamestate, ctx, client, board));
                    }
                    stageDiv?.append(switchP);
                }
            }
        }

        if (co.narrowGaugeRemaining > 0) {
            let trainsH = document.createElement("h3");
            trainsH.innerText = "Narrow gauge track" + (this.buildMode == BuildMode.Narrow ? " (building)" : "");
            stageDiv?.appendChild(trainsH);

            let narrowP = document.createElement("p")
            narrowP.innerText = `${co.narrowGaugeRemaining} narrow gauge track remaining`;
            stageDiv?.append(narrowP);

            if (this.buildMode != BuildMode.Narrow) {
                if (gamestate.buildsRemaining! > 0) {
                    let switchP = document.createElement("p")
                    switchP.classList.add("chooseableaction");
                    switchP.innerText = "Switch to narrow gauge track"
                    switchP.onclick = (ev) => {
                        board.buildMode = BuildMode.Narrow;
                        this.buildMode = BuildMode.Narrow;
                        // Refresh panel
                        let parent = stageDiv.parentNode;
                        parent?.removeChild(stageDiv);
                        parent?.appendChild(this.buildTrackStage(gamestate, ctx, client, board));
                    }
                    stageDiv?.append(switchP);
                }
            }
        }

        if (gamestate.anyActionsTaken) {
            let passP = document.createElement("p");
            passP.classList.add("chooseableaction");
            passP.innerText = "Finish building";
            passP.onclick = (ev) => {
                client.moves.doneBuilding();
            }
            stageDiv?.append(passP);
        } else {
            let passP = document.createElement("p");
            passP.innerText = "Must build at least one track";
            stageDiv?.append(passP);
        }
        let noteP = document.createElement("p");
        noteP.innerText = "Click on map on highlighted spaces to build";
        stageDiv?.append(noteP);

        board.buildMode = this.buildMode;

        return stageDiv;
    };

    private takeResourcesExtra(gamestate: IEmuBayState, ctx: Ctx, client: any): HTMLElement {
        let takeResourcesExtraDiv = document.createElement("div");
        takeResourcesExtraDiv.classList.add("actionextra");

        // TODO: Limit to with mineable resources and cash
        let available = gamestate.companies.map((v, i) => ({ value: v, idx: i }))
            .filter((c) => {
                if (c.value.sharesHeld.filter((player) => player == +ctx.currentPlayer).length > 0) { return true };
                return false;
            })
        let dirH1 = document.createElement("h1");
        dirH1.innerText = "Pick a company to take resources";
        takeResourcesExtraDiv.appendChild(dirH1);
        available.forEach((i) => {
            let coP = document.createElement("p");
            coP.classList.add(COMPANY_ABBREV[i.idx]);
            coP.classList.add("chooseableaction");
            coP.classList.add("coToChoose")
            coP.innerText = COMPANY_NAME[i.idx];
            coP.dataset.co = i.idx.toString();
            coP.onclick = (cop_ev) => {
                let element = (cop_ev.currentTarget as HTMLElement)
                let co = +element!.dataset!.co!;
                client.moves.mineResource(+(cop_ev.currentTarget as HTMLElement)!.dataset!.co!);
            }
            takeResourcesExtraDiv.appendChild(coP);
        })
        return takeResourcesExtraDiv;
    }

    private takeResourcesStage(gamestate: IEmuBayState, ctx: Ctx, client: any): HTMLElement {
        let takeResourcesStageDiv = document.createElement("div");
        takeResourcesStageDiv.classList.add("actionextra");

        let title = document.createElement("h1");

        title.innerText = `Take resources from map (${COMPANY_NAME[gamestate.toAct!]})`;
        title.classList.add(COMPANY_ABBREV[gamestate.toAct!]);
        takeResourcesStageDiv.append(title);

        let co = gamestate.companies[gamestate.toAct!]!;


        {
            let cashP = document.createElement("p")
            cashP.innerText = `₤${co.cash}`;
            takeResourcesStageDiv?.append(cashP);
        }
        if (gamestate.anyActionsTaken) {
            let passP = document.createElement("p");
            passP.classList.add("chooseableaction");
            passP.innerText = "Finish taking";
            passP.onclick = (ev) => {
                client.moves.doneBuilding();
            }
            takeResourcesStageDiv?.append(passP);
        } else {
            let passP = document.createElement("p");
            passP.innerText = "Must take at least one resource";
            takeResourcesStageDiv?.append(passP);
        }
        return takeResourcesStageDiv;
    }
}