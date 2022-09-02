function ChangePassword_Click(o) {
    var request = new XMLHttpRequest();
    var password = document.getElementById("password").value;
    request.open("put", "/profile/change_password");
    request.setRequestHeader("content-type", "application/json");
    request.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                o.innerHTML = "Password Changed"
            } else {
                o.innerHTML = "Failed - " + this.status
            }
        }
    }
    request.send(JSON.stringify({ password: password }));
}

function ChangeUsername_Click(o) {
    var request = new XMLHttpRequest();
    var username = document.getElementById("username").value;
    request.open("put", "/profile/change_username");
    request.setRequestHeader("content-type", "application/json");
    request.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                o.innerHTML = "Username Changed"
            } else {
                o.innerHTML = "Failed - " + this.status
            }
        }
    }
    request.send(JSON.stringify({ username: username }));
}