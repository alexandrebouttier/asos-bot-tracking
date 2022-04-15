const cron = require('node-cron');
const puppeteer = require('puppeteer');
const cmlog = require('cmlog');

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const _ = require('lodash');

const randomUseragent = require('random-useragent');

const data = require('./config.json');

async function getArticle(link) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setDefaultTimeout(10000);
  await page.setViewport({ width: 1025, height: 768 });
  await page.setUserAgent(randomUseragent.getRandom());

  await page.goto(link, { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('.asos-product .product-hero h1');
  /*   await page.waitForSelector('.asos-product .product-price .current-price');
  await page.waitForSelector(
    '.asos-product .product-price .product-discount-percent'
  );
  await page.waitForSelector('h3.product-out-of-stock-label'); */

  const result = await page.evaluate(() => {
    let article = document.querySelector(
      '.asos-product .product-hero h1'
    ).innerText;

    let prix = document.querySelector(
      '.asos-product .product-price .current-price'
    ).innerText;

    let promotion = document.querySelector(
      '.asos-product .product-price .product-discount-percent'
    ).innerText;

    let notStock = document.querySelector(
      'h3.product-out-of-stock-label'
    ).innerText;

    return { article, prix, promotion, notStock };
  });

  await browser.close();
  return result;
}

cmlog.success(`BOT DEMARER`);

function start() {
  return _.map(data.favorites, (f) => {
    return getArticle(f.link).then((res) => {
      if (res.notStock) {
        cmlog.warn(`${res.article} : Article plus en stock !`);

        logger.info(`${res.article} : Article plus en stock !`);
      } else {
        if (res.promotion) {
          cmlog.success(
            `[PROMOTION] ${res.article} : Prix: ${res.prix} , Promotion: ${
              res.promotion || ' Aucune !'
            }`
          );
          logger.info(
            `[PROMOTION] ${res.article} : Prix: ${res.prix} , Promotion: ${
              res.promotion || ' Aucune !'
            }`
          );
        } else {
          cmlog.info(
            `${res.article} : Prix: ${res.prix} , Promotion: ${
              res.promotion || ' Aucune !'
            }`
          );
          logger.info(
            `${res.article} : Prix: ${res.prix} , Promotion: ${
              res.promotion || ' Aucune !'
            }`
          );
        }
      }
    });
  });
}

cron.schedule('* * * * *', () => {
  start();
});
