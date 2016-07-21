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
                        title: `${clubName} (${region})`
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
            return _.includes(foundClub.title.toLowerCase(), neededClub);
        });
    }

    var selectedClubs =  _.filter(foundClubs, clubIsSelected);
    console.log(`SELECTED CLUBS:\n`, selectedClubs);
    return selectedClubs;
}

function createEvent(el, date, club) {
    if (!_.isEmpty(el.text())) {
        var container = el.find('.event-item-descr');
        var title = container.find('h4').text();
        var time = container.find('.time').text();
        var description = container.find('p').text();

        return { title, time, description, date, club };
    }
}

function getScheduleForClub(club) {
    return request(club.url)
        .then(response => {
            console.log(`SCHEDULE FOR ${club.title}\n`);

            var $ = cheerio.load(response.body, {
                decodeEntities: false
            });
            var table = $('#shedule-content');
            var tableDates = table.find('thead tr td').not('.time-col');
            var tableBody = table.find('tbody');

            var clubEvents = tableDates.map( (dateColumnIndex, el) => {
                var date = $(el).find('span').text();
                var events = [];

                tableBody.find('tr').not('.time-line').each((hourLineIndex, hourLineElement) => {
                    $(hourLineElement).find('td').not('.time-col').eq(dateColumnIndex).each((hourCellIndex, hourCellElement) => {
                        $(hourCellElement).find('.event-item').each((eventItemIndex, eventItemElement) => {
                            var event = createEvent($(eventItemElement), date, club);
                            events.push(event)
                        });
                    });
                });
                return events;
            }).get();

            return clubEvents;
        })
}

getClubs()
.then(filterClubs)
.map(getScheduleForClub)
.each(console.log);
