'use strict';

module.exports = (() => {
    class WgStatsBotMsgParser {
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
            let regex = new RegExp('^' + WgStatsBotMsgParser.keyword);
            if (text.search(regex === 0)) return true;
            return false;
        }

        getArgs (text) {
            let regex = new RegExp('^' + WgStatsBotMsgParser.args.keyword 
                + ' (' + WgStatsBotMsgParser.args.regexp.player 
                + ') (' + WgStatsBotMsgParser.args.regexp.server + ')', 'i');
            
            let match = regex.exec(text);
            if (!match) return null;

            return {
                player: match[1],
                server: match[2]
            }
        }
    }

    let parser = new WgStatsBotMsgParser();
    return parser;
    
})();
    