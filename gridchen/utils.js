/**
 * Author: Wolfgang Kühn 2019-2021
 * Source located at https://github.com/decatur/grid-chen/gridchen
 *
 * Module implementing, well, utilities.
 */

//@ts-check

// const DEBUG = (location.hostname === 'localhost');
const DEBUG = false;

// window.addEventListener('error', evt => {
//     console.log(evt);
// });

/**
 * @param {HTMLElement} element
 * @param {function(evt: Event)} func
 * @returns {function(evt: Event)}
 */
export function wrap(element, func) {
    return function (evt) {
        try {
            func(evt);
        } catch (e) {
            console.error(e);
            const div = document.createElement('div');
            div.style.fontSize = 'large';
            div.textContent = '🙈 Oops, grid-chen has experienced an unexpected error: ' + e.message;
            let root = element.tagName === 'GRID-CHEN' ? element.shadowRoot : element.getRootNode();
            root.textContent = '';
            root.appendChild(div);
        }
    }
}

function pad(v) {
    return String(v).padStart(2, '0');
}

/**
 * @param {string} period
 * @returns {number}
 */
export function resolvePeriod(period) {
    const index = ['YEARS', 'MONTHS', 'DAYS', 'HOURS', 'MINUTES', 'SECONDS', 'MILLISECONDS'].indexOf(period.toUpperCase());
    if (index === -1) {
        throw new RangeError('Invalid period: ' + period);
    }
    return index;
}

const MONTHS = resolvePeriod('MONTHS');
const DAYS = resolvePeriod('DAYS');
const HOURS = resolvePeriod('HOURS');
const MINUTES = resolvePeriod('MINUTES');
const SECONDS = resolvePeriod('SECONDS');

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toUTCDateString(d, period) {
    let s = pad(d.getUTCFullYear());
    if (period >= MONTHS) {
        s += '-' + pad(1 + d.getUTCMonth());
    }
    if (period >= DAYS) {
        s += '-' + pad(d.getUTCDate());
    }
    return s
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toUTCDatePartialTimeString(d, period) {
    let s = toUTCDateString(d, period);
    if (period >= HOURS) {
        // We use space, not 'T' as time separator to apeace MS-Excel.
        s += ' ' + toUTCTimeString(d, period);
    }
    return s;
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
function toUTCTimeString(d, period) {
    let s = pad(d.getUTCHours());
    if (period >= MINUTES) {
        s += ':' + pad(d.getUTCMinutes());
    }
    if (period >= SECONDS) {
        s += ':' + pad(d.getUTCSeconds());
    }
    if (period > SECONDS) {
        s += '.' + String(d.getUTCMilliseconds()).padStart(3, '0');
    }
    return s;
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
function toTimeString(d, period) {
    let s = pad(d.getHours());
    if (period >= MINUTES) {
        s += ':' + pad(d.getMinutes());
    }
    if (period >= SECONDS) {
        s += ':' + pad(d.getSeconds());
    }
    if (period > SECONDS) {
        s += '.' + String(d.getMilliseconds()).padStart(3, '0');
    }
    return s;
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toUTCDateTimeString(d, period) {
    let s = toUTCDatePartialTimeString(d, period);
    return s + 'Z';
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toLocalISODateString(d, period) {
    let s = pad(d.getFullYear());
    if (period >= MONTHS) {
        s += '-' + pad(1 + d.getMonth());
    }
    if (period >= DAYS) {
        s += '-' + pad(d.getDate());
    }

    return s
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toLocaleISODateTimeString(d, period) {
    let s = toLocalISODateString(d, period);
    if (period >= HOURS) {
        // We use space, not 'T' as time separator to apeace MS-Excel.
        s += ' ' + toTimeString(d, period);
    }
    let dh = d.getHours() - d.getUTCHours();
    if (dh < 0) dh += 24;
    return s + '+' + pad(String(dh)) + ':00';
}

const localeDateParsers = {};

/**
 * @param {string} locale
 * @returns {GridChenNS.LocalDateParser}
 */
export function localeDateParser(locale) {
    if (!(locale in localeDateParsers)) {
        localeDateParsers[locale] = createLocalDateParser(locale);
    }
    return localeDateParsers[locale];
}

/**
 * @param {number[]} a
 * @returns {boolean}
 */
function someNaN(a) {
    return a.some((v) => isNaN(v))
}

/**
 * The created parser can parse full dates, dates with partial time, or date times in specified locale or as ISO.
 * @param {string} locale
 * @returns {LocalDateParser}
 */
function createLocalDateParser(locale) {
    // We do not want to use the Date constructor because
    // * it is a very loose parser
    // * the time zone information is lost.

    // We only support numeric year-month-day formats.
    const options = {year: 'numeric', month: 'numeric', day: 'numeric'};
    const dtf = Intl.DateTimeFormat(locale, options);
    const testDate = dtf.format(Date.UTC(2019, 0, 17));
    // -> depends on locale, examples are 17.1.2019, 1/17/2019, 17/1/2019, 2019-01-17

    const m = testDate.match(/[^0-9]/);  // Heuristic: First non-numeric character is date separator.
    let dateSeparator;
    let yearIndex;
    let monthIndex;
    let dateIndex;

    if (m) {
        dateSeparator = m[0];
        /** @type {number[]} */
        const testParts = testDate.split(dateSeparator).map(v => Number(v));
        yearIndex = testParts.indexOf(2019);
        monthIndex = testParts.indexOf(1);
        dateIndex = testParts.indexOf(17);
    }

    /**
     * @param {string} s
     * @returns {{parts?: number[], error?:SyntaxError}}
     */
    function parseFullDate(s) {
        function stringParts() {
            let parts;
            if (dateSeparator) {
                parts = s.split(dateSeparator);
                if (parts.length === 3) {
                    return [parts[yearIndex], Number(parts[monthIndex]) - 1, parts[dateIndex]]
                }
                if (dateSeparator === '-') {
                    return [NaN]
                }
            }

            // Fall back to ISO.
            parts = s.split('-');
            return [parts[0], Number(parts[1]) - 1, parts[2]]
        }

        const numericParts = stringParts().map(p => Number(p));
        if (someNaN(numericParts)) {
            return {error: new SyntaxError(s)}
        }
        return {parts: numericParts}
    }

    /**
     * @param {string} s
     * @returns {{parts?: number[], error?: SyntaxError}}
     */
    function parseDateOptionalTimeTimezone(s) {
        const dateTimeParts = s.trim().split(/\s+|T/);
        const fullDateResult = parseFullDate(dateTimeParts[0]);
        if (dateTimeParts.length === 1 || fullDateResult.error) {
            if (fullDateResult.parts) {
                fullDateResult.parts = [...fullDateResult.parts, 0, 0, 0, 0];
            }
            return fullDateResult
        }

        //  19:52:53.3434+00:00 ->
        //   0                        1     2      3      4          5
        //  ["19:52:53.123456+00:00", "19", ":52", ":53", ".123456", "+00:00"]
        const m = dateTimeParts[1].match(/^(\d+)(:\d+)?(:\d+)?(\.[0-9]+)?(Z|[+-][0-9:]+)?$/);
        if (!m) {
            return {error: new SyntaxError(s)}
        }

        const hours = Number(m[1]);
        const minutes = m[2] ? Number(m[2].substring(1)) : 0;
        const seconds = m[3] ? Number(m[3].substring(1)) : 0;
        let millis = 0;
        if (m[4]) {
            if (m[4].length === 4) {
                // These were millis
                millis = Number(m[4].substring(1));
            } else if (m[4].length === 7) {
                // These were micros, ignore all sub-millis as JS Date does not support those.
                millis = Number(m[4].substring(1, 4));
            } else {
                return {error: new SyntaxError(s)}
            }
        }
        let timeZone = [];
        if (m[5]) {
            if (m[5] === 'Z') {
                timeZone = [0, 0];
            } else {
                // This will also take care of negative offsets, i.e. "-01:00" -> [-1, 0]
                timeZone = m[5].split(':').map(v => Number(v));
            }
            if (timeZone.length !== 2 || someNaN(timeZone)) {
                return {error: new SyntaxError(s)}
            }
        }

        // Array of length 9
        return {parts: [...fullDateResult.parts, hours, minutes, seconds, millis, ...timeZone]}
    }

    class LocalDateParser {
        /**
         * Parses full dates of the form 2019-10-27, 10/27/2019, ...
         * @param {string} s
         * @returns {{parts?: number[], error?:SyntaxError}}
         */
        fullDate(s) {
            // This is currently only used for unit testing.
            return parseFullDate(s);
        }

        /**
         * Parses dates with partial time of the form 2019-10-27 00:00, 10/27/2019T01:02, ...
         * @param s
         * @returns {{parts?: number[], error?:SyntaxError}}
         */
        datePartialTime(s) {
            const r = parseDateOptionalTimeTimezone(s);
            if (r.parts && r.parts.length !== 7) {
                return {error: new SyntaxError(s)}
            }
            return r
        }

        /**
         * Parses date times of the form 2019-10-27 00:00Z, 10/27/2019T01:02+01:00, ...
         * @param s
         * @returns {{parts?: number[], error?:SyntaxError}}
         */
        dateTime(s) {
            const r = parseDateOptionalTimeTimezone(s);
            if (r.parts && r.parts.length !== 9) {
                return {error: new SyntaxError(s)}
            }
            return r
        }

    }

    return new LocalDateParser()
}

/**
 * @param {GridChenNS.JSONPatchOperation} op
 */
function reverseOp(op) {
    if (op.op === 'replace') {
        // {"op":"replace","path":"/0/1"}
        return {op: op.op, path: op.path, value: op.oldValue, oldValue: op.value, nodeId: op.nodeId}
    } else if (op.op === 'add') {
        // {"op":"add","path":"/-","value":null}
        // {"op":"add","path":"/1"}
        return {op: 'remove', path: op.path, nodeId: op.nodeId}
    } else if (op.op === 'remove') {
        // {"op":"remove","path":"/1","oldValue":["2020-01-01",2]}
        return {op: 'add', path: op.path, value: op.oldValue, nodeId: op.nodeId}
    }
    // No need to support move, copy, or test.
    throw new RangeError(op.op)
}

/**
 * @param {GridChenNS.JSONPatchOperation[]} patch
 * @returns {GridChenNS.JSONPatchOperation[]}
 */
export function reversePatch(patch) {
    const reversedPatch = [];
    for (let op of patch) {
        reversedPatch.unshift(reverseOp(op));
    }
    return reversedPatch
}

/**
 * Applies a JSON Patch operation.
 * @param {{'':object}} holder
 * @param {GridChenNS.JSONPatchOperation} op
 */
function applyJSONPatchOperation(holder, op) {
    const path = op.path.split('/');

    while (path.length > 1) {
        holder = holder[path.shift()];
    }
    const index = path[0];

    if (op.op === 'replace') {
        holder[index] = op.value;
    } else if (op.op === 'add') {
        if (Array.isArray(holder)) {
            (/**@type{object[]}*/holder).splice(parseInt(index), 0, op.value);
        } else {
            holder[index] = op.value;
        }
    } else if (op.op === 'remove') {
        if (Array.isArray(holder)) {
            (/**@type{object[]}*/holder).splice(parseInt(index), 1);
        } else {
            delete holder[index];
        }
    } else {
        // No need to support move, copy, or test.
        throw new RangeError(op.op)
    }
}

/**
 * @param {{'':*}} holder
 * @param {GridChenNS.JSONPatchOperation[]} patch
 */
function applyPatch(holder, patch) {
    for (let op of patch) {
        applyJSONPatchOperation(holder, op);
    }
}

/**
 * Returns the mutated data (yes, data is mutated) object or, if some path is root '',
 * a new object (add) or undefined (remove).
 * This is a low budget implementation of RFC 6902 JSON Patch.
 * It does not implement the move, copy, or test operations.
 * It does not support corner cases such as the '-' path or ~ escapes.
 * It does not do any validation or error handling.
 *
 * @param {object} data
 * @param {GridChenNS.JSONPatchOperation[]} patch
 * @returns {object|undefined}
 */
export function applyJSONPatch(data, patch) {
    const holder = {'': data};
    applyPatch(holder, patch);
    return holder[''];
}

/**
 * Add keydown listeners for KeyY and KeyZ to handle Undo/Redo.
 */
export function registerUndo(container, tm) {

    /**
     * @param {KeyboardEvent} evt
     */
    function listener(evt) {
        if (evt.code === 'KeyY' && evt.ctrlKey) {
            /** type{HTMLElement} */
            const target = evt.target;
            if (target.tagName === 'INPUT' && target.value !== target.defaultValue) {
                // Let the default browser undo action be performed on this input element.
            } else {
                evt.preventDefault();
                evt.stopPropagation();
                tm.undo();
            }
        } else if (evt.code === 'KeyZ' && evt.ctrlKey) {
            // Note: It it too complex to support default browser redos. We do not support those!
            evt.preventDefault();
            evt.stopPropagation();
            tm.redo();
        }
    }

    container.addEventListener('keydown', listener);
}

/**
 * Pure creator function for TransactionManager instances.
 * @returns {GridChenNS.TransactionManager}
 */
export function createTransactionManager() {
    const listenersByType = {change: []};
    const resolves = [];

    function fireChange(transaction) {
        const type = 'change';
        for (let listener of listenersByType[type]) {
            listener({type, transaction});
        }

        while (resolves.length) {
            resolves.pop()();
        }
    }

    /**
     * @implements {GridChenNS.TransactionManager}
     */
    class TransactionManager {
        constructor() {
            this.clear();
        }

        addEventListener(type, listener) {
            listenersByType[type].push(listener);
        }

        removeEventListener(type, listener) {
            for (let l of listenersByType[type]) {
                if (l === listener) {
                    delete listenersByType[type][l];
                }
            }
        }

        async requestTransaction(func) {
            return new Promise(function (resolve) {
                resolves.push(resolve);
                func();
            });
        }

        /**
         * @param {function(GridChen.JSONPatchOperation[])} apply
         * @returns {GridChenNS.Transaction}
         */
        openTransaction(apply) {
            const tm = this;
            return /**@type{GridChenNS.Transaction}*/ {
                patches: [],
                commit() {
                    tm.transactions.push(this);
                    fireChange(this);
                },
                get operations() {
                    const flattend = [];
                    for (let patch of this.patches) {
                        for (let op of patch.operations) {
                            const clonedOp = Object.assign({}, op);
                            clonedOp.path = patch.pathPrefix + op.path;
                            flattend.push(clonedOp);
                        }
                    }
                    return flattend;
                },
                context() {}							
            };
        }

        undo() {
            const trans = this.transactions.pop();
            if (!trans) return;
			trans.context();				
            this.redoTransactions.push(trans);
            const reversedTransaction = /**@type{GridChenNS.Transaction}*/ Object.assign({}, trans);
            reversedTransaction.patches = [];
            for (let patch of Object.assign([], trans.patches).reverse()) {
                const reversedPatch = /**@type{GridChenNS.Patch}*/ Object.assign({}, patch);
                reversedPatch.operations = reversePatch(patch.operations);
                reversedTransaction.patches.push(reversedPatch);
                reversedPatch.apply(reversedPatch);
            }

            fireChange(reversedTransaction);
        }

        redo() {
            const trans = this.redoTransactions.pop();
            if (!trans) return;
			trans.context();				
            this.transactions.push(trans);
            for (let patch of trans.patches) {
                patch.apply(patch);
            }
            fireChange(trans);
        }

        clear() {
            /** @type {GridChenNS.Transaction[]} */
            this.transactions = [];
            /** @type {GridChenNS.Transaction[]} */
            this.redoTransactions = [];
        }

        /**
         * @returns {GridChenNS.JSONPatchOperation[]}
         */
        get patch() {
            const allPatches = [];
            for (let trans of this.transactions) {
                allPatches.push(...trans.operations);
            }
            return allPatches.map(function(op) {
                if ('nodeId' in op) {
                    op = Object.assign({}, op);
                    delete op['nodeId']
                }
                return op
            })
        }
    }

    return new TransactionManager();
}

let logCounter = 0;
export const logger = {
    log: (DEBUG ? (a, b) => window.console.log(logCounter++ + ': ' + a, b) : () => undefined),
    error: function (a, b) {
        window.console.error(logCounter++ + ': ' + a, b);
    }
};

