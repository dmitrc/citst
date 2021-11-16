const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const puppeteer = require('puppeteer');
const { getSelectorText, getElementText, getSelectorTime, getElementTime, formatDate } = require('./utils');

const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const updateHours = [8, 20];
let updateInterval = null;

const CST_URL = "https://cst-ssc.apps.cic.gc.ca/en/login";
const USERNAME_FIELD = "#uci-input";
const PASSWORD_FIELD = "#password-input";
const SUBMIT_BUTTON = "#sign-in-submit-btn";
const LAST_UPDATED = "dl > dd > time";
const APP_STATUS = "div.mt-5 > p > strong";

function getPartialStatusSelector(col, row) {
  return `ul.pl-0:nth-of-type(${col}) > li:nth-child(${row}) > details > summary > div:nth-of-type(1)`;
}

const LANG_STATUS = getPartialStatusSelector(1, 1);
const PRESENCE_STATUS = getPartialStatusSelector(1, 2);
const TEST_STATUS = getPartialStatusSelector(1, 3);
const BG_STATUS = getPartialStatusSelector(2, 1);
const PROHIBIT_STATUS = getPartialStatusSelector(2, 2);
const OATH_STATUS = getPartialStatusSelector(2, 3);

const HISTORY_ITEMS = "section.mt-13 > ul > li";
const HISTORY_ITEM_DATE = "p.col-span-1 > time";
const HISTORY_ITEM_TITLE = "h3";
const HISTORY_ITEM_CAT = "p.font-light";
const HISTORY_ITEM_DESC = "div.p-0";

async function getStatus() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: 1280,height: 720 });

  const promises = [];
  promises.push(page.waitForNavigation());
  await page.goto(CST_URL);
  await Promise.all(promises);

  const usernameField = await page.waitForSelector(USERNAME_FIELD);
  await usernameField.click();
  await usernameField.type(process.env.UCI);

  const passwordField = await page.waitForSelector(PASSWORD_FIELD);
  await passwordField.click();
  await passwordField.type(process.env.PWD);

  const submitButton = await page.waitForSelector(SUBMIT_BUTTON);
  await submitButton.click();

  let result = {};

  const lastUpdatedString = await getSelectorTime(LAST_UPDATED, page);
  result.lastUpdated = new Date(lastUpdatedString);

  result.status = await getSelectorText(APP_STATUS, page);
  result.language = await getSelectorText(LANG_STATUS, page);
  result.presence = await getSelectorText(PRESENCE_STATUS, page);
  result.test = await getSelectorText(TEST_STATUS, page);
  result.background = await getSelectorText(BG_STATUS, page);
  result.prohibitions = await getSelectorText(PROHIBIT_STATUS, page);
  result.oath = await getSelectorText(OATH_STATUS, page);

  result.history = [];

  // TODO: Press "see more" button to fetch more than 5 items
  const historyEls = await page.$$(HISTORY_ITEMS);

  for (const historyEl of historyEls) {
    const dateElement = await historyEl.$(HISTORY_ITEM_DATE);
    const dateText = await getElementTime(dateElement, page);
    if (!dateText) continue;

    const titleElement = await historyEl.$(HISTORY_ITEM_TITLE);
    const titleText = await getElementText(titleElement, page);
    if (!titleText) continue;

    const categoryElement = await historyEl.$(HISTORY_ITEM_CAT);
    const categoryText = await getElementText(categoryElement, page);

    const descriptionElement = await historyEl.$(HISTORY_ITEM_DESC);
    const descriptionText = await getElementText(descriptionElement, page);

    result.history.push({
      date: new Date(dateText),
      title: titleText,
      category: categoryText,
      description: descriptionText
    });
  }

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

  let msg = `Last updated: ${formatDate(status.lastUpdated)}\n`;
  msg += `Next step: ${nextStage.name}\n`;
  msg += `Status: ${nextStage.status}`;

  const now = new Date();
  for (const historyItem of status.history) {
    if (now - historyItem.date < 24 * 60 * 60 * 1000) {
      msg += `\n\n[Update from ${formatDate(historyItem.date)}]\n${historyItem.description}`;
    }
  }

  return msg;
}

async function doUpdate() {
  try {
    const status = await getStatus();
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