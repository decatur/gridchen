function pad(v) {
    return String(v).padStart(2, '0');
}

/**
 * @param {Date} d
 * @returns {string}
 */
export function toUTCDateString(d) {
    return pad(d.getUTCFullYear()) + '-' + pad(1 + d.getUTCMonth()) + '-' + pad(d.getUTCDate())
}

/**
 * @param {Date} d
 * @param {string} displayResolution
 * @returns {string}
 */
export function toUTCDatePartialTimeString(d, displayResolution) {
    let s = toUTCDateString(d);
    if (displayResolution === 'H' || displayResolution === 'M') {
        // We use space, not 'T' as time separator to apeace MS-Excel.
        s += ' ' + pad(d.getUTCHours());
        if (displayResolution === 'M') {
            s += ':' + pad(d.getUTCMinutes());
        }
    }
    return s;
}

/**
 * @param {Date} d
 * @param {string} displayResolution
 * @returns {string}
 */
export function toUTCDateTimeString(d, displayResolution) {
    let s = toUTCDatePartialTimeString(d, displayResolution);
    return s + '+Z';
}

export function toLocalISODateString(d) {
    return pad(d.getFullYear()) + '-' + pad(1 + d.getMonth()) + '-' + pad(d.getDate())
}

export function toLocaleISODateTimeString(d, displayResolution) {
    let s = toLocalISODateString(d);
    if (displayResolution === 'H' || displayResolution === 'M') {
        // We use space, not 'T' as time separator to apeace MS-Excel.
        s += ' ' + pad(d.getHours());
        if (displayResolution === 'M') {
            s += ':' + pad(d.getMinutes());
        }
    }
    let dh = d.getHours() - d.getUTCHours();
    if (dh < 0) dh += 24;
    return s + '+' + pad(String(dh)) + ':00';
}


const localeDateParsers = {};

/**
 * @param {string} locale
 * @returns {GridChen.LocalDateParser}
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
    // * it is very a very loose parser
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
     * @returns {number[]|SyntaxError}
     */
    function parseFullDate(s) {
        function stringParts() {
            let parts;
            if (dateSeparator) {
                parts = s.split(dateSeparator);
                if (parts.length === 3) {
                    return [parts[yearIndex], parts[monthIndex] - 1, parts[dateIndex]]
                }
                if (dateSeparator === '-') {
                    return [NaN]
                }
            }

            // Fall back to ISO.
            parts = s.split('-');
            return [parts[0], parts[1] - 1, parts[2]]
        }

        const numericParts = stringParts().map(p => Number(p));
        if (someNaN(numericParts)) {
            return SyntaxError(s)
        }
        return numericParts
    }

    function parseDateTimeOptionalTimezone(s) {
        // '2019-10-27 01:02Z' -> ["2019-10-27 01:02Z", "2019-10-
        // '2019-10-27 01:02-01:00' -> ["2019-10-27 01:02Z", "2019-10-27", " ", "01:02", "-01:00"]
        // '2019-10-27T01:02' -> ["2019-10-27 01:02Z", "2019-10-27", "T", "01:02", undefined]
        const m = s.match(/^(.+)(\s|T)([0-9:]+)(Z|[+-][0-9:]+)?$/);
        if (!m) {
            return new SyntaxError(s);
        }
        const fullDate = parseFullDate(m[1]);
        if (fullDate.constructor === SyntaxError) {
            return fullDate
        }

        const partialTime = m[3].split(':').map(v => Number(v));
        if (partialTime.length !== 2 || someNaN(partialTime)) {
            return new SyntaxError(s)
        }
        let timeZone = [];
        if (m[4] !== undefined) {
            if (m[4] === 'Z') {
                timeZone = [0, 0];
            } else {
                // This will also take care of negative offsets, i.e. "-01:00" -> [-1, 0]
                timeZone = m[4].split(':').map(v => Number(v));
            }
            if (timeZone.length !== 2 || someNaN(timeZone)) {
                return new SyntaxError(s);
            }
        }

        return [...fullDate, ...partialTime, ...timeZone]
    }

    class LocalDateParser {
        /**
         * Parses full dates of the form 2019-10-27, 10/27/2019, ...
         * @param {string} s
         * @returns {number[]|SyntaxError}
         */
        fullDate(s) {
            return parseFullDate(s);
        }

        /**
         * Parses dates with partial time of the form 2019-10-27 00:00, 10/27/2019T01:02, ...
         * @param s
         * @returns {SyntaxError | number[]}
         */
        datePartialTime(s) {
            const parts = parseDateTimeOptionalTimezone(s);
            if (parts.constructor === SyntaxError) {
                return parts
            }
            if (parts.length !== 5) {
                return new SyntaxError(s)
            }
            return parts
        }

        /**
         * Parses date times of the form 2019-10-27 00:00Z, 10/27/2019T01:02+01:00, ...
         * @param s
         * @returns {SyntaxError | number[]}
         */
        dateTime(s) {
            const parts = parseDateTimeOptionalTimezone(s);
            if (parts.constructor === SyntaxError) {
                return parts
            }
            if (parts.length !== 7) {
                return new SyntaxError(s)
            }
            return parts
        }

    }

    return new LocalDateParser()
}

/**
 * @param {GridChen.JSONPatchOperation} op
 */
function reverseOp(op) {
    if (op.op === 'replace') {
        // {"op":"replace","path":"/0/1"}
        return {op: op.op, path: op.path, value: op.oldValue, oldValue: op.value}
    } else if (op.op === 'add') {
        // {"op":"add","path":"/-","value":null}
        // {"op":"add","path":"/1"}
        return {op: 'remove', path: op.path}
    } else if (op.op === 'remove') {
        // {"op":"remove","path":"/1","oldValue":["2020-01-01",2]}
        return {op: 'add', path: op.path, value: op.oldValue}
    }
    // No need to support move, copy, or test.
    throw new RangeError(op.op)
}

/**
 * @param {GridChen.JSONPatchOperation[]} patch
 * @returns {GridChen.JSONPatchOperation[]}
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
 * @param {GridChen.JSONPatchOperation} op
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
 * @param {{'':object}} holder
 * @param {GridChen.JSONPatchOperation[]} patch
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
 * @param {GridChen.JSONPatchOperation[]} patch
 * @returns {object|undefined}
 */
export function applyJSONPatch(data, patch) {
    const holder = {'': data};
    applyPatch(holder, patch);
    return holder[''];
}

/**
 * Creates and globally registers a TransactionManager instance.
 * @returns {GridChen.TransactionManager}
 */
export function registerGlobalTransactionManager() {
    globalTransactionManager = createTransactionManager();

    document.body.addEventListener('keydown', function (evt) {
        if (evt.code === 'KeyY' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            globalTransactionManager.undo();
        } else if (evt.code === 'KeyZ' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            globalTransactionManager.redo();
        }
    });
    return globalTransactionManager;
}

/**
 * Returns the globally registered Transaction Manager.
 * @type {GridChen.TransactionManager|null}
 */
export let globalTransactionManager = null;

/**
 * Pure creator function for TransactionManager instances.
 * @returns {GridChen.TransactionManager}
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
     * @implements {GridChen.TransactionManager}
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
         * @returns {GridChen.Transaction}
         */
        openTransaction(apply) {
            const tm = this;
            return /**@type{GridChen.Transaction}*/ {
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
                }
            };
        }

        undo() {
            const trans = this.transactions.pop();
            if (!trans) return;
            this.redoTransactions.push(trans);
            const reversedTransaction = /**@type{GridChen.Transaction}*/ Object.assign({}, trans);
            reversedTransaction.patches = [];
            for (let patch of Object.assign([], trans.patches).reverse()) {
                const reversedPatch = /**@type{GridChen.Patch}*/ Object.assign({}, patch);
                reversedPatch.operations = reversePatch(patch.operations);
                reversedTransaction.patches.push(reversedPatch);
                reversedPatch.apply(reversedPatch);
            }

            fireChange(reversedTransaction);
        }

        redo() {
            const trans = this.redoTransactions.pop();
            if (!trans) return;
            this.transactions.push(trans);
            for (let patch of trans.patches) {
                patch.apply(patch);
            }
            fireChange(trans);
        }

        clear() {
            /** @type {GridChen.Transaction[]} */
            this.transactions = [];
            /** @type {GridChen.Transaction[]} */
            this.redoTransactions = [];
        }

        /**
         * @returns {GridChen.JSONPatchOperation[]}
         */
        get patch() {
            const allPatches = [];
            for (let trans of this.transactions) {
                allPatches.push(...trans.operations);
            }
            return allPatches;
        }
    }

    return new TransactionManager();
}

