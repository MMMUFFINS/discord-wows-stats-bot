'use strict';

const parser = require('./parser')
const request = require('request');

module.exports = (() => {
    class ExternalLookup {
        static get services() {
            return {
               'wows-numbers': {
                   domainName: 'wows-numbers.com/',
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
                    imgUrl = ExternalLookup.services[service].imgUrlBase + player.account_id + '.png';
                    console.log('imgurl: ' + imgUrl)
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
                    let selectedService = ExternalLookup.services[service];
                    profileUrl = 'https://';
                    let subdomain = selectedService.subdomains[normalizedServer];

                    // eu has no subdomain
                    if (subdomain.length > 0) {
                        profileUrl += subdomain + '.';
                    }

                    profileUrl += selectedService.domainName + 'player/';   // includes trailing slash
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
                console.log('get stats urls')
                console.log({match: match, normalizedServer: normalizedServer})
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
                    if (error) return reject(new Error('Could not get expected values.'));

                    let parsed = JSON.parse(body);
                    let expectedValues = parsed.data;
                    return resolve(expectedValues);
                })
            });
        }

        calculatePr (pvpData) {
            return new Promise((resolve, reject) => {
                console.log('getting expected values...');
                this.getWNExpectedValues()
                .then((expectedValues) => {
                    console.log('got expected values');
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
        
                            expectedDamage += expectedValues[currentShip.ship_id].average_damage_dealt * currentShip.pvp.battles;
                            expectedWinrate += expectedValues[currentShip.ship_id].win_rate;
                            expectedFrags += expectedValues[currentShip.ship_id].average_frags * currentShip.pvp.battles;
                        }
                    }
    
                    let rDmg = actualDamage / expectedDamage;
                    let rWins = actualWinrate / expectedWinrate;
                    let rFrags = actualFrags / expectedFrags;
    
                    let nDmg = Math.max(0, (rDmg - 0.4) / (1 - 0.4));
                    let nFrags = Math.max(0, (rFrags - 0.1) / (1 - 0.1));
                    let nWins = Math.max(0, (rWins - 0.7) / (1 - 0.7));
    
                    let pr =  700 * nDmg + 300 * nFrags + 150 * nWins;
                    // console.log('pr')
                    // console.log(pr)
    
                    return resolve(pr);
                })
                .catch((err) => {
                    return reject(err)
                });
            });
        }
    }

    let serviceHandler = new ExternalLookup();
    return serviceHandler;

})();
