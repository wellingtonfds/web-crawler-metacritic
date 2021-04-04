const puppeteer = require('puppeteer');
const fs = require('fs');

function sanitizeText(text) {
    if (text) {
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
        if (text) {
            const row = `${platform};${url};${text}`
            fs.appendFileSync('./result.csv', row + ';\n');
        }
    })
}

async function getReviewsFromPage(page) {
    return await page.evaluate(() => {
        const listReview = document.querySelectorAll('.reviews.user_reviews > li')
        return Array.from(listReview).map(review => {
            result = ''
            if (review.querySelector('.blurb.blurb_expanded')) {
                result = review.querySelector('.blurb.blurb_expanded')?.innerText
            } else {
                result = review.querySelector('.review_body span')?.innerText
            }
            if (result) {
                return result
            }
        })
    });
}

async function getPageUrl(data) {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    const resPage = await page.goto(`${data.url}/user-reviews`);
    const status = resPage.status()


    let hasPage = null
    const limiteReviews = 250
    let contReviews = 0;
    if (status === 200) {
        do {
            console.log(`==>${page.url()}`)
            const results = await getReviewsFromPage(page)
            contReviews += results?.length || 0
            appendResult(results, data.platform, data.url)

            hasPage = await page.$('.flipper.next > a.action')
            if (hasPage && contReviews < limiteReviews) {
                await page.click('.flipper.next > a.action')
                await page.waitForTimeout(10000);
            } else{
                hasPage = null
            }
        } while (hasPage)
        await browser.close();
    } else {
        console.log(`404:${url}`)
    }

}

async function getReviews(data) {
    try {
        console.log(`=> Main ${data?.url}`)
        await getPageUrl(data)
    } catch (e) {
        console.error(`${data?.url}:${e.message}`)
    }
}



function persistGames(games) {

    for (const game of games) {
        fs.appendFileSync('./games.csv', `${game.platform};${game.title};${game.link};${game.score};\n`);
    }

}
async function getGames(listPlatformGames) {

    for (platformUrl of listPlatformGames) {

        console.log('platformUrl', platformUrl)
        const browser = await puppeteer.launch({
            headless: true
        });
        const page = await browser.newPage();
        const resPage = await page.goto(platformUrl);
        const status = resPage.status()

        if (status === 200) {
          
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
        await getGames(listPlatformGames)
        fs.appendFileSync('./games.csv', 'plataforma;jogo;url;nota;\n');
    }
    
    fs.readFile('games.csv', 'utf8', async function (err, data) {
        var dataArray = data.split(/\,?\n/).slice(1);
        for(const game of dataArray){
            const gameData = game.split(';');
            const dataObject = {
                url:gameData[2],
                game:gameData[1],
                platform:gameData[0],
                score:gameData[3]
            }
            await getReviews(dataObject)

        }
    });
    

})();