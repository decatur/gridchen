window.onerror = function (evt) {
    // log.error(evt);
    log(evt);
};

export let positiveTestNames = []

let errCount = 0;

export function getErrorCount() {
    return errCount;
}

export function log(msg) {
    //log.log(msg);
    const div = document.createElement('div');
    div.style.marginLeft = '1em';
    div.textContent = msg;
    document.body.appendChild(div);
    return div;
}

function err(container, err) {
    console.log(err);
    const div = document.createElement('div');
    div.style.marginLeft = '1em';
    div.style.backgroundColor = '#faa';
    div.textContent = String(err);
    container.appendChild(div);
    errCount++;
}

export async function testAsync(msg, asyncFct) {
    const div = log(msg);
    try {
        await asyncFct();
    } catch(e) {
        //log.log(e);
        err(div, e);
    }
}

export function testSync(msg, syncFct) {
    if (positiveTestNames.length && !positiveTestNames.includes(msg)) {
        log('Skipping ' + msg);
        return
    }
    const div = log(msg);
    try {
        syncFct();
    } catch(e) {
        console.error(e);
        err(div, e);
    }
}

function error(a, b) {
    const err = Error('assertEqual failed');
    console.error(err);
    console.log('Expected ' + a);
    console.log('Actual ' + b);
    throw err;
}

function stringify(o) {
    return JSON.stringify(o, function(key, value) { return typeof value === 'number' && isNaN(value)?'NaN':value; })
}

function assertEqual(a, b) {

    if (a instanceof Date && b instanceof Date) {
        if (isNaN(a.getTime()) && isNaN(b.getTime())) {
            // pass
        } else if (a.getTime() !== b.getTime()) {
            error(a, b);
        }
    } else if (typeof a === 'object' && typeof b === 'object') {
        if (stringify(a) !== stringify(b)) {
            error(stringify(a), stringify(b));
        }
    } else {
        if (a !== b) {
            error(a, b);
        }
    }
}

export const assert = {
    equal: assertEqual
};