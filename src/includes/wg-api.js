'use strict';

module.exports = (() => {
    const fs = require('fs');
    const request = require('request');
    const parser = require('./parser');
    const path = require("path");


    class WargamingApi {
        static get baseUrls() {
            return {
                warships: 'https://api.worldofwarships.'    // add the tld dynamically later,
                
            }
        }

        static errorMessages (type, options, normalizedServer) {
            switch (type.toUpperCase()) {
                case 'INVALID_SEARCH':
                    return 'Player ' + options.nickname + ' not found on server ' + normalizedServer;
                
                default:
                    return 'The error type ' + type + ' was created from sekrit russian documents. Please yell at the bot developer to fix this.'
            }
        }
    
        constructor(appId) {
            this.appId = appId;
        }

        searchShipsPlayers(search, normalizedServer) {
            return this.apiCall({
                normalizedServer: normalizedServer,
                endpoint: '/account/list',
                body: {
                    search: search
                }
            })
            .then((response) => {
                // only care about the player list
                return Promise.resolve(response.data);
            })
            .catch((err) => {
                return Promise.reject(err);
            });
        }

        getMatchingPlayer(search, normalizedServer) {
            let match;

            return this.searchShipsPlayers(search, normalizedServer)
            .then((players) => {
                console.log('found some players hopefully')
                console.log(players)
                for (let i = 0; i < players.length; i++) {
                    let currentPlayer = players[i];

                    if (search.toUpperCase() === currentPlayer.nickname.toUpperCase()) {
                        match = currentPlayer;
                        break;
                    }
                }

                console.log('match')
                console.log(match)

                if (!match) {
                    return Promise.reject(new Error('No exact matches for player ' + search + ' on ' + normalizedServer + ' found. Please provide the full username.'));
                }

                return Promise.resolve(match);
            })
            .catch((err) => {
                return Promise.reject(err);
            });
        }

        // checkIfProfileIsPrivate(accountId) {
        //     return new Promise((resolve, reject) => {

        //     })
        // }

        apiCall(options) {
            // mandatory fields
            return new Promise((resolve, reject) => {
                let tld = parser.getTld(options.normalizedServer);  // returns null if not found, but if the normalized server doesn't work then heck it

                let encodedBody = 'application_id=' + this.appId;

                for (let field in options.body) {
                    if (options.body.hasOwnProperty(field)) {
                        encodedBody += '&';
                        encodedBody += field + '=' + encodeURIComponent(options.body[field]);
                    }
                }

                let requestOptions = {
                    url: WargamingApi.baseUrls.warships + tld + '/wows' + options.endpoint + '/',
                    headers: {
                        'Content-Type': 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: encodedBody
                };

                console.log('sending wg api call');
                console.log(requestOptions);

                request.post(requestOptions,
                    (err, response, body) => {
                        let parsed = JSON.parse(body);
                        console.log('got response');
                        console.log(parsed);

                        if (err || parsed.status !== 'ok') {  // wargaming sends all errors as 200 REEEEEEEEEEEEEEEEEEE
                            let errType = parsed.error.message;

                            return reject(new Error(WargamingApi.errorMessages(
                                errType, 
                                options,
                                options.normalizedServer
                            )));
                        }
                        else {
                            console.log('got player data');
                            return resolve(parsed);
                        }
                    }
                );
            })
            .then((response) => {
                return Promise.resolve(response);
            })
            .catch((err) => {
                return Promise.reject(err);
            })
        }
    }

    return WargamingApi;
})()