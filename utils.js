function formatDate(date) {
    return date.toLocaleString('en-gb', {
        day: 'numeric',
        year: 'numeric',
        month: 'short'
    });
}

function time() {
    const now = new Date();
    return `[${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}]`;
}

function log(msg) {
    console.log(`${time()} ${msg}`);
}

function error(msg) {
    console.error(`${time()} ${msg}`);
}

module.exports = {
    formatDate,
    log,
    error
};