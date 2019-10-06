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