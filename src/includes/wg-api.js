'use strict';

module.exports = (() => {
    const request = require('request');


    class WargamingApi {
        static get baseUrls() {
            return {
                warships: 'https://api.worldofwarships.'    // add the tld dynamically later
            }
        }

        constructor(appId) {
            this.appId = appId;
        }

        getTld(server) {
            switch (server.toUpperCase()) {
                case 'NA':
                    return 'com';
                case 'EU':
                    return 'eu';
                case 'RU':
                    return 'ru'
                case 'ASIA':
                case 'SEA':
                    return 'asia';
                default:
                    return null;
            }
        }

        getShipsPlayers (search, server) {
            return new Promise((resolve, reject) => {
                let tld = this.getTld(server);
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
            })
        }

        getMatchingPlayer (search, server) {
            return new Promise((resolve, reject) => {
                let match;

                this.getShipsPlayers(search, server)
                .then((players) => {
                    for (let i = 0; i < players.length; i++) {
                        let currentPlayer = players[i];

                        if (search.toUpperCase() === currentPlayer.nickname.toUpperCase()) {
                            match = currentPlayer;
                            break;
                        }
                    }

                    if (!match) {
                        return reject(new Error('No matching player was found.'));
                    }

                    return resolve(match);
                });
            });
        }

        

    }

    return WargamingApi;
})()