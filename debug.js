const { importOrGetEntries } = require('./forum');
const { formatDate } = require('./utils');

async function init() {
    const raw = await importOrGetEntries();

    const items = raw
        .filter(x => !!x.statusDate)
        .sort((a, b) => b.statusDate - a.statusDate);

    for (const i of items) {
        console.log(`${i.name} (${formatDate(i.startDate)}) - ${i.status} (${formatDate(i.statusDate)})`);
    }
}

init();