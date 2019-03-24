'use strict';

const parser = require('./parser')
const request = require('request');

module.exports = (() => {
    class Lookup {
        constructor () {
            

            
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

        calculateShipPvpPr (shipData) {
            // console.log('calculateShipPvpPr');
            // console.log(shipData.ship_id);

            let shipEvs = this.expectedValues[shipData.ship_id];

            if (!shipEvs) {
                throw(new Error('No EVs found for ship ID ' + shipData.ship_id + '. Try updating the EV files or rebooting the server.'));
            }

            if (typeof shipEvs !== 'object') {
                throw(new Error('No EVs found for ship ID ' + shipData.ship_id + '. The ship may be in testing phase.'));
            }
            // console.log(shipEvs);

            // this must be scaled by its proportion of total battles when calculating overall
            // see https://wows-numbers.com/personal/rating

            // the entire shipdata object must be passed in so you can get the ship_id
            // to look up the expected values

            // average values are used to not (potentially) trigger integer overflow
            // like I did when just adding terms * nBattles together
            // the number of battles played increases without limit (albeit slowly)
            let actualAvgDamage = shipData.pvp.damage_dealt / shipData.pvp.battles;
            let actualWinrate = Number(shipData.pvp.wins / shipData.pvp.battles) * 100; // expected winrate is given in percent
            let actualAvgFrags = shipData.pvp.frags / shipData.pvp.battles;

            let rDmg = actualAvgDamage / shipEvs.average_damage_dealt;
            let rWins = actualWinrate / shipEvs.win_rate;
            let rFrags = actualAvgFrags / shipEvs.average_frags;

            let nDmg = Math.max(0, (rDmg - 0.4) / (1 - 0.4));
            let nFrags = Math.max(0, (rFrags - 0.1) / (1 - 0.1));
            let nWins = Math.max(0, (rWins - 0.7) / (1 - 0.7));

            let pr =  700 * nDmg + 300 * nFrags + 150 * nWins;

            return pr;
        }

        calculatePvpPr (pvpData) {
            let shipPvpPrs = [];
            let totalBattles = 0;
            
            if (!pvpData) {
                throw(new Error('Cannot read PvP data from Wargaming for this account. Go yell at the bot author.'));
            }

            for (let i = 0; i < pvpData.length; i++) {
                let currentShip = pvpData[i];
                // console.log('current ship:')
                // console.log(currentShip);

                if (currentShip && currentShip.pvp.battles > 0) {
                    let validPr;
                    let shipPvpPr;

                    try {
                        shipPvpPr = this.calculateShipPvpPr(currentShip);
                    } catch (err) {
                        console.error(err);
                        validPr = NaN;
                    } finally {
                        validPr = !(isNaN(shipPvpPr));
                    }
                    
                    // NaN usually results from test ships
                    
                    if (validPr) {
                        totalBattles += currentShip.pvp.battles;
                        shipPvpPrs.push({
                            battles: currentShip.pvp.battles,
                            pr: shipPvpPr
                        });
                    }
                    else {
                        console.error('ship id ' + currentShip.ship_id + ' pr is NaN');
                    }
                }
            }

            let pvpPr = 0;

            for (let i = 0; i < shipPvpPrs.length; i++) {
                pvpPr += shipPvpPrs[i].pr * (shipPvpPrs[i].battles / totalBattles);
            }

            return pvpPr;
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
            return new Promise((resolve, reject) => {
                this.getWNExpectedValues()
                .then((expectedValues) => {
                    let now = new Date();
                    let updateTime = new Date(expectedValues.time * 1000);
                    console.log('[' + now + '] Latest EVs: ' + updateTime + ' (' + expectedValues.time + ')');
                    this.expectedValues = expectedValues["data"];
                    return resolve();
                })
                .catch((err) => {
                    console.error(err.message);
                    return reject(err);
                });
            })
        }

        autoUpdateWNEV (intervalDays) {
            return new Promise((resolve, reject) => {
                this.updateWNExpectedValues()
                .then(() => {
                    // expected values file doesn't seem to change too often
                    let updateIntervalDaysInMs = intervalDays * 24*60*60*1000;
                    setTimeout(this.updateWNExpectedValues.bind(this), updateIntervalDaysInMs);
                    return resolve();
                })
                .catch((err) => {
                    return reject(err);
                });
            });
        }
    }

    let serviceHandler = new Lookup();
    return serviceHandler;

})();
