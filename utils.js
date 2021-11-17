function formatDate(date) {
    if (!date) return null;
    return date.toLocaleString('en-gb', {
        day: 'numeric',
        year: 'numeric',
        month: 'short'
    });
}

function formatUtcDate(date) {
    if (!date) return null;
    return date.toLocaleString('en-gb', {
        day: 'numeric',
        year: 'numeric',
        month: 'short',
        timeZone: 'UTC'
    });
}

function dateEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    else if (!a || !b) {
        return false;
    }
    else {
        return a.getTime() == b.getTime();
    }
}

function time() {
    const now = new Date();

    const hrs = `${now.getHours()}`.padStart(2, '0');
    const mins = `${now.getMinutes()}`.padStart(2, '0');
    const secs = `${now.getSeconds()}`.padStart(2, '0');

    return `[${hrs}:${mins}:${secs}]`;
}

function log(msg) {
    console.log(`${time()} ${msg}`);
}

function error(msg) {
    console.error(`${time()} ${msg}`);
}

module.exports = {
    formatDate,
    formatUtcDate,
    dateEquals,
    log,
    error
};