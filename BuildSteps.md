On server:
apt update
apt install curl software-properties-common -y
curl -sL https://deb.nodesource.com/setup_15.x | sudo bash -
apt install nodejs
apt install nginx
apt install postgresql
adduser trains
sudo -u postgres psql -U postgres

in postgres:
CREATE USER 'trains' WITH PASSWORD '****'
CREATE DATABASE 'trains';
GRANT ALL PRIVILEGES ON DATABASE 'trains' TO 'trains'

On client
scp tarball to server

On server:
mkdir /var/www/cuberaildotgames
cd /var/www/cuberaildotgames
tar -xvf ~/tarball.tar.gz
npm i --only=prod

cp cuberailsdotgames.service /lib/systemd/system/
systemctl daemon-reload
