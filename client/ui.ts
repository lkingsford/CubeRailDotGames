import { Ctx } from "boardgame.io";
import { IEmuBayState } from "../game/game";

const muuri = require("muuri/dist/muuri")
var grid = new muuri("#maingrid", {dragEnabled: true})

export class Ui {
    public update(gamestate: IEmuBayState, ctx: Ctx): void {
        // Player states
        gamestate.players.forEach((player, idx) => {
            var outerDiv = document.querySelector(`#player${idx}`);
            let innerDiv = document.querySelector(`#player${idx} .card .content`);
            if (!outerDiv) {
                outerDiv = document.createElement("div");
                document.querySelector("#maingrid")?.appendChild(outerDiv);
                outerDiv.classList.add("item");

                let cardDiv = document.createElement("div");
                outerDiv.appendChild(cardDiv);
                cardDiv.classList.add("card");

                let playerName = document.createElement("h1");
                playerName.innerText = `Player ${idx}`
                cardDiv.appendChild(playerName);

                innerDiv = document.createElement("div");
                cardDiv.appendChild(innerDiv);
                innerDiv.classList.add("content")
                
                grid.add(outerDiv);
            }
        });
    }
}