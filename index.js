const puppeteer = require('puppeteer');
const fs = require('fs');
var parse = require('csv-parse')

function sanitizeText(text) {
    if(text){
        return text
            .replace(/\s+\*/g, ' ')
            .replace(/[^\w\s]|_/g, "")
            .replace(/\s+/g, " ")
            .trim()
    }
    return ''
}

function appendResult(results, platform, url) {
    results.map(result => {
        const text = sanitizeText(result)
        if(text){
            const row = `${platform};${url};${text}`
            fs.appendFileSync('./result.csv', row+ ';\n');
        }
    })
}

async function getReviewsFromPage(page) {
    return await page.evaluate(() => {
        const listReview = document.querySelectorAll('.reviews.user_reviews > li')
        return Array.from(listReview).map(review => {
            result = ''
            if (review.querySelector('.blurb.blurb_expanded')) {
                result = review.querySelector('.blurb.blurb_expanded') ?.innerText
            } else {
                result = review.querySelector('.review_body span') ?.innerText
            }
            if (result) {
                return result
            }
        })
    });
}

async function getPageUrl(url, platform, game) {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    const resPage = await page.goto(url);
    const status = resPage.status()

    
    let hasPage = null

    if (status === 200) {
        do {
            console.log(`==>${page.url()}`)
            const results = await getReviewsFromPage(page)
            appendResult(results, platform, url)

            hasPage = await page.$('.flipper.next > a.action')
            if (hasPage) {
                await page.click('.flipper.next > a.action')
                await page.waitForTimeout(10000);
            }
        } while (hasPage)
        await browser.close();
    } else {
        console.log(`404:${url}`)
    }

}

async function getReviews(){
    const platforms = [
        'pc',
        'xbox-one',
        'playstation-4',
    ]
    const games = [
        'cyberpunk-2077',
        'red-dead-redemption-2',
        'tony-hawks-pro-skater-1-+-2',
        'mortal-kombat-11-ultimate',
        'doom-eternal',
        'desperados-iii',
    ]

    if (!fs.existsSync('./result.csv')) {
        fs.appendFileSync('./result.csv', 'plataforma;url;review;\n');
    }
    if (!fs.existsSync('./games.csv')) {
        fs.appendFileSync('./games.csv', 'plataforma;jogo;url;nota;\n');
    }
    for (const game of games) {
        for (const platform of platforms) {
            const url = `${path}${platform}/${game}/user-reviews`
            try{
                console.log(`=> Main ${url}`)
                await getPageUrl(url, platform)
            }catch(e){
                console.error(`${url}:${e.message}`)
            }
            
        }
    }
}


function persistGames(games){

    for(const game of games){
        fs.appendFileSync('./games.csv', `${game.platform};${game.title};${game.link};${game.score};\n`);
    }

}
async function getGames(listPlatformGames){

    for(platformUrl of listPlatformGames){

        console.log('platformUrl', platformUrl)
        const browser = await puppeteer.launch({
            headless: true
        });
        const page = await browser.newPage();
        const resPage = await page.goto(platformUrl);
        const status = resPage.status()

        if (status === 200) {
            // 'table.clamp-list > tbody > tr:not([class])'
            // title .querySelector('.title > h3').innerText
            // score listGames[0].querySelector('.metascore_w.large').innerText
            // link .querySelector('.clamp-image-wrap > a').href

            const games = await page.evaluate(() => {
                const listGames = document.querySelectorAll('table.clamp-list > tbody > tr:not([class])')
                return Array.from(listGames).map(game => {
                    const title = game.querySelector('.title > h3').innerText
                    const score = game.querySelector('.metascore_w.large').innerText
                    const link = game.querySelector('.clamp-image-wrap > a').href
                    const platform = game.querySelector('.clamp-details > .platform > .data').innerText
                    return {
                        title,
                        score,
                        link,
                        platform
                    }
                })
            })
            persistGames(games)

        }

    }
    return 0
}

(async () => {
    
    const listPlatformGames = [
        'https://www.metacritic.com/browse/games/release-date/available/xboxone/metascore',
        'https://www.metacritic.com/browse/games/release-date/available/ps4/metascore',
        'https://www.metacritic.com/browse/games/release-date/available/pc/metascore',
    ]
    if (!fs.existsSync('./result.csv')) {
        fs.appendFileSync('./result.csv', 'plataforma;url;review;\n');
    }
    if (!fs.existsSync('./games.csv')) {
        fs.appendFileSync('./games.csv', 'plataforma;jogo;url;nota;\n');
    }
    //await getGames(listPlatformGames)
    
    fs.readFile('./games.csv', function (err, fileData) {
        parse(fileData, {columns: false, trim: true, header:false}, function(err, rows) {
            gamesList = rows
            console.log('rows', rows[0])
        })
    })
    

   
})();