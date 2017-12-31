'use strict';

module.exports = (() => {
    class StatsBotMsgParser {
        static get args () {
            return {
                keyword: '!stats',
                regexp: {
                    player: '[a-zA-Z0-9_]+',
                    server: '[a-zA-Z]+'
                }
            }
        }

        botCalled(text) {
            let regex = new RegExp('^' + StatsBotMsgParser.args.keyword, 'i');
            console.log(regex)
            if (text.search(regex) === 0) return true;
            return false;
        }

        checkHelpMode (text) {
            let regex = new RegExp('^' + StatsBotMsgParser.args.keyword + '$', 'i');
            
            if (text.search(regex) === 0) return true;
            return false;
        }

        getArgs (text) {
            let regex = new RegExp('^' + StatsBotMsgParser.args.keyword 
                + ' (' + StatsBotMsgParser.args.regexp.player 
                + ') (' + StatsBotMsgParser.args.regexp.server + ')', 'i');
            
            let match = regex.exec(text);
            if (!match) return null;

            return {
                nickname: match[1],
                server: match[2]
            }
        }

        getTld(normalizedServer) {
            switch (normalizedServer.toUpperCase()) {
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

        normalizeServer (server) {
            return new Promise((resolve, reject) => {
                switch (server.toUpperCase()) {
                    case 'NA':
                    case 'EU':
                    case 'RU':
                    case 'ASIA':
                        return resolve(server.toUpperCase());
                    case 'SEA':
                        return resolve('ASIA');
                    default:
                        return reject(new Error('Unrecognized server "' + server +'"'));
                }
            });
        }
        playerOnServer(player, normalizedServer) {
            return player.nickname + ' on ' + normalizedServer;
        }
    }

    let parser = new StatsBotMsgParser();
    return parser;
    
})();
    