const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const puppeteer = require('puppeteer');
const { waitForSelectors } = require('./utils');

const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const updateIntervalInHours = 8;
let updateInterval = null;

async function getOathStatus() {
  const username = process.env.UCI;
  const password = process.env.PWD;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({"width":1280,"height":720});

  const promises = [];
  promises.push(page.waitForNavigation());
  await page.goto('https://cst-ssc.apps.cic.gc.ca/en/login');
  await Promise.all(promises);

  const usernameField = await waitForSelectors([["#uci-input"]], page);
  await usernameField.click();
  await usernameField.type(username);

  const passwordField = await waitForSelectors([["#password-input"]], page);
  await passwordField.click();
  await passwordField.type(password);

  const submitButton = await waitForSelectors([["#sign-in-submit-btn"]], page);
  await submitButton.click();

  let result = {};

  const oathStatus = await waitForSelectors([["ul.pl-0:nth-of-type(2) > li:nth-child(3) > details > summary > div:nth-of-type(1)"]], page); 
  const oathStatusText = await page.evaluate(el => el.textContent, oathStatus);
  result.status = oathStatusText;

  if (oathStatusText != "Not started") {
    const oathDescription = await waitForSelectors([["ul.pl-0:nth-of-type(2) > li:nth-child(3) > details > div"]], page); 
    const oathDescriptionText = await page.evaluate(el => el.textContent, oathDescription);
    result.description = oathDescriptionText;
  }

  await browser.close();
  return result;
}

function formatStatusMessage(status) {
  if (!status) {
    return null;
  }

  let msg = status.status;
  if (status.description) {
    msg += `\n\n${status.description}`;
  }

  return msg;
}

async function doUpdate() {
  try {
    const status = await getOathStatus();
    const msg = formatStatusMessage(status);
    await bot.telegram.sendMessage(process.env.TELEGRAM_USERID, msg);
  }
  catch (err) {
    console.error(err);
  }
}

function hoursToMs(hours) {
  return hours * 60 * 60 * 1000;
}

function scheduleUpdate() {
  updateInterval && clearInterval(updateInterval);
  updateInterval = setInterval(doUpdate, hoursToMs(updateIntervalInHours))
}

bot.use(async (ctx, next) => {
  const allowedUsers = [process.env.TELEGRAM_USERID];
  const id = ctx.chat.id.toString();

  if (allowedUsers.indexOf(id) < 0) {
      ctx.replyWithMarkdown(`🛑 Sorry, you are not authorized to use this bot! (${id})`);
  }
  else {
      await next();
  }
});

bot.start(ctx => {
  const id = ctx.chat.id.toString();
  const name = ctx.chat.type == 'private' ? ctx.chat.first_name : ctx.chat.title;

  ctx.replyWithMarkdown(`👋 Hey there, ${name} (${id})!`);
});

bot.command('get', doUpdate);

bot.launch();
scheduleUpdate();