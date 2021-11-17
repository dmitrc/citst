const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs/promises');
const { formatUtcDate, dateEquals, log, error } = require('./utils');

const sheetId = '1U27V95kWlCVYWB0zye7DvqoXSkyqxgbA31eEJ_TKO6Y';
const desiredLocations = ['vancouver'];
const validSheetNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November'];
const cols = {
    ID: 0,
    LOC: 1,
    TYPE: 2,
    PRES: 3,
    SENT: 4,
    RECV: 5,
    AOR: 6,
    INPR: 7,
    TESTINV: 8,
    TEST: 9,
    DM: 10,
    OATHINV: 11,
    OATH: 12,
    NOTES: 13
};

const cachedEntriesFileName = 'entries.json';
let cachedEntries = null;

function toDate(date) {
    if (!date) return null;
    return new Date(Math.round((date - 25569)*86400*1000));
}

function getRow(sheet, rowId) {
    if (!sheet) return null;
    return {
        id: sheet.getCell(rowId, cols.ID).value,
        location: sheet.getCell(rowId, cols.LOC).value,
        type: sheet.getCell(rowId, cols.TYPE).value,
        presence: sheet.getCell(rowId, cols.PRES).value,
        sent: toDate(sheet.getCell(rowId, cols.SENT).value),
        received: toDate(sheet.getCell(rowId, cols.RECV).value),
        aor: toDate(sheet.getCell(rowId, cols.AOR).value),
        inProcess: toDate(sheet.getCell(rowId, cols.INPR).value),
        testInvite: toDate(sheet.getCell(rowId, cols.TESTINV).value),
        test: toDate(sheet.getCell(rowId, cols.TEST).value),
        dm: toDate(sheet.getCell(rowId, cols.DM).value),
        oathInvite: toDate(sheet.getCell(rowId, cols.OATHINV).value),
        oath: toDate(sheet.getCell(rowId, cols.OATH).value),
        notes: sheet.getCell(rowId, cols.NOTES).value
    }
}

function rowToItem(row) {
    if (!row) return null;

    const res = {
        name: row.id,
        startDate: row.received,
        status: "Unknown",
        statusDate: null
    };

    if (row.oath) {
        res.status = "Oath";
        res.statusDate = row.oath;
    }
    else if (row.oathInvite) {
        res.status = "Oath invite";
        res.statusDate = row.oathInvite;
    }
    else if (row.dm) {
        res.status = "DM";
        res.statusDate = row.dm;
    }
    else if (row.test) {
        res.status = "Test";
        res.statusDate = row.test;
    }
    else if (row.testInvite) {
        res.status = "Test invite";
        res.statusDate = row.testInvite;
    }
    else if (row.inProcess) {
        res.status = "In process";
        res.statusDate = row.inProcess;
    }
    else if (row.aor) {
        res.status = "AOR";
        res.statusDate = row.aor;
    }
    else if (row.received) {
        res.status = "Received";
        res.statusDate = row.received;
    }
    else if (row.sent) {
        res.status = "Sent";
        res.statusDate = row.sent;
    }

    return res;
}

async function getEntries(apiKey) {
    if (!apiKey) return;
    log(`running forum entries update`);

    const doc = new GoogleSpreadsheet(sheetId);
    doc.useApiKey(apiKey);
    await doc.loadInfo();

    const rows = [];

    for (const sheetName of validSheetNames) {
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) continue;

        await sheet.loadCells();

        for (let i = 3; i < sheet.rowCount; ++i) {
            var location = sheet.getCell(i, cols.LOC).value || "";
            if (desiredLocations.indexOf(location.toLowerCase()) >= 0) {
                rows.push(getRow(sheet, i));
            }
        }
    }

    const items = rows.map(x => rowToItem(x));
    return items;
}

async function exportEntries(items) {
    if (!items || items.length == 0) return;

    cachedEntries = items;
    try {
        const jsonString = JSON.stringify(items);
        await fs.writeFile(cachedEntriesFileName, jsonString);

        return true;
    }
    catch (err) {
        return false;
    }
}

async function importEntries() {
    try {
        const jsonString = await fs.readFile(cachedEntriesFileName);
        const items = JSON.parse(jsonString);

        for (const item of items) {
            if (item.startDate) {
                item.startDate = new Date(item.startDate);
            }
            if (item.statusDate) {
                item.statusDate = new Date(item.statusDate);
            }
        }

        cachedEntries = items;
        return true;
    }
    catch (err) {
        return false;
    }
}

async function importOrGetEntries(apiKey) {
    const didImport = await importEntries();
    if (!didImport) {
        try {
            const items = await getEntries(apiKey);
            await exportEntries(items);
        }
        catch (err) {
            error(err);
        }
    }
    return cachedEntries;
}

function getByName(container, name) {
    for (const item of container) {
        if (item.name == name) {
            return item;
        }
    }
    
    return null;
}

async function getEntriesDiff(apiKey) {
    if (cachedEntries == null) {
        return [];
    }

    const updatedEntries = await getEntries(apiKey);
    const diff = [];

    for (const newItem of updatedEntries) {
        const oldItem = getByName(cachedEntries, newItem.name);
        if (!oldItem || newItem.status != oldItem.status || !dateEquals(newItem.statusDate, oldItem.statusDate)) {
            diff.push({
                name: newItem.name,
                startDate: newItem.startDate || 'N/A',
                oldStatus: oldItem && oldItem.status || 'N/A',
                oldStatusDate: oldItem && oldItem.statusDate || 'N/A',
                newStatus: newItem.status || 'N/A',
                newStatusDate: newItem.statusDate || 'N/A'
            });
        }
    }

    await exportEntries(updatedEntries);

    log(`finished forum entries diff (${diff.length})`);
    return diff;
}

function formatDiffMessage(diff) {
    let msg = "Forum updates:";
    
    for (const item of diff) {
        msg += `\n\n${item.name} (${formatUtcDate(item.startDate)})`;
        msg += `\nFrom: ${item.oldStatus} (${formatUtcDate(item.oldStatusDate)})`;
        msg += `\nTo: ${item.newStatus} (${formatUtcDate(item.newStatusDate)})`;
    }

    return msg;
}

function formatLatestMessage(items, limit = 99) {
    if (!items) return null;

    const latestItems = items.filter(x => !!x.statusDate)
    latestItems.sort((a, b) => new Date(b.statusDate) - new Date(a.statusDate));

    let msg = '';

    const endIndex = Math.min(limit, latestItems.length);
    for (let i = 0; i < endIndex; ++i) {
        const x = latestItems[i];
        msg += `${x.name} (${formatUtcDate(x.startDate)}) - ${x.status} (${formatUtcDate(x.statusDate)})\n`;
    }

    return msg;
}

module.exports = {
    importOrGetEntries,
    getEntriesDiff,
    formatDiffMessage,
    formatLatestMessage
};