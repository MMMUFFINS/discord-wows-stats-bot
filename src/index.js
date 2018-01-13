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
let wgAppId = secrets.wargaming;

// Create an instance of a Discord client
const client = new Discord.Client();
const StatsBotClass = require('./includes/main')

let statsbot = new StatsBotClass(wgAppId);



// The ready event is vital, it means that your bot will only start reacting to information
// from Discord _after_ ready is emitted
client.on('ready', () => {
    console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', message => {
    // ignore bots, including itself! THIS IS IMPORTANT
    if (message.author.bot) return;
    
 
    statsbot.handleMessage(message)
    .then((reply) => {
        if (reply) {
            message.channel.send(reply)
            .then((newMsg) => {
                message.delete();
            })
        };
    })
    .catch((err) => {
        console.error(err);
        message.channel.send(err.message, {
            reply: message.author
        });
    });
});

// actual program start
statsbot.initWNEVAutoupdate()
.then(() => {
    client.login(discordToken);
})
.catch((err) => {
    console.error(err);
});