let Promise = require('bluebird');
let request = Promise.promisify(require('request').get);
let cheerio = require('cheerio');
let url = require('url');
let _ = require('lodash');

const SPORTLIFE_SCHEDULE_URL = 'http://local.sportlife.ua/schedule.html';
const CLUBS = ['черниговская', 'ПРОТАСОВ'];

function getClubs(sportlifeScheduleUrl=SPORTLIFE_SCHEDULE_URL) {
    return request(sportlifeScheduleUrl)
        .then(response => {
            var $ = cheerio.load(response.body);
            var clubs = [];
            $('.clubs-submenu>div').each((i, el) => {
                var region = $(el).find('.header').text();
                $(el).find('.list .col a').each((i, el) => {
                    var clubName = $(el).text();
                    var clubHref = $(el).attr('href');
                    var clubAbsoluteUrl = url.resolve(sportlifeScheduleUrl, clubHref);

                    clubs.push({
                        url: clubAbsoluteUrl,
                        text: `${clubName} (${region})`
                    })
                })
            });
            console.log(`FOUND CLUBS:\n`, clubs);
            return clubs;
        })
}

function filterClubs(foundClubs) {
    function clubIsSelected (foundClub) {
        var neededClubs = CLUBS.map( c => c.toLowerCase());
        return _.some(neededClubs, (neededClub) => {
            return _.includes(foundClub.text.toLowerCase(), neededClub);
        });
    }

    var selectedClubs =  _.filter(foundClubs, clubIsSelected);
    console.log(`SELECTED CLUBS:\n`, selectedClubs);
    return selectedClubs;
}

function getScheduleForClub(club) {
    return request(club.url)
        .then(response => {
            console.log(`SCHEDULE FOR ${club.text}\n`);
            return club.url;
        })
}

getClubs()
.then(filterClubs)
.map(getScheduleForClub)
.each(console.log);
