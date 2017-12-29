'use strict';

const parser = require('./parser')

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
    }

    let serviceHandler = new ExternalLookup();
    return serviceHandler;

})();
