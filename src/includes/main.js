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
                    +   'I provide the following **PVP** data:\n'
                    +   'Battles\nWinrate\nwows-numbers Personal Rating*\nAverage Damage\nLinks to their wows-numbers profile and clan\n\n'
                    +   '\\***Note**: PR is calculated using WN\'s formula and the latest data from Wargaming.\n'
                    +   '- PR may differ from the website by 1 or 2 points due to rounding or more recent data.\n'
                    +   '- Ships for which WN does not have expected values are **ignored** in calculating PR here.\n',
                usage:  '**USAGE:**\n'
                    +   '```!stats <nickname> <NA|EU|(SEA|ASIA)|RU>```\n'
                    +   'Command is case-insensitive.\n'
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
            
            if (parser.botCalled(message.content)) {
                let helpRequest = parser.checkHelpMode(message.content);
                if (helpRequest) {
                    return this.replyUsage(WarshipsStatsBot.messages.intro);
                }

                args = parser.getArgs(message.content);
                if (!args) {
                    return this.replyUsage(WarshipsStatsBot.messages.argError);
                } // exit and reply here or something

                normalizedServer = parser.normalizeServer(args.server);
                if (!normalizedServer) return this.replyUsage('Unrecognized server "' + args.server + '".');
                
                // args ok, proceed
                return new Promise((resolve, reject) => {
                    this.wg.getMatchingPlayer(args.nickname, normalizedServer)
                    .then((match) => {
                        matchingPlayer = match;
                        console.log(matchingPlayer);

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
                            return this.replyPrivateAcc(matchingPlayer, normalizedServer);
                        }

                        let pvpStats = lookup.calculateOverallPvpStats(accountInfo.statistics.pvp);
                        return this.replyWithStats(matchingPlayer, normalizedServer, pvpStats);
                    })
                    .then((reply) => {
                        return resolve(reply);
                    })
                    .catch((err) => {
                        return reject(err);
                    });
                });
            }
            // bot was not called
            else return Promise.resolve(null);
        }

        replyUsage(intro) {
            let reply = '';
            if (intro) {
                reply += intro + '\n';
            }

            reply += WarshipsStatsBot.messages.usage;
            return Promise.resolve(reply);
        }

        replyPrivateAcc (player, normalizedServer) {
            return Promise.resolve(parser.playerOnServer(player, normalizedServer) + ' is a shitter with a private profile!');
        }

        replyWithStats (matchingPlayer, normalizedServer, pvpStats) {
            return new Promise((resolve, reject) => {

                this.wg.getShipsStats(matchingPlayer.account_id, normalizedServer)
                .then((shipsData) => {
                    let pr = lookup.calculatePvpPr(shipsData);
                    
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
                    
                    let removedFormatting = parser.removeFormatting(reply);

                    return resolve(removedFormatting);
                })
                .catch((err) => {
                    return reject(err);
                });
            });
        }
    }

    return WarshipsStatsBot;
})();
