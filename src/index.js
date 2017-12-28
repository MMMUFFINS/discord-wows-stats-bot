/*
  A ping pong bot, whenever you send "ping", it replies "pong".
*/

'use strict';

// Import the discord.js module
const Discord = require('discord.js');
const fs = require('fs');
const parser = require('./includes/parser')
const WargamingApi = require('./includes/wg-api');

let secrets = JSON.parse(fs.readFileSync('./secrets.json'));
let discordToken = secrets.discord;
let wgToken = secrets.wargaming;

// Create an instance of a Discord client
const client = new Discord.Client();
const wg = new WargamingApi(wgToken);

// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
    console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', message => {
    // ignore bots, including itself! THIS IS IMPORTANT
    if (message.author.bot) return;
    
    // If the message is "ping"
    if (message.content === 'bing') {
        // Send "pong" to the same channel
        message.channel.send('bong');
        return;
    }
    else {
        let success;

        if (parser.botCalled(message.content)) {
            let args = parser.getArgs(message.content);
            
            if (!args) success = false; // exit and reply here or something
            else {
                wg.getMatchingPlayer(args.player, args.server)
                .then((match) => {
                    message.channel.send(JSON.stringify(match));
                    return;
                })
                .catch((err) => {
                    message.channel.send('Player ' + args.player + ' on ' + args.server + ' not found.');
                });
            }
        }

    }
});

client.login(discordToken);