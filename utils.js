async function getSelectorText(selector, frame) {
    try {
        const element = await frame.waitForSelector(selector);
        return getElementText(element, frame);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}

async function getElementText(element, frame) {
    if (!frame || !element) {
        return null;
    }

    return await frame.evaluate(el => el.textContent, element);
}

async function getSelectorTime(selector, frame) {
    try {

        const element = await frame.waitForSelector(selector);
        return getElementTime(element, frame);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}

async function getElementTime(element, frame) {
    if (!frame || !element) {
        return null;
    }

    return await frame.evaluate(el => el.getAttribute('datetime'), element);
}

function formatDate(date) {
    return date.toLocaleString('en-gb', {
        day: 'numeric',
        year: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric'
    });
}

module.exports = {
    getSelectorText,
    getElementText,
    getSelectorTime,
    getElementTime,
    formatDate
}