'use strict';

let parser = require('./parser');
let WargamingApi = require('./wg-api');
let externalLookup = require('./external-lookup');

module.exports = (() => {
    class WarshipsStatsBot {
        static get messages() {
            return {
                intro:  'Hi! I\'m the Statsbot! **autism intensifies**',
                usage:  'USAGE: \n'
                    +   '`!stats <playerName> <NA|EU|SEA|RU>`\n'
                    +   'eg. `!stats vonEtienne EU`',
                argError: 'Error! Looks like you didn\'t call me with the right arguments.'
            }
        }

        constructor (appId) {
            this.wg = new WargamingApi(appId);
        }

        handleMessage (message) {
            console.log('handling message')
            console.log(message.content);
            if (parser.botCalled(message.content)) {
                console.log('bot was called')
                let helpRequest = parser.checkHelpMode(message.content);

                if (helpRequest) {
                    console.log('got a help request')
                    this.printUsageFriendly(message);
                    return;
                }

                let args = parser.getArgs(message.content);
                console.log('args');
                console.log(args)
                if (!args) {
                    this.printUsageError(message);
                    return;
                } // exit and reply here or something
                else {
                    this.wg.getMatchingPlayer(args.playerName, args.server)
                    .then((match) => {
                        console.log('getmatchingplayer: got match')
                        return externalLookup.getStatsUrls(match, args)
                        .then((urlObj) => {
                            console.log('got urlobj')
                            return Promise.resolve(urlObj);
                        })
                        .catch((err) => {
                            return Promise.reject(err);
                        })
                    })
                    .catch((err) => {
                        message.channel.send('Player ' + args.playerName + ' on ' + args.server + ' not found.');
                        return Promise.reject();
                    })
                    .then((urlObj) => {
                        let reply = urlObj.img + '\n' + urlObj.profile;
                        message.channel.send(reply);
                        return;
                    });
                }
            }
            else {
                console.log('message was not handled')
            }
        }


        printUsageFriendly (message) {
            let reply = WarshipsStatsBot.messages.intro + '\n' + WarshipsStatsBot.messages.usage;
            
            message.channel.send(reply);
        }

        printUsageError (message) {
            let reply = WarshipsStatsBot.messages.argError + '\n' + WarshipsStatsBot.messages.usage;
            
            message.channel.send(reply);
        }

    }

    return WarshipsStatsBot;
})();
