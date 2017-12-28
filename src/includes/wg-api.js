'use strict';

module.exports = (() => {
    const fs = require('fs');
    const request = require('request');
    const parser = require('./parser');
    const path = require("path");
    

    class WargamingApi {
        static get baseUrls() {
            return {
                warships: 'https://api.worldofwarships.'    // add the tld dynamically later
            }
        }

        constructor(appId) {
            this.appId = appId;
        }

        

        searchShipsPlayers (search, server) {
            return new Promise((resolve, reject) => {
                let tld = parser.getTld(server);
                if (!tld) return reject(new Error('Invalid server.'));

                request.post(
                    {
                        url: WargamingApi.baseUrls.warships + tld + '/wows/account/list/',
                        headers: {
                            'Content-Type': 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8'
                        },
                        body: 'application_id=' + this.appId + '&search=' + search
                    },
                    (err, response, body) => {
                        if (err || response.statusCode !== 200) return reject(err);

                        var parsed = JSON.parse(body);
                        console.log('got player data');
                        console.log(parsed);
                        return resolve(parsed.data);        // return the list only, we don't need meta (number of possible matches) for now
                    }
                )
            });
        }

        getMatchingPlayer (search, server) {
            return new Promise((resolve, reject) => {
                let match;

                this.searchShipsPlayers(search, server)
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
                        return reject(new Error('Player not found.'));
                    }

                    return resolve(match);
                });
            });
        }
    }
    
    return WargamingApi;
})()