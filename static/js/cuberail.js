function createaccount() {
    var username = document.querySelector("#username").value;
    var password = document.querySelector("#password").value;
    var statusElement = document.querySelector("#status");
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            statusElement.innerHTML = "Succeeded";
            window.location.replace("/");
        }
        else if (this.readyState == 4 && this.status != 200) {
            statusElement.innerHTML = `Failed (${this.status})`;
        }
    }
    request.open("put", "/register_user", true);
    request.send(JSON.stringify({username: username, password: password}));
}