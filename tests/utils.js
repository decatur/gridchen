/*window.onerror = function (e) {
    htmlLog(String(window.event.error));
};*/

let currentDiv = document.createElement('div');
document.body.appendChild(currentDiv);

function htmlLog(msg) {
    console.log(msg);
    const div = document.createElement('div');
    div.style.marginLeft = '1em';
    div.textContent = msg;
    currentDiv.appendChild(div);
    currentDiv = div;
}

function errLog(err) {
    console.log(err);
    const div = document.createElement('div');
    div.textContent = String(err);
    currentDiv.appendChild(div);
}

export function assertEqual(a, b) {
    function log(aString, bString) {
        console.log('Expected ' + aString);
        console.log('Actual ' + bString);
        throw Error('assertEqual failed');
    }

    if (a instanceof Date || b instanceof Date) {
        if (isNaN(a.getTime()) && isNaN(b.getTime())) {
            // pass
        } else if (a.getTime() !== b.getTime()) {
            log(a, b);
        }
    } else if (typeof a === 'object') {
        if (JSON.stringify(a) !== JSON.stringify(b)) {
            log(JSON.stringify(a), JSON.stringify(b));
        }
    } else {
        if (a !== b) {
            log(a, b);
        }
    }
}

export function describe(description, fct) {
    htmlLog(description);
    try {
        fct();
    } catch (e) {
        errLog(e);
    }
    currentDiv = currentDiv.parentElement;
}

export function it(description, fct) {
    htmlLog(description);
    try {
        fct();
    } catch (e) {
        errLog(e);
    }
    currentDiv = currentDiv.parentElement;
}

export const assert = {
    equal: assertEqual
};