function ChangePassword_Click(o) {
    var request = new XMLHttpRequest();
    var userId = o.dataset['userid'];
    var password = document.getElementById("password_" + userId).value;
    request.open("put", "/admin/change_password");
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
    request.send(JSON.stringify({ userId: userId, password: password }));
}

function SaveRoles_Click(o) {
    var request = new XMLHttpRequest();
    var userId = o.dataset['userid'];
    var adminChecked = document.getElementById("admin_" + userId).checked;
    var gamemasterChecked = document.getElementById("gamemaster_" + userId).checked;
    request.open("put", "/admin/save_roles");
    request.setRequestHeader("content-type", "application/json");
    request.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                o.innerHTML = "Roles Set"
            } else {
                o.innerHTML = "Failed - " + this.status
            }
        }
    }
    request.send(JSON.stringify({
        userId: userId, admin: adminChecked,
        gamemaster: gamemasterChecked
    }));
}