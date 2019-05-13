/**
 * Author: Wolfgang Kühn 2019
 * https://github.com/decatur/GridChip
 *
 * See README.md
 */

let nf = Intl.NumberFormat([], {minimumFractionDigits: 2, maximumFractionDigits: 2});
let testNumber = nf.format(1000.5); // 1.000,50 in de-DE
let thousandSep = testNumber[1];
let decimalSep = testNumber[5];


/**
 * @interface {Bantam.StringConverter}
 */
export class NumberStringConverter {
    constructor(nf) {
        this.nf = nf;
    }

    toString(n) {
        // Note that in IE11 nf.format("") -> 0
        if (n === undefined) return '';
        return this.nf.format(n)
    }

    /**
     * For example in locale de: parseNumber('1.000,2') -> 1000.2
     */
    fromString(s) {
        s = s.trim();
        if (!s) return undefined;
        let parts = s.split(decimalSep);
        parts[0] = parts[0].split(thousandSep).join('');
        return Number(parts.join('.'))
    }
}

export function formatNumber(n, nf) {
    // Note that in IE11 nf.format("") -> 0
    if (n === undefined) return '';
    return nf.format(n)
}

/**
 * For example in locale de: parseNumber('1.000,2') -> 1000.2
 */
export function parseNumber(s) {
    s = s.trim();
    if (!s) return undefined;
    let parts = s.split(decimalSep);
    parts[0] = parts[0].split(thousandSep).join('');
    return Number(parts.join('.'))
}


let secFreq = 1000;
let minFreq = secFreq * 60;
let hourFreq = minFreq * 60;
let dayFreq = hourFreq * 24;

function pad(i) {
    return String(100 + i).substr(1)
}

function hasFrequency(d, frequency) {
    return (d.getTime() % frequency) === 0
}

let frequencySymbols = {
    d: dayFreq,
    h: hourFreq,
    min: minFreq
};

/**
 Parse frequencies of the form 1d, 2h or 3min.
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
 * Returns a time of the form (10(:56(:43)?)?)?
 */
function timeFormat(d, frequency) {
    // Never ever use IE11s toLocale methods, as those embed formating characters.
    let s = '';
    if (frequency >= dayFreq) return s;
    s += pad(d.getUTCHours());
    if (frequency >= hourFreq) return s;
    s += ':' + pad(d.getUTCMinutes());
    if (frequency >= minFreq) return s;
    s += ':' + pad(d.getUTCSeconds());
    if (frequency >= secFreq) return s;
    return s + '.' + String(10000 + d.getSeconds()).substr(1)
}

/**
 * Returns an Excel compatible date string of the form 18.08.2017( 10(:56(:43)?)?)? in UTC locale.
 */
function deFormatUTC(d, frequency) {
    if (d === undefined) return;
    let s = pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
    if (frequency >= dayFreq) return s;
    else return s + ' ' + timeFormat(d, frequency)
}

/**
 * Returns an Excel de-locale compatible date string of the form 18.08.2017( 10(:56(:43))).
 * @param {Date} d
 */
export function deFormat(d, frequency) {
    if (d === undefined) return;
    if (isNaN(d.getTime())) return d.toString();
    let s = String(d.getDate()).padStart(2, '0') + '.' +
        String(1 + d.getMonth()).padStart(2, '0') + '.' +
        String(d.getFullYear()) + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
    let dh = d.getHours() - d.getUTCHours();
    if (dh < 0) dh += 24;
    return s  // + '+' + String(dh).padStart(2, 0);
}

/*
 * Note on date:
 * This software only supports naive dates. These do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */

/**
 * Example: parseDate('2017-01-01').toISOString() -> "2017-01-01T00:00Z"
 *
 * @param {String} s a date of the form
 *          2016-01-01 or 2016-01-01T13 or 2016-01-01T13:30 or
 *          01.01.2016 or 01.01.2016 13 or 01.01.2016 13:30
 * @return {Date} a naive (UTC) date
 */
export function parseDate(s) {
    let d = new Date(0);
    let mo, year, month, date;

    if (s.indexOf('-') !== -1) {
        // '2016-01-01T13:30'
        // 0=2016-01-01T..., 1=2016, 2=01, 3=01, 4=T13:30, 5=13:30
        mo = s.match(/^(\d+)-(\d+)-(\d+)(T(.*))?$/);
        if (!mo) return new Date(NaN);

        year = parseInt(mo[1]);
        month = parseInt(mo[2]);
        date = parseInt(mo[3])
    } else if (s.indexOf('.') !== -1) {
        // '01.01.2016 13:30'
        // 0=01.01.2016 ..., 1=01, 2=01, 3=2016, 4= 13:30, 5=13:30"
        mo = s.match(/^(\d+)\.(\d+)\.(\d+)(\s+(.*))?$/);
        if (!mo) return new Date(NaN);
        year = parseInt(mo[3]);
        month = parseInt(mo[2]);
        date = parseInt(mo[1])
    } else {
        return new Date(NaN)
    }
    d.setUTCFullYear(year);
    d.setUTCMonth(month - 1);
    d.setUTCDate(date);
    if (mo[5] !== new Date(NaN)) {
        let timeParts = mo[5].split(':');
        if (timeParts.length > 0) d.setUTCHours(Number(timeParts[0]));
        if (timeParts.length > 1) d.setUTCMinutes(Number(timeParts[1]))
    }
    d.toJSON = function () {
        return isoFormat(this, minFreq)
    };
    return d
}

/**
 * Converter for timezone aware dates.
 */
export class DateTimeStringConverter {

    /**
     * @param {string} frequency
     */
    constructor(frequency) {
        this.frequency = parseFrequency(frequency || 'T1M');
    }

    /**
     * Returns a iso formatted string in local time, for example 2017-01-01T02:00+01.
     * @param {Date} d
     * @returns {string}
     */
    toString(d) {
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

    /**
     * Parses any valid date format, but iso format is preferred.
     * @param {string} s
     * @returns {Date}
     */
    fromString(s) {
        const offsetSign = s.substr(-3, 1);
        if (offsetSign === '+' || offsetSign === '-') {
            s += ':00';
        }
        return new Date(s);
    }
}

export class DateStringConverter {
    constructor() {
    }

    /**
     * @param {Date} d
     * @returns {string}
     */
    toString(d) {
        if (isNaN(d.getTime())) return d.toString();
        const pad = (v) => String(v).padStart(2, '0');
        return pad(d.getFullYear()) + '-' + pad(1 + d.getMonth()) + '-' + pad(d.getDate());
    }

    /**
     *
     * @param {string} s
     * @returns {Date}
     */
    fromString(s) {
        return new Date(s);
    }
}

/**
 * @param {Date} d
 * @returns {string}
 */
export function dateToLocalString(d) {
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
}

/**
 * Example: parseDate('2017-01-01').toISOString() -> "2017-01-01T00:00Z"
 *
 * @param {String} s a date of the form
 *          2016-01-01 or 2016-01-01T13 or 2016-01-01T13:30 or
 *          01.01.2016 or 01.01.2016 13 or 01.01.2016 13:30
 * @return {Date} a naive (UTC) date
 */
export function localStringToDate(s) {
    let d = new Date(0);
    let mo, year, month, date;

    if (s.indexOf('-') !== -1) {
        // '2016-01-01T13:30'
        // 0=2016-01-01T..., 1=2016, 2=01, 3=01, 4=T13:30, 5=13:30
        mo = s.match(/^(\d+)-(\d+)-(\d+)(T(.*))?$/);
        if (!mo) return new Date(NaN);

        year = parseInt(mo[1]);
        month = parseInt(mo[2]);
        date = parseInt(mo[3])
    } else if (s.indexOf('.') !== -1) {
        // '01.01.2016 13:30'
        // 0=01.01.2016 ..., 1=01, 2=01, 3=2016, 4= 13:30, 5=13:30"
        mo = s.match(/^(\d+)\.(\d+)\.(\d+)(\s+(.*))?$/);
        if (!mo) return new Date(NaN);
        year = parseInt(mo[3]);
        month = parseInt(mo[2]);
        date = parseInt(mo[1])
    } else {
        return new Date(NaN)
    }
    d.setFullYear(year);
    d.setMonth(month - 1);
    d.setDate(date);
    if (mo[5] !== new Date(NaN)) {
        let timeParts = mo[5].split(':');
        if (timeParts.length > 0) d.setHours(Number(timeParts[0]));
        if (timeParts.length > 1) d.setMinutes(Number(timeParts[1]))
    }
    d.toJSON = function () {
        return isoFormat(this, minFreq)
    };
    return d
}

/**
 * Returns a date of the form 2017-08-13(T10(:56(:43)?)?)?
 */
function isoFormat(d, frequency) {
    frequency = frequency || secFreq;
    let s = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    if (frequency >= dayFreq) return s;
    else return s + 'T' + timeFormat(d, frequency)
}

export const DateTimeIndex = {
    create: function (startDate, frequency) {
        if (typeof(startDate) === 'string') startDate = parseDate(startDate);
        startDate = startDate.getTime();
        return {
            at: function (index) {
                return new Date(startDate + index * frequency)
            }
        }
    },
    isoFormat: isoFormat,
    deFormat: deFormat,
    timeFormat: timeFormat,
    hasFrequency: hasFrequency,
    secFreq: secFreq,
    minFreq: minFreq,
    hourFreq: hourFreq,
    dayFreq: dayFreq
};

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
export function localDateStringToDate(dateStrings) {
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
