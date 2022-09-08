# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.140.1/containers/typescript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 14, 12, 10
ARG VARIANT="16-buster"
FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node packages
# RUN sudo -u node npm install -g <your-package-list -here>

# Install Docker CE CLI
RUN apt-get update \
    && apt-get install -y apt-transport-https ca-certificates curl gnupg2 lsb-release \
    && curl -fsSL https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg | apt-key add - 2>/dev/null \
    && echo "deb [arch=amd64] https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli

# Install Docker Compose
RUN export LATEST_COMPOSE_VERSION=$(curl -sSL "https://api.github.com/repos/docker/compose/releases/latest" | grep -o -P '(?<="tag_name": ").+(?=")') \
    && curl -sSL "https://github.com/docker/compose/releases/download/${LATEST_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# Default to root only access to the Docker sock, set up non-root init script
RUN ln -s /var/run/docker-host.sock /var/run/docker.sock \
    && apt-get update \
    && apt-get -y install sudo socat \
    && echo '#!/bin/sh\n\
       sudo rm -rf /var/run/docker.sock\n\
       ((sudo socat UNIX-LISTEN:/var/run/docker.sock,fork,mode=660,user=node UNIX-CONNECT:/var/run/docker-host.sock) 2>&1 >> /tmp/vscr-dind-socat.log) & > /dev/null\n\
    "$@"' >> /usr/local/share/docker-init.sh \
    && chmod +x /usr/local/share/docker-init.sh

# Setting the ENTRYPOINT to docker-init.sh will configure non-root access to the Docker
# sock. The script will also execute CMD if you need to alter startup behaviors.
ENTRYPOINT [ "/usr/local/share/docker-init.sh" ]
CMD [ "sleep", "infinity" ]
