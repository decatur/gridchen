/**
 * Author: Wolfgang Kühn 2019
 * https://github.com/decatur/GridChen
 *
 * See README.md
 */

/**
 * @interface {GridChen.StringConverter}
 */
export class NumberStringConverter {
    /**
     * @param {number} fractionDigits
     * @param {string?} locale
     */
    constructor(fractionDigits, locale) {
        this.nf = Intl.NumberFormat(locale, {minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits});
        // Default for maximumFractionDigits is 3.
        this.nf1 = Intl.NumberFormat(locale, {maximumFractionDigits: 10});
        let testNumber = this.nf.format(1000.5); // 1.000,50 in de-DE
        this.thousandSep = testNumber[1];
        this.decimalSep = testNumber[5];  // Will be undefined for fractionDigits=0
    }

    toString(n) {
        if (n.constructor === String) return String(n);
        if (n === undefined) return '';
        return this.nf.format(n)
    }

    toEditable(n) {
        return this.toString(n)
    }

    /**
     * For example in locale de: parseNumber('1.000,2') -> 1000.2
     */
    fromString(s) {
        s = s.trim();
        if (!s) return undefined;
        let parts = s.split(this.decimalSep);
        parts[0] = parts[0].split(this.thousandSep).join('');
        const n = Number(parts.join('.'));
        return isNaN(n)?s:n;
    }
}

/**
 * Converter for timezone aware dates.
 */
export class DateTimeStringConverter {
    /**
     * @param {string?} frequency
     */
    constructor(frequency) {
        this.frequency = parseFrequency(frequency || 'T1M');
    }

    /**
     * Returns a iso formatted string in local time with time zone offset, for example 2017-01-01T02:00+01.
     * @param {Date|string} d
     * @returns {string}
     */
    toString(d) {
        if (d.constructor === String) {
            d = this.fromString(d);
            if (d.constructor === String) return d;
        }
        if (isNaN(d.getTime())) return d.toString();
        const pad = (v) => String(v).padStart(2, '0');
        let s = pad(d.getFullYear()) + '-' + pad(1 + d.getMonth()) + '-' + pad(d.getDate());
        if (this.frequency.H || this.frequency.M) {
            s += 'T' + pad(d.getHours());
            if (this.frequency.M) {
                s += ':' + pad(d.getMinutes());
            }
        }
        let dh = d.getHours() - d.getUTCHours();
        if (dh < 0) dh += 24;
        return s + '+' + String(dh).padStart(2, '0');
    }

    toEditable(d) {
        return this.toString(d);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {Date}
     */
    fromString(s) {
        s = s.trim();
        const offsetSign = s.substr(-3, 1);
        let d;
        if (s.includes('T') && (offsetSign === '+' || offsetSign === '-')) {
            d = new Date(s + ':00');
        } else {
            d = new Date(s);
        }
        return isNaN(d.getTime())?s:d;
    }
}

function createLocalDateParsers(locale) {
    // We only support numeric year-month-day formats.
    const options = {year: 'numeric', month: 'numeric', day: 'numeric'}; //, hour: 'numeric', minute: 'numeric'};
    const dtf = Intl.DateTimeFormat(locale, options);
    const testDate = dtf.format(Date.UTC(2019, 0, 17, 2));
    // -> examples: 17.1.2019, 1/17/2019, 17/1/2019
    // console.log(testDate);

    const m = testDate.match(/[^0-9]/);  // Heuristic: First non-numeric character is date separator.
    const r = {};
    if (m) {
        r.dateSeparator = m[0];
        /** @type {number[]} */
        const testParts = testDate.split(r.dateSeparator).map(v => Number(v));
        let yearIndex = testParts.indexOf(2019);
        let monthIndex = testParts.indexOf(1);
        let dateIndex = testParts.indexOf(17);
        r.localDateParser = function (s) {
            const parts = s.split(r.dateSeparator);
            return new Date(Date.UTC(parts[yearIndex], parts[monthIndex] - 1, parts[dateIndex]));
        };
        r.localDateTimeParser = function (s) {
            const parts = s.split(/,?\s+|T/i);
            if (parts.length !== 2) return new Date(NaN);
            const d = r.localDateParser(parts[0]);
            const timeParts = parts[1].split(':').map(v => Number(v));
            d.setUTCHours(timeParts[0]);
            if (timeParts.length > 0) {
                d.setUTCMinutes(timeParts[1]);
            }
            return d;
        };
    }
    return r
}

/**
 * Converter for naive dates. Naive dates do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround, we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */
export class DateTimeLocalStringConverter {

    /**
     * @param {string?} frequency
     * @param {string?} locale
     */
    constructor(frequency, locale) {
        this.frequency = parseFrequency(frequency || 'T1M');
        const parsers = createLocalDateParsers(locale);
        this.dateSeparator = parsers.dateSeparator;
        this.parser = parsers.localDateTimeParser;
    }

    /**
     * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
     * @param {Date|string} d
     * @returns {string}
     */
    toString(d) {
        if (d.constructor === String) {
            d = this.fromString(d);
            if (d.constructor === String) return d;
        }
        if (isNaN(d.getTime())) return d.toString();
        const pad = (v) => String(v).padStart(2, '0');
        let s = pad(d.getUTCFullYear()) + '-' + pad(1 + d.getUTCMonth()) + '-' + pad(d.getUTCDate());
        if (this.frequency.H || this.frequency.M) {
            // We use space, not 'T' as time separator to apeace MS-Excel.
            s += ' ' + pad(d.getUTCHours());
            if (this.frequency.M) {
                s += ':' + pad(d.getMinutes());
            }
        }
        return s;
    }

    toEditable(d) {
        return this.toString(d);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {Date}
     */
    fromString(s) {
        s = s.trim();
        let d;
        if (this.dateSeparator && s.indexOf(this.dateSeparator) !== -1) {
            d = this.parser(s);
        } else {
            // Note that new Date('2019-10-27').toISOString() -> 2019-10-27T00:00:00Z
            // But new Date('2019-10-27T00:00').toISOString() -> 2019-10-26T22:00:00Z
            // Therefore always specify zulu zone.
            d = new Date(s + 'Z');
        }
        return isNaN(d.getTime())?s:d;
    }
}

/**
 * Converter for naive dates without time information.
 * Uses the same concept for date representation as DateTimeLocalStringConverter.
 */
export class DateStringConverter {
    /**
     * @param {string?} locale
     */
    constructor(locale) {
        const parsers = createLocalDateParsers(locale);
        this.dateSeparator = parsers.dateSeparator;
        this.parser = parsers.localDateParser;
    }

    /**
     * @param {Date|string} d
     * @returns {string}
     */
    toString(d) {
        if (d.constructor === String) {
            d = this.fromString(d);
            if (d.constructor === String) return d;
        }
        if (isNaN(d.getTime())) return d.toString();
        const pad = (v) => String(v).padStart(2, '0');
        return pad(d.getUTCFullYear()) + '-' + pad(1 + d.getUTCMonth()) + '-' + pad(d.getUTCDate());
    }

    toEditable(d) {
        return this.toString(d);
    }

    /**
     * @param {string} s
     * @returns {Date}
     */
    fromString(s) {
        s = s.trim();
        let d;
        if (this.dateSeparator && s.indexOf(this.dateSeparator) !== -1) {
            d = this.parser(s);
        } else {
            d = new Date(s + 'Z');
        }
        return isNaN(d.getTime())?s:d;
    }
}

/**
 Parses ISO periods of the form PT1H or PT15M.
 Returns duration in milliseconds.
 */
function parseFrequency(frequency) {
    // 'T0H15M'.match(/^T((\d+)H)?((\d+)M)?$/)
    // -> ["T0H15M", "0H", "0", "15M", "15"]
    frequency = frequency.toUpperCase();
    let m = frequency.match(/^T((\d+)H)?((\d+)M)?$/);
    if (!m) {
        console.log(`Invalid frequency ${frequency}`);
        return {M: 1};
    }
    return {H: parseInt(m[2]), M: parseInt(m[4])};
}

/**
 * Parses a list of local date strings and returns a list of dates. This is only possible because we assert that
 * the date value must always increase.
 *
 * Example:
 * let dates = ['2019-10-27 01:00', '2019-10-27 02:00', '2019-10-27 02:15', '2019-10-27 02:00', '2019-10-27 02:15', '2019-10-27 03:00'];
 * localDateStringToDate(dates).map((d, i) => dates[i] + ' -> ' + d.toJSON()).join('\n')
 *  2019-10-27 01:00 -> 2019-10-26T23:00Z
 *  2019-10-27 02:00 -> 2019-10-27T00:00Z
 *  2019-10-27 02:15 -> 2019-10-27T00:15Z
 *  2019-10-27 02:00 -> 2019-10-27T01:00Z
 *  2019-10-27 02:15 -> 2019-10-27T01:15Z
 *  2019-10-27 03:00 -> 2019-10-27T02:00Z
 *
 * @param {Array<string>} dateStrings
 * @returns {Date[]}
 */
function localDateStringToDate(dateStrings) {
    let prevTime = undefined;
    return dateStrings.map(function (s) {
        let d = new Date(s);
        if (d.getTime() <= prevTime) {
            d = new Date(d.getTime() + 60 * 60 * 1000);
        }
        prevTime = d.getTime();
        return (d);
    });
}
