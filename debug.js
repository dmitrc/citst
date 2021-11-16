const { importOrGetEntries } = require('./forum');
const { formatUtcDate } = require('./utils');

async function init() {
    let items = await importOrGetEntries();

    items = items.filter(x => !!x.statusDate)
    items.sort((a, b) => new Date(b.statusDate) - new Date(a.statusDate));

    for (const i of items) {
        console.log(`${i.name} (${formatUtcDate(i.startDate)}) - ${i.status} (${formatUtcDate(i.statusDate)})`);
    }
}

init();