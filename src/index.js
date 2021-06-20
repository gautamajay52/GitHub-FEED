// A Simple Telegram Bot, which will parse RSS from github and inform via Telegram for new followers

// Copyright (C) 2021-Present Gautam Kumar <https://github.com/gautamajay52>

const fetch = require('node-fetch')
var parseString = require('xml2js').parseString;
var dotenv = require('dotenv');
const { Client } = require('pg')
const env = dotenv.config({ path: 'src/config.env' }).parsed;
var cron = require('node-cron');


const insert_query = 'INSERT INTO Github(id, date) VALUES($1, $2) RETURNING *'
const select_query = 'select * from Github where id=$1'


const client = new Client(process.env.DATABASE)
client.connect()

const send = async (query) => {
    try {
        const res = await fetch(`https://api.telegram.org/bot${process.env.TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'chat_id': process.env.ID, 'text': query, 'parse_mode': 'markdown', 'disable_web_page_preview': true })
        })
        console.log(await res.text())
    } catch (err) { console.log(err) }
}


const follow_checker = async () => {
    var out = await (await fetch(process.env.FEED)).text()
    await parseString(out, async (err, result) => {
        for (var match of result.feed.entry) {
            if (match.title[0]._.includes("started following")) {
                var follower = match.author[0].name[0]
                var follower_url = match.author[0].uri[0]
                var follower_username = follower_url.split('/')[3]
                const out = await client.query(select_query, [follower_username])
                // console.log(out.rows)
                if (out.rowCount == 0) {
                    var owner = match.link[0].$.href
                    var on_date = match.updated[0]
                    var mess = `🤖: [${follower}](${follower_url}) *started following* [${owner.split("/")[3]}](${owner}) *on* _${on_date}_ `
                    const out2 = await client.query(insert_query, [follower_username, on_date])
                    send(mess)
                }
            }
        }
    })
};

cron.schedule('* * 1 * * *', () => { follow_checker() })