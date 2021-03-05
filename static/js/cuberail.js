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
            joinGame(result, gameId, 0);
        } 
        else if (this.readyState == 4 && this.status != 200) {
            statusElement.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    request.setRequestHeader("content-type", "application/json");
    request.send(JSON.stringify({numPlayers: playerCount}));
}

function joinGame(gameId, matchId, playerId) {
    var data = new FormData();
    var status = document.querySelector("#status");
    data.append('playerName', STATE.username);
    data.append('playerID', `${playerId}`);
    var request = new XMLHttpRequest();
    request.open("post", `/games/${gameId}/${matchId}/join`, true);
    status.innerHTML = "Joining game...";
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            status.innerHTML = "Succeeded";
        } 
        else if (this.readyState == 4 && this.status != 200) {
            status.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    request.setRequestHeader("content-type", "application/json");
    request.send(JSON.stringify({playerName: STATE.username, playerID: playerId}));
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
    for(var i = minPlayers; i <= maxPlayers; ++i) {
        var buttonDiv = document.createElement("div");
        buttonDiv.classList.add("four", "columns");
        buttonsElement.appendChild(buttonDiv);
        var button = document.createElement("button");
        button.innerText = `Start ${i} player${i>1?"s":""}`;
        button.dataset["players"] = i;
        button.onclick = (e)=>{startGame(e.target.dataset["players"]);}
        buttonDiv.appendChild(button);
    }
}