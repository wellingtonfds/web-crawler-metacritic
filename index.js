const puppeteer = require('puppeteer');
const fs = require('fs');

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

function appendResult(results, platform, game) {
    results.map(result => {
        const text = sanitizeText(result)
        if(text){
            const row = `${platform};${game};${text}`
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
            appendResult(results, platform, game)

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

(async () => {
    const path = "https://www.metacritic.com/game/"
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
        fs.appendFileSync('./result.csv', 'platform;game;review;\n');
    }
    for (const game of games) {
        for (const platform of platforms) {
            const url = `${path}${platform}/${game}/user-reviews`
            try{
                console.log(`=> Main ${url}`)
                await getPageUrl(url, platform, game)
            }catch(e){
                console.error(`${url}:${e.message}`)
            }
            
        }
    }
})();