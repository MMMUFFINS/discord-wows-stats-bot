'use strict';

const parser = require('./parser')
const request = require('request');

module.exports = (() => {
    class Lookup {
        constructor () {
            this.updateWNExpectedValues();

            // expected values file doesn't seem to change too often
            let updateIntervalMinutesInMs = 10 * 60*1000;
            setTimeout(this.updateWNExpectedValues.bind(this), updateIntervalMinutesInMs);
        }

        static get services() {
            return {
               'wows-numbers': {
                   domainName: 'wows-numbers.com',
                   subdomains: {
                       'NA': 'na',
                       'EU': '',    // default is EU!
                       'RU': 'ru',
                       'ASIA': 'asia'
                   },
                   imgUrlBase: 'https://static.wows-numbers.com/wows/'  //<account_id>.png; seems server independent
               }
            }
        }

        getImgUrl (player, normalizedServer, service) {
            console.log('getimgurl')

            let imgUrl;
            switch (service) {
                case 'wows-numbers':
                    imgUrl = Lookup.services[service].imgUrlBase + player.account_id + '.png';
                    return imgUrl;
                
            // TODO: warships.today
            default:
                return null;
            }
        }

        getProfileUrl (player, normalizedServer, service) {
            let profileUrl;
            switch (service) {
                case 'wows-numbers':
                    let selectedService = Lookup.services[service];
                    profileUrl = 'https://';
                    let subdomain = selectedService.subdomains[normalizedServer];

                    // eu has no subdomain
                    if (subdomain.length > 0) {
                        profileUrl += subdomain + '.';
                    }

                    profileUrl += selectedService.domainName + '/player/';   // includes trailing slash
                    profileUrl += player.account_id + ',' + player.nickname + '/';
                    
                    return profileUrl;
                
                // TODO: warships.today
                default:
                    return null;
            }
        }

        getStatsUrls (match, normalizedServer) {
            // TODO: use args.service to select website
            return new Promise((resolve, reject) => {
                let imgUrl = this.getImgUrl(match, normalizedServer, 'wows-numbers');
                let profileUrl = this.getProfileUrl(match, normalizedServer, 'wows-numbers');

                let output = {
                    imgUrl: imgUrl,
                    profileUrl: profileUrl
                };

                if (!imgUrl && !profileUrl) {
                    return reject(new Error('Could not look up stats for ' + match.nickname))
                }
                
                else return resolve(output);
            });
        }
        
        getWNExpectedValues () {
            return new Promise((resolve, reject) => {
                request('https://na.wows-numbers.com/personal/rating/expected/json/', (error, response, body) => {
                    if (error) return reject(new Error('Could not get wows-numbers expected values. Their website may be unavailable (or the bot server is borked).'));
                    let parsed = JSON.parse(body);
                    return resolve(parsed);
                })
            });
        }

        // assumes account is not private, but this information will be in the personal data
        calculateOverallPvpStats (pvpStats) {
            // the personal data is stored in the 'data' subfield
            // but 'data' is an object with the one key being the account ID.
            // I'll pass in the account_id just to be safe
            // TODO: test if we can just pull it out
            // because I don't trust wargaming lmao
            
            let battles = pvpStats.battles;
            let wins = pvpStats.wins;
            let damage = pvpStats.damage_dealt;
            let exp = pvpStats.xp;
            let kills = pvpStats.frags;

            return {
                battles: battles,
                winrate: (wins/battles * 100.0),
                avgDamage: damage/battles,
                avgExp: exp/battles,
                avgKills: kills/battles
            }
        }

        calculatePr (pvpData) {
            let expectedDamage = 0;
            let expectedFrags = 0;
            let expectedWinrate = 0;

            let actualDamage = 0;
            let actualFrags = 0;
            let actualWinrate = 0;

            for (let i = 0; i < pvpData.length; i++) {
                let currentShip = pvpData[i];
                // console.log('current ship ID: ' + currentShip.ship_id)

                // console.log('number of battles:')
                // console.log(currentShip.pvp.battles);

                if (currentShip.pvp.battles > 0) {
                    actualDamage += currentShip.pvp.damage_dealt;
                    actualWinrate += Number(currentShip.pvp.wins / currentShip.pvp.battles) * 100;
                    actualFrags += currentShip.pvp.frags;

                    // console.log({
                    //     ship_id: currentShip.ship_id,
                    //     actualDamage: actualDamage,
                    //     actualWinrate: actualWinrate,
                    //     actualFrags: actualFrags,
                    //     battles: currentShip.pvp.battles
                    // });

                    expectedDamage += this.expectedValues.data[currentShip.ship_id].average_damage_dealt * currentShip.pvp.battles;
                    expectedWinrate += this.expectedValues.data[currentShip.ship_id].win_rate;
                    expectedFrags += this.expectedValues.data[currentShip.ship_id].average_frags * currentShip.pvp.battles;
                }
            }

            let rDmg = actualDamage / expectedDamage;
            let rWins = actualWinrate / expectedWinrate;
            let rFrags = actualFrags / expectedFrags;

            let nDmg = Math.max(0, (rDmg - 0.4) / (1 - 0.4));
            let nFrags = Math.max(0, (rFrags - 0.1) / (1 - 0.1));
            let nWins = Math.max(0, (rWins - 0.7) / (1 - 0.7));

            let pr =  700 * nDmg + 300 * nFrags + 150 * nWins;

            return pr;
         
        }

        getClanUrl (clan, normalizedServer, service) {
            switch (service) {
                case 'wows-numbers':
                    let clanNameNoSpaces = clan.name.replace(' ', '-');
                    return this.getWNBaseUrl(normalizedServer) + '/clan/' + clan.clanId + ',' + clan.tag +'/';       // as of now it expects any arbitrary string after the clanId in the URL
                default:
                    return null;
            }
        }

        getWNBaseUrl (normalizedServer) {
            let baseUrl = 'https://';

            let subdomain = Lookup.services['wows-numbers'].subdomains[normalizedServer];
            if (subdomain.length > 0) {
                baseUrl += subdomain + '.';
            }

            baseUrl += Lookup.services['wows-numbers'].domainName;

            return baseUrl;
        }

        updateWNExpectedValues () {
            this.getWNExpectedValues()
            .then((expectedValues) => {
                let updateTime = new Date(expectedValues.time * 1000);
                console.log('Updated wows-numbers Expected Values at: ' + expectedValues.time + ' (' + updateTime + ')');
                this.expectedValues = expectedValues;
                return;
            })
            .catch((err) => {
                console.error(err.message);
                return;
            });
        }
    }

    let serviceHandler = new Lookup();
    return serviceHandler;

})();
