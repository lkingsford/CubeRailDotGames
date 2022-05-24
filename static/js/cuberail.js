function createaccount() {
    var username = document.querySelector("#username").value;
    var password = document.querySelector("#password").value;
    var statusElement = document.querySelector("#status");
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            statusElement.innerHTML = "Succeeded";
            window.location.replace("/");
        }
        else if (this.readyState == 4 && this.status == 400) {
            statusElement.innerHTML = this.responseText;
        }
        else if (this.readyState == 4 && this.status != 200) {
            statusElement.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    request.open("put", "/register_user", true);
    request.send(JSON.stringify({ username: username, password: password }));
}

function login() {
    var username = document.querySelector("#username").value;
    var password = document.querySelector("#password").value;
    var data = new FormData();
    data.append('username', username);
    data.append('password', password);
    var statusElement = document.querySelector("#status");
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            statusElement.innerHTML = "Succeeded";
            window.location.replace("/");
        }
        else if (this.readyState == 4 && this.status == 400) {
            statusElement.innerHTML = this.responseText;
        }
        else if (this.readyState == 4 && this.status != 200) {
            statusElement.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    var query = (new URLSearchParams(data)).toString();
    request.open("post", `/login_user?${query}`, true);
    request.send();
}

function startGame(playerCount) {
    var result = document.getElementById("gamename").value;
    var statusElement = document.querySelector("#status");
    var request = new XMLHttpRequest();
    request.open("post", `/games/${result}/create`, true);
    status.innerHTML = "Creating game...";
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            statusElement.innerHTML = "Created";
            var gameId = JSON.parse(this.responseText)["matchID"];
            joinGame(result, gameId, 0, () => { window.location.replace('/') });
        }
        else if (this.readyState == 4 && this.status != 200) {
            statusElement.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    request.setRequestHeader("content-type", "application/json");
    request.send(JSON.stringify(
        {
            numPlayers: playerCount,
            name: document.getElementById("description").value
        }
    ));
}

function setGameName(gameId, description) {
    var request = new XMLHttpRequest();
    request.open("put", "/set_game_name")
    request.send(JSON.stringify({ gameId: gameId, description: description }));
}

function joinGame(gameId, matchId, playerId, doneCallback) {
    var data = new FormData();
    var status = document.querySelector("#status");
    data.append('playerName', STATE.username);
    data.append('playerID', `${playerId}`);
    var request = new XMLHttpRequest();
    request.open("post", `/games/${gameId}/${matchId}/join`, true);
    if (status) status.innerHTML = "Joining game...";
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (status) status.innerHTML = "Succeeded";
            if (doneCallback) { doneCallback(); }
        }
        else if (this.readyState == 4 && this.status != 200) {
            if (status) status.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
        else if (this.status == 409) {
            // Game already joined - try next ID
            // TODO: Make this not awful
            var nextId = playerId + 1;
            if (nextId <= 6) {
                console.log("Trying player ID %s", nextId)
                joinGame(gameId, matchId, nextId, doneCallback);
            }
        }
    }
    request.setRequestHeader("content-type", "application/json");
    request.send(JSON.stringify({ playerName: STATE.username, playerID: playerId }));
}

function createGame_onLoad() {
    createGame_updateButtons();
}

function createGame_onChange() {
    createGame_updateButtons();
}

function createGame_updateButtons() {
    console.log("Update Buttons");
    var buttonsElement = document.querySelector("#buttons");
    buttonsElement.innerHTML = "";
    var result = document.getElementById("gamename").value;
    var selectedGameE = document.getElementById(result)
    var minPlayers = Number(selectedGameE.dataset['minplayers']);
    var maxPlayers = Number(selectedGameE.dataset['maxplayers']);
    for (var i = minPlayers; i <= maxPlayers; ++i) {
        var buttonDiv = document.createElement("div");
        buttonDiv.classList.add("four", "columns");
        buttonsElement.appendChild(buttonDiv);
        var button = document.createElement("button");
        button.innerText = `Start ${i} player${i > 1 ? "s" : ""}`;
        button.dataset["players"] = i;
        button.onclick = (e) => { startGame(e.target.dataset["players"]); }
        buttonDiv.appendChild(button);
    }
    var hotseatButtonsElement = document.querySelector("#hotseatButtons");
    for (var i = minPlayers; i <= maxPlayers; ++i) {
        var buttonDiv = document.createElement("div");
        buttonDiv.classList.add("four", "columns");
        hotseatButtonsElement.appendChild(buttonDiv);
        var button = document.createElement("button");
        button.innerText = `Hotseat ${i} player${i > 1 ? "s" : ""}`;
        button.dataset["players"] = i;
        button.onclick = (e) => { window.location.replace(`/clients/${selectedGameE.id}?playerCount=${e.target.dataset["players"]}`) };
        buttonDiv.appendChild(button);
    }
}

function lobby_joinGame(o) {
    var gameId = o.dataset['gameid'];
    var matchId = o.dataset['matchid'];

    joinGame(gameId, matchId, 0, () => { window.location.replace('/') });
}
function lobby_enterGame(o) {
    var playerId = o.dataset['playerid'];
    var matchId = o.dataset['matchid'];
    var clienturi = o.dataset['clienturi'];
    uri = clienturi + `?matchId=${matchId}&playerId=${playerId}`

    window.location.replace(uri);
}