import { Ctx } from "boardgame.io";
import { Client } from "boardgame.io/dist/types/packages/client";
import { IEmuBayState, actions, ACTION_CUBE_LOCATION_ACTIONS } from "../game/game";

const muuri = require("muuri/dist/muuri")
var grid = new muuri("#maingrid", { dragEnabled: true, layout: { fillGaps: true } });

const COMPANY_ABBREV = ["EBR", "TMLC", "LW", "GT", "MLM", "NED", "NMF"]
const COMPANY_NAME = ["Emu Bay Railway Co.", "Tasmanian Main Line Railroad",
    "Launceston & Western", "Grubb's Tramway", "Mount Lyell Mining and Railway Co.",
    "North East Dundas Tramway", "North Mount Farrell"];
const ACTIONS = ["Build track", "Auction Share", "Take Resource", "Issue Bond", "Merge Private", "Pay Dividend"];

export class Ui {
    public update(gamestate: IEmuBayState, ctx: Ctx, client: any): void {
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
                stage = ctx.activePlayers![0];
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
                    if (stage == "removeCube") {
                        client.moves.removeCube(+(ev.currentTarget as HTMLDivElement)!.dataset!.actionid!)
                    }

                    if (stage == "takeAction") {
                        switch (+(ev.currentTarget as HTMLDivElement)!.dataset!.actionid!) {
                            case actions.AuctionShare:
                                this.clearActionExtras();
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
                                    toList.forEach((i)=>{
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
                                contentDiv?.appendChild(auctionExtraDiv);
                                break;
                            case actions.BuildTrack:
                                this.clearActionExtras();
                                break;
                            case actions.IssueBond:
                                this.clearActionExtras();
                                break;
                            case actions.Merge:
                                this.clearActionExtras();
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
        });

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
}