const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const { getStatus, formatStatusMessage } = require('./status');
const { importOrGetEntries, getEntriesDiff, formatDiffMessage, formatLatestMessage } = require('./forum');
const { log, error } = require('./utils');

const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const statusUpdateHours = [8, 14, 20];
const sheetsUpdateHours = [7, 9, 11, 13, 15, 17, 19, 21, 23];

async function doStatusUpdate() {
  try {
    const status = await getStatus(process.env.UCI, process.env.PWD);
    if (status) {
      const msg = formatStatusMessage(status);
      await bot.telegram.sendMessage(process.env.TELEGRAM_USERID, msg);
    }
  }
  catch (err) {
    error(err);
  }
}

async function doSheetsUpdate() {
  try {
    const diff = getEntriesDiff(process.env.SHEETS_API_KEY);
    if (diff && diff.length > 0) {
      const msg = formatDiffMessage(diff);
      await bot.telegram.sendMessage(process.env.TELEGRAM_USERID, msg);
    }
  }
  catch (err) {
    error(err);
  }
}

async function doUpdate() {
  const hourNow = new Date().getHours();

  if (statusUpdateHours.indexOf(hourNow) >= 0) {
    await doStatusUpdate();
  }

  if (sheetsUpdateHours.indexOf(hourNow) >= 0) {
    await doSheetsUpdate();
  }
}

function scheduleUpdate() {
  const timeToNearestHour = 60 - new Date().getMinutes();
  log(`scheduling update loop to start in ${timeToNearestHour} minutes`);

  setTimeout(() => {
    setInterval(async () => {
      await doUpdate();
    }, 60 * 60 * 1000);
  }, timeToNearestHour * 60 * 1000);
}

async function doLatest(ctx) {
  try {
    log(`getting latest items`);
    const items = await importOrGetEntries(process.env.SHEETS_API_KEY);
    const msg = formatLatestMessage(items, 10);
    ctx.replyWithMarkdown(msg);
  }
  catch (err) {
    error(err);
  }
}

bot.use(async (ctx, next) => {
  const allowedUsers = [process.env.TELEGRAM_USERID];
  const id = ctx.chat.id.toString();

  if (allowedUsers.indexOf(id) < 0) {
      log(`unauthorized msg request from ${id}`);
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

bot.command('get', doStatusUpdate);
bot.command('diff', doSheetsUpdate);
bot.command('latest', doLatest);

async function init() {
  await bot.launch();
  await importOrGetEntries(process.env.SHEETS_API_KEY);
  scheduleUpdate();
}

init();