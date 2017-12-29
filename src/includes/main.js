'use strict';

let parser = require('./parser');
let WargamingApi = require('./wg-api');
let lookup = require('./lookup');

module.exports = (() => {
    class WarshipsStatsBot {
        static get messages() {
            return {
                intro:  'Hi! I\'m the Statsbot! **autism intensifies**',
                usage:  'USAGE: \n'
                    +   '`!stats <nickname> <NA|EU|SEA|RU>`\n'
                    +   'eg. `!stats vonEtienne EU`',
                argError: 'Error! Looks like you didn\'t call me with the right arguments.'
            }
        }

        constructor (appId) {
            this.wg = new WargamingApi(appId);
        }

        handleMessage (message) {
            let args;
            let normalizedServer;

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
                    
                    return parser.normalizeServer(args.server)
                    .then((server) => {
                        console.log('normalizedServer resolved')
                        console.log(server);
                        normalizedServer = server;
                        return resolve();
                    })
                    .catch((err) => {
                        console.log('normalizedServer caught')
                        return reject ({
                            error: err,
                            willReply: true,
                            message: err.message
                        });
                    });
                }
                else return reject({
                    error: null,
                    willReply: false,
                    message: 'Bot was not called.'
                });
            })
            .then(() => {
                return this.wg.getMatchingPlayer(args.nickname, normalizedServer)
                .then((match) => {
                    return Promise.resolve(match);
                })
                .catch((err) => {
                    return Promise.reject({
                        error: err,
                        willReply: true,
                        message: err.message
                    });
                });
            })
            .then((matchingPlayer) => {
                return lookup.getStatsUrls(matchingPlayer, normalizedServer)
                .then((statsObj) => {
                    return Promise.resolve(statsObj);
                })
                .catch((err) => {
                    return Promise.reject({
                        error: err,
                        willReply: true,
                        message: err.message
                    });
                });
            })
            .then((statsObj) => {
                let reply = statsObj.imgUrl + '\n' + statsObj.profileUrl;
                return Promise.resolve(reply);
            })
            .then((reply) => {
                console.log('ready to send reply')
                console.log(reply);
                return Promise.resolve(reply);      // returns back to the caller
            })
            .catch((errObj) => {
                return Promise.reject(errObj);
            });
        }


        printUsageFriendly () {
            return WarshipsStatsBot.messages.intro + '\n' + WarshipsStatsBot.messages.usage;
        }

        printUsageError () {
            return WarshipsStatsBot.messages.argError + '\n' + WarshipsStatsBot.messages.usage;
        }

    }

    return WarshipsStatsBot;
})();
