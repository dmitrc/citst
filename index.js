const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const puppeteer = require('puppeteer');
const { waitForSelector, getElementText } = require('./utils');

const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const updateHours = [8, 20];
let updateInterval = null;

async function getStatus() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: 1280,height: 720 });

  const promises = [];
  promises.push(page.waitForNavigation());
  await page.goto('https://cst-ssc.apps.cic.gc.ca/en/login');
  await Promise.all(promises);

  const usernameField = await waitForSelector(["#uci-input"], page);
  await usernameField.click();
  await usernameField.type(process.env.UCI);

  const passwordField = await waitForSelector(["#password-input"], page);
  await passwordField.click();
  await passwordField.type(process.env.PWD);

  const submitButton = await waitForSelector(["#sign-in-submit-btn"], page);
  await submitButton.click();

  let result = {};

  result.lastUpdated = await getElementText(["dl > dd > time"], page);
  result.status = await getElementText(["div.mt-5 > p > strong"], page);
  result.language = await getElementText(["ul.pl-0:nth-of-type(1) > li:nth-child(1) > details > summary > div:nth-of-type(1)"], page);
  result.presence = await getElementText(["ul.pl-0:nth-of-type(1) > li:nth-child(2) > details > summary > div:nth-of-type(1)"], page);
  result.test = await getElementText(["ul.pl-0:nth-of-type(1) > li:nth-child(3) > details > summary > div:nth-of-type(1)"], page);
  result.background = await getElementText(["ul.pl-0:nth-of-type(2) > li:nth-child(1) > details > summary > div:nth-of-type(1)"], page);
  result.prohibitions = await getElementText(["ul.pl-0:nth-of-type(2) > li:nth-child(2) > details > summary > div:nth-of-type(1)"], page);
  result.oath = await getElementText(["ul.pl-0:nth-of-type(2) > li:nth-child(3) > details > summary > div:nth-of-type(1)"], page);

  await page.close();
  await browser.close();

  return result;
}

function getNextStage(status) {
  if (!status) {
    return null;
  }

  if (status.background != "Completed") {
    return {
      name: "Background",
      status: status.background
    };
  }
  else if (status.test != "Completed") {
    return {
      name: "Test",
      status: status.test
    };
  }
  else if (status.presence != "Completed") {
    return {
      name: "DM",
      status: status.presence
    };
  }
  else if (status.oath != "Completed") {
    return {
      name: "Oath",
      status: status.oath
    };
  }

  return {
    name: "N/A",
    status: status.status
  };
}

function formatStatusMessage(status) {
  if (!status) {
    return null;
  }

  const nextStage = getNextStage(status);

  let msg = `Last updated: ${status.lastUpdated}\n`;
  msg += `Next step: ${nextStage.name}\n`;
  msg += `Status: ${nextStage.status}`;

  return msg;
}

async function doUpdate() {
  try {
    const status = await getStatus();
    console.log(status);
    const msg = formatStatusMessage(status);
    await bot.telegram.sendMessage(process.env.TELEGRAM_USERID, msg);
  }
  catch (err) {
    console.error(err);
  }
}

function scheduleUpdate() {
  updateInterval && clearInterval(updateInterval);
  updateInterval = setInterval(async () => {
    const hourNow = new Date().getHours();
    if (updateHours.indexOf(hourNow) >= 0) {
      await doUpdate();
    }
  }, 60 * 60 * 1000)
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