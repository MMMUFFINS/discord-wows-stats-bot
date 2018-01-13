# discord-wows-stats-bot
Simple Discord bot to grab player stats in World of Warships.

## Usage

When the bot is running, type `!stats` to get usage information.

## Installation

### Discord Bot Token

1. Go to https://discordapp.com/developers/docs and sign into your account. 
1. Create an application (eg. `stats-bot`) and create a bot user.
1. Get the bot's API token on the page. Keep this for later.

### Wargaming API Token

1. Go to https://developers.wargaming.net and sign into your account.
1. Create an application and get the application ID. Keep this for later.

### Docker

1. Get [Docker Engine](https://docs.docker.com/engine/installation/) and [Docker Compose](https://docs.docker.com/compose/install/).
1. Clone this repo to your server.
1. In the `secrets.json` file, add your Discord and Wargaming API tokens.

### Add Bot to Server

1. On the Discord developer's page, generate an OAuth invite URL for your bot. The only permissions it needs is to view and send messages. 
1. Copy and paste the URL in another tab to add the bot to one of your Discord servers.
1. It is recommended to create a new text channel that this bot will have access to. The bot will have a role auto-assigned to it based on the bot name that you gave it earlier. You can then set the permissions on that role on the channel.
1. Turn off all link embeds in that channel and for the bot because it prints URLs to player and clan profiles.

Permissions required:

* Read messages
* Send messages
* Manage messages

## Run

Detached mode (kill with `docker-compose down`):

```bash
docker-compose up -d 
```

Foreground (kill with Ctrl-C)

```bash
docker-compose up
```

## Updating

The update script will pull the latest changes and restart the container in detached mode.

```bash
./update
```

If you only want to update without restart, do:

```bash
docker-compose down --rmi all
git pull
```

This is so the old Docker image is pruned.

## Debugging

To view the logs:

```
docker logs discordwowsstatsbot_statsbot_1
```

Add `--follow` after `logs` to continuously stream the output to the terminal.

You can also login to the container using:

```
docker exec -it discordwowsstatsbot_statsbot_1 /bin/bash
```