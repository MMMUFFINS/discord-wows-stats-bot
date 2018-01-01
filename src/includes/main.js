'use strict';

let parser = require('./parser');
let request = require('request');
let WargamingApi = require('./wg-api');
let lookup = require('./lookup');
let table = require('text-table');

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

        initWNEVAutoupdate () {
            return lookup.autoUpdateWNEV(1);
        }

        handleMessage (message) {
            let args;
            let matchingPlayer;
            let normalizedServer;

            return new Promise((resolve, reject) => {
                if (parser.botCalled(message.content)) {
                    let helpRequest = parser.checkHelpMode(message.content);
    
                    if (helpRequest) {
                        return reject(new Error(this.printUsageFriendly()));
                    }
    
                    args = parser.getArgs(message.content);
                    if (!args) {
                        return reject(new Error(this.printUsageError()));
                    } // exit and reply here or something
                    
                    // first normalize the server
                    parser.normalizeServer(args.server)
                    .catch((err) => {
                        return Promise.reject(new Error(this.printUsageError()));
                    })
                    .then((server) => {
                        normalizedServer = server;
    
                        // then get a matching player and account_id
                        return this.wg.getMatchingPlayer(args.nickname, normalizedServer);
                    })
                    .then((match) => {
                        matchingPlayer = match;
                        
                        // use getAccountInfo to check if their account is private
                        return Promise.all([
                            this.wg.getAccountInfo(matchingPlayer.account_id, normalizedServer),
                            this.wg.getPlayerClanInfo(matchingPlayer.account_id, normalizedServer)
                        ]);
                    })
                    .then((values) => {
                        let accountInfoResponse = values[0];
                        let accountInfo = accountInfoResponse.data[matchingPlayer.account_id];

                        matchingPlayer.clan = values[1];

                        if (accountInfo.hidden_profile === true) {
                            return Promise.reject(
                                new Error(
                                    parser.playerOnServer(matchingPlayer, normalizedServer) + ' is a shitter with a private profile!'
                                )
                            );
                        }
                        else {
                            let pvpStats = lookup.calculateOverallPvpStats(accountInfo.statistics.pvp);
                            return this.replyWithStats(matchingPlayer, normalizedServer, pvpStats);
                        }
                    })
                    .then((reply) => {
                        return resolve(reply);
                    })
                    .catch((err) => {
                        if (matchingPlayer) console.log(matchingPlayer);
                        console.error(err);
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
                    let pr = lookup.calculatePr(pvpShipsData);
                    
                    // we have the matched player, basic stats, and PR
                    // now put it all into a message
                    let profileUrl = lookup.getProfileUrl(matchingPlayer, normalizedServer, 'wows-numbers');

                    let reply = '\n' + parser.playerOnServer(matchingPlayer, normalizedServer) + ':\n';
                    let tableContent = [
                        ['Battles:', pvpStats.battles],
                        ['Winrate:', pvpStats.winrate.toFixed(2) + '%'],
                        ['PR:', pr.toFixed(0)],
                        ['Avg. Damage:', pvpStats.avgDamage.toFixed(0)]
                    ];

                    let statsTable = table(tableContent, {
                        align: ['l', 'r']
                    });

                    reply += '```' + statsTable + '```';
                    reply += profileUrl;

                    if (matchingPlayer.clan) {
                        reply += '\n' + lookup.getClanUrl(matchingPlayer.clan, normalizedServer, 'wows-numbers');
                    }
                    
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
