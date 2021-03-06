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
            switch (server.toUpperCase()) {
                case 'NA':
                case 'EU':
                case 'RU':
                case 'ASIA':
                    return server.toUpperCase();
                case 'SEA':
                    return 'ASIA';
                default:
                    return null;
            }
        }

        playerOnServer(player, normalizedServer) {
            let output = '';

            if (player.clan) {
                output += '[' + player.clan.tag + ']';
            }

            output += player.nickname + ' on ' + normalizedServer;
            return output;
        }

        removeFormatting (msgTxt) {
            return msgTxt.replace('_', '\\_');
        }
    }

    let parser = new StatsBotMsgParser();
    return parser;
    
})();
    