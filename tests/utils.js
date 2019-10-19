window.onerror = function (evt) {
    // log.error(evt);
    log(evt);
};

let errCount = 0;

export function getErrorCount() {
    return errCount;
}

/**
 * @param {string|HTMLElement} content
 * @returns {HTMLDivElement}
 */
export function log(content) {
    const div = document.createElement('div');
    div.style.marginLeft = '1em';
    if (content instanceof HTMLElement) {
        div.appendChild(content);
    } else {
        div.textContent = String(content);
    }
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

async function testAsync(msg, asyncFct) {
    const a = document.createElement('a');
    const moduleName = new URLSearchParams(window.location.search).get('module');
    a.href = `testrunner.html?module=${moduleName}&test=${msg}`;
    a.textContent = msg;
    const div = log(a);

    console.log(`${msg}...`);
    try {
        await asyncFct();
    } catch(e) {
        //log.log(e);
        err(div, e);
    }
    console.log(`...${msg}`);
}

let scopePrefix = '';

export function scope(msg, func) {
    console.log(`Scope ${msg}...`);
    scopePrefix = msg;
    func();  // No error handling here because we are still in test recovery phase.
    scopePrefix = '';
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

/** @type {[string, function][]} */
const tests = [];

export function test(desc, func) {
    tests.push([scopePrefix + '/' + desc, func]);
}

export async function execute(onlyMsg) {
    for (let test of tests) {
        if (onlyMsg == null || onlyMsg === test[0]) {
            await testAsync(test[0], test[1]);
        }
    }
}
