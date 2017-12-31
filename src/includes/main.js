'use strict';

let parser = require('./parser');
let request = require('request');
let WargamingApi = require('./wg-api');
let lookup = require('./lookup');

module.exports = (() => {
    class WarshipsStatsBot {
        static get messages() {
            return {
                intro:  'Hi! I\'m the Statsbot! **autism intensifies**\n'
                    +   'I provide the following data:\n'
                    +   'Battles\nWinrate\nwows-numbers Personal Rating*\nAverage Damage\nLink to their wows-numbers profile\n\n'
                    +   '*Note: The wows-numbers PR is calculated using their provided formula and the latest data from Wargaming. It may differ from the website by 1 or 2 points due to rounding or more recent data.\n',
                usage:  '**USAGE:**\n'
                    +   '```!stats <nickname> <NA|EU|(SEA|ASIA)|RU>```\n'
                    +   'The entire command is case-insensitive, eg. `!sTats`, `iSsm`, and `nA` are all valid.\n'
                    +   'Example: `!stats vonEtienne EU`\n'
                    +   'To display this help message, type `!stats`\n'
                    +   'To report an issue, go here: https://github.com/MMMUFFINS/discord-wows-stats-bot/issues',
                argError: 'Error! Looks like you didn\'t call me with the right arguments.'
            }
        }

        constructor (appId) {
            this.wg = new WargamingApi(appId);
        }

        handleMessage (message) {
            let args;
            let matchingPlayer;
            let normalizedServer;
            let userOnServer;

            return new Promise((resolve, reject) => {
                console.log('handling message')
                console.log(message.content);
                if (parser.botCalled(message.content)) {
                    console.log('bot was called')
                    let helpRequest = parser.checkHelpMode(message.content);
    
                    if (helpRequest) {
                        console.log('got a help request')
                        return reject({
                            error: new Error('User requested help message.'),
                            willReply: true,
                            message: this.printUsageFriendly()
                        });
                    }
    
                    args = parser.getArgs(message.content);
                    console.log('args');
                    console.log(args)
                    if (!args) {
                        return reject({
                            error: new Error('Malformed bot command.'),
                            willReply: true,
                            message: this.printUsageError()
                        });
                    } // exit and reply here or something
                    
                    // first normalize the server
                    parser.normalizeServer(args.server)
                    .then((server) => {
                        console.log('normalizedServer resolved')
                        console.log(server);
                        normalizedServer = server;
    
                        // then get a matching player and account_id
                        return this.wg.getMatchingPlayer(args.nickname, normalizedServer);
                    })
                    .then((match) => {
                        matchingPlayer = match;
                        userOnServer = matchingPlayer.nickname + ' on ' + normalizedServer;
                        
                        // use getAccountInfo to check if their account is private
                        return this.wg.getAccountInfo(matchingPlayer.account_id, normalizedServer);

                        // get their stats
                        // return this.replyWithStats(matchingPlayer, normalizedServer);
                    })
                    .then((response) => {
                        let accountInfo = response.data[matchingPlayer.account_id];

                        if (accountInfo.hidden_profile === true) {
                            return Promise.reject(new Error(userOnServer + ' is a shitter who marked his profile as private!'));
                        }
                        else {
                            let pvpStats = lookup.calculateOverallPvpStats(accountInfo.statistics.pvp);
                            return this.replyWithStats(matchingPlayer, normalizedServer, pvpStats);
                        }
                    })
                    .then((reply) => {
                        console.log('sending reply')
                        return resolve(reply);
                    })
                    .catch((err) => {
                        return reject(err);
                    });
                }
                else return;        // bot was not called
            });
        }


        printUsageFriendly () {
            return WarshipsStatsBot.messages.intro + '\n' + WarshipsStatsBot.messages.usage;
        }

        printUsageError () {
            return WarshipsStatsBot.messages.argError + '\n' + WarshipsStatsBot.messages.usage;
        }

        replyWithStats (matchingPlayer, normalizedServer, pvpStats) {
            return new Promise((resolve, reject) => {

                this.wg.getPvpShipsData(matchingPlayer.account_id, normalizedServer)
                .then((pvpShipsData) => {
                    console.log('got pvp ships data');

                    let pr = lookup.calculatePr(pvpShipsData);
                    console.log('calculated pr');
                    
                    // we have the matched player, basic stats, and PR
                    // now put it all into a message
                    let profileUrl = lookup.getProfileUrl(matchingPlayer, normalizedServer, 'wows-numbers');
                    console.log('profileUrl')
                    console.log(profileUrl)
                    let reply = '\n' + matchingPlayer.nickname + ' on ' + normalizedServer + ':\n'
                            +   'Battles: ' + pvpStats.battles + '\n'
                            +   'Winrate: ' + pvpStats.winrate.toFixed(2) + '%\n'
                            +   'PR: ' + pr.toFixed(0) + '\n'
                            +   'Avg. Damage: ' + pvpStats.avgDamage.toFixed(0) + '\n'
                            +   profileUrl;
                    
                    return resolve(reply);
                })
                .catch((err) => {
                    return reject(err);
                });
            });
        }
    }

    return WarshipsStatsBot;
})();
