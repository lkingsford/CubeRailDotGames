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
    var data = new FormData();
    data.append('numPlayers', playerCount);
    var query = (new URLSearchParams(data)).toString();
    var request = new XMLHttpRequest();
    request.open("post", `/games/${result}/create?${query}`, true);
    status.innerHTML = "Creating game...";
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            statusElement.innerHTML = "Created";
            var gameId = this.responseText["matchID"];
            joinGame(result, gameId, 0);
        } 
        else if (this.readyState == 4 && this.status != 200) {
            statusElement.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    request.send();
}

function joinGame(gameId, matchId, playerId) {
    var data = new FormData();
    data.append('playerName', STATE.username);
    data.append('playerID', playerId);
    var query = (new URLSearchParams(data)).toString()
    var request = new XMLHttpRequest();
    request.open("post", `/games/${gameId}/${matchId}/join?${query}`, true);
    status.innerHTML = "Joining game...";
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            status.innerHTML = "Succeeded";
        } 
        else if (this.readyState == 4 && this.status != 200) {
            status.innerHTML = `Failed (${this.status}) - ${this.responseText}`;
        }
    }
    request.send();
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
        button.onclick = ()=>{startGame(i);}
        buttonDiv.appendChild(button);
    }
}