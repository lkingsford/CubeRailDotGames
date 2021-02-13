import { Ctx } from "boardgame.io";
import { IEmuBayState } from "../game/game";

const muuri = require("muuri/dist/muuri")
var grid = new muuri("#maingrid", {dragEnabled: true})

const COMPANY_ABBREV = ["EBR", "TMLC", "LW", "GT", "MLM", "NED", "NMF"]

export class Ui {
    public update(gamestate: IEmuBayState, ctx: Ctx): void {
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
            } else
            {
                cardDiv?.classList.remove("currentplayer");
            }

            // So, we do the item thing, but these are just going to delete and replace
            // items
            contentDiv!.innerHTML = '';
            
            let cashP = document.createElement("p");
            cashP.innerText = `Cash ₤${player.cash}`;
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
    }
}