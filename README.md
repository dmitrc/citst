# What is this all about?

This tool automates checking the [Canadian citizenship status tracker](https://cst-ssc.apps.cic.gc.ca/en/login), as well as shared spreadsheet updates from [CanadaVisa forums](https://www.canadavisa.com/canada-immigration-discussion-board/forums/citizenship.12/) via a Telegram bot.

# Prerequisites

* Node.js v14+

* Chrome/Chromium

* Telegram account

# Getting started

* Clone the repository
  
* Run `npm install` or `yarn`
  
* Copy `.env.example` to `.env`
  
* Configure (see below)
  
* Run: `node index.js`
  * Extra memory might help as spreadsheet is huge: `--max_old_space_size=4096`
  * You can use `pm2` or other similar tool to run as daemon

# Configuration

## TELEGRAM_TOKEN

Contact [@BotFather](https://t.me/BotFather) on Telegram and run `/newbot`.

## TELEGRAM_USERID

Contact [@userinfobot](https://t.me/userinfobot) on Telegram to get your ID.

## UCI / PWD

Use the credentials from [Citizenship Status Tracker](https://cst-ssc.apps.cic.gc.ca/en/login).<br>
These will be used to login to portal on your behalf via headless instance of Chrome and scrape the application status from the page.

If left blank, the application status update logic will be disabled.

## SHEETS_API_KEY

Follow [API Key instructions](https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication?id=api-key).<br>
If left blank, the forum updates logic will be disabled.

## List of tracked cities

Update the `desiredLocations` constant in `forum.js` (defaults to Vancouver only).

## Spreadsheet info

Update the `sheetId` constant in `forum.js` (defaults to [2020](https://docs.google.com/spreadsheets/d/1U27V95kWlCVYWB0zye7DvqoXSkyqxgbA31eEJ_TKO6Y) spreadsheet).

Note that you might also need to update `validSheetNames` and `cols` accordingly depending on the structure of the spreadsheet you've supplied.

## Update times

Update the `statusUpdateHours` and `sheetsUpdateHours` constants in `index.js`.

By default:

  * Application status updates at 08:00, 14:00, 20:00.
  
  * Forum spreadsheet updates every 2 hours from 07:00 to 23:00 (inclusive).

# Usage

* You will get application status messages automatically (or `/get` for manual):

  > Oath: Not started<br>
  > Last updated: Sep 1 2021

* You will get forum update messages automatically (or `/diff` for manual):

  > Forum updates:
  > 
  > username (10 Jan 2020)<br>
  > From: DM (1 Oct 2021)<br>
  > To: Oath (1 Dec 2021)<br>

* Use `/latest` to get last 10 forum updates sorted by descending dates:

  > username1 (10 Jan 2020) - Oath (1 Dec 2021)<br>
  > username2 (5 Feb 2020) - DM (15 Nov 2021)<br>
  > username3 (1 Apr 2020) - In process (1 Sep 2021)<br>
  > ...

* Use `/hist {username}` to get the full spreadsheet row for a forum member:

   > username (Vancouver / Single)
   >
   > Sent: 1 Apr 2020<br>
   > Received: 7 Apr 2020<br>
   > AOR: 1 Oct 2020<br>
   > In Process: 1 Dec 2020<br>
   > Test Invite: 1 Aug 2021<br>
   > Test: 7 Aug 2021<br>
   > DM: 1 Nov 2021<br>
   > Oath Invite: N/A<br>
   > Oath: N/A

# Disclaimer

This code is provided as-is and I will hold no liability for any issues that arise as the results of running these scripts. Be sure to always double-check everything you're trusting with your credentials, especially as sensitive as these.

This project is not endorsed by and not associated in any way with Citizenship and Immigration Canada or any other government entity.
