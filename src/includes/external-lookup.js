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

        getImgUrl (player, server, service) {
            console.log('getimgurl')
            let normalizedServer = parser.normalizeServer(server);
            console.log(normalizedServer)
            if (!normalizedServer) return null;

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

        getProfileUrl (player, server, service) {
            let normalizedServer = parser.normalizeServer(server);
            if (!normalizedServer) return null;

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

        getStatsUrls (match, args) {
            // TODO: use args.service to select website
            return new Promise((resolve, reject) => {
                console.log('get stats urls')
                console.log({match: match, args: args})
                let imgUrl = this.getImgUrl(match, args.server, 'wows-numbers');
                let profileUrl = this.getProfileUrl(match, args.server, 'wows-numbers');

                if (!imgUrl && !profileUrl) {
                    return reject(new Error('Could not look up stats for ' + args.player.nickname))
                }

                return resolve({
                    img: imgUrl,
                    profile: profileUrl
                })
            })
            
                
            
        }
    }

    let serviceHandler = new ExternalLookup();
    return serviceHandler;

})();
