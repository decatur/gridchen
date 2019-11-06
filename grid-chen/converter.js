/**
 * Author: Wolfgang Kühn 2019
 * Source located at https://github.com/decatur/grid-chen/grid-chen
 *
 * Module implementing data mapping for some common data types.
 */

//@ts-check

import * as u from './utils.js'

/**
 * @returns {HTMLSpanElement}
 */
function createSpan() {
    const elem = document.createElement('span');
    elem.style.cursor = 'cell';
    return elem
}

/**
 * @implements {GridChenNS.Converter}
 */
export class StringConverter {
    constructor() {
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        return String(s)
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toEditable(s) {
        return this.toTSV(s)
    }

    /**
     * @param {string} s
     */
    fromEditable(s) {
        return s.trim();
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {boolean|*} value
     */
    render(element, value) {
        if (value.constructor !== String) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = String(value);
            element.className = 'string';
        }
    }
}

export class URIConverter {
    constructor() {
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        return String(s)
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toEditable(s) {
        return String(s)
    }

    /**
     * @param {string} s
     */
    fromEditable(s) {
        return s
    }

    /**
     * Creates the display for an anchor cell mimicking MS-Excel.
     * It supports entering edit mode via slow click and cursor management.
     * @returns {HTMLAnchorElement}
     */
    createElement() {
        const elem = document.createElement('a');

        function onMouseUpOrOut(func) {
            elem.onmouseup = elem.onmouseout = func;
        }

        /*
         * Requirements from Excel:
         * 1) A fast click selects the cell and follows the link.
         * 2) A dblclick is the same as a fast click. So a dblclick must not enter edit mode.
         * 3) A slow click (>500ms)
         *     a) selects the cell
         *     b) changes the cursor to cell
         *     c) does not follow the link
         */

        // Avoid activeCell.enterEditMode() being called.
        elem.ondblclick = (evt) => evt.stopPropagation();

        // TODO: Use event delegation.
        elem.onmousedown = function () {
            const h = window.setTimeout(function () {
                const href = elem.getAttribute('href');
                // Make sure link is not followed
                elem.removeAttribute('href');
                elem.style.cursor = 'cell';
                onMouseUpOrOut(function () {
                    // Reestablish cursor.
                    elem.style.removeProperty('cursor');
                    // Reestablish link. Must be done async because if this is a onmouseup event,
                    // an onclick will always fire afterwards, which in turn would follow the link.
                    window.requestAnimationFrame(function() { elem.href = href; });
                    // Remove this handlers.
                    onMouseUpOrOut(undefined);
                });
            }, 500);

            // In case timer did not trigger yet this will clear it.
            onMouseUpOrOut(() => window.clearTimeout(h));
        };

        return elem
    }

    /**
     * @param {HTMLAnchorElement} element
     * @param {string|*} value
     */
    render(element, value) {
        // This will also remove the pointer cursor.
        element.removeAttribute('href');
        element.removeAttribute('target');

        if (value.constructor !== String) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            // Check for markdown link, i.e. [foobar](http://foobar.org)
            const m = value.match(/^\[(.+)\]\((.+)\)$/);
            let href;
            let text;
            if (m) {
                text = m[1];
                href = m[2];
            } else {
                if (value !== '') {
                    href = value;
                }
                text = value;
            }

            element.textContent = text;
            if (href) {
                element.href = href;
                if (!href.startsWith('#')) element.target = '_blank';
            }

            element.className = 'non-string';
        }
    }
}

/**
 * @interface {GridChenNS.Converter}
 */
export class BooleanStringConverter {
    constructor() {
    }

    /**
     * @param {boolean|*} b
     * @returns {string}
     */
    toTSV(b) {
        return String(b)
    }

    /**
     * @param {boolean} b
     * @returns {string}
     */
    toEditable(b) {
        return String(b)
    }

    /**
     * @param {string} s
     */
    fromEditable(s) {
        s = s.trim();
        if (['true', 'wahr', '1', 'y'].indexOf(s.toLowerCase()) >= 0) {
            return true
        }
        if (['false', 'falsch', '0', 'n'].indexOf(s.toLowerCase()) >= 0) {
            return false
        }
        return s;
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {boolean|*} value
     */
    render(element, value) {
        if (value.constructor !== Boolean) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = String(value); // text is true or false
            element.className = 'non-string';
        }
    }
}

/**
 * @interface {GridChenNS.Converter}
 */
export class NumberConverter {
    /**
     * @param {number} fractionDigits
     * @param {string=} locale
     */
    constructor(fractionDigits, locale) {
        /** @type {Intl.NumberFormat} */
        this.nf = Intl.NumberFormat(locale, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
        // Default for maximumFractionDigits is 3.
        /** @type {Intl.NumberFormat} */
        this.nf1 = new Intl.NumberFormat(locale, {maximumFractionDigits: 10});
        let testNumber = this.nf1.format(1000.5); // 1.000,50 in de-DE
        this.thousandSep = testNumber[1];
        this.decimalSep = testNumber[5];  // Will be undefined for fractionDigits=0
        this.isPercent = false;
    }

    /**
     * @param {number|*} n
     * @returns {string}
     */
    toTSV(n) {
        if (n.constructor !== Number) {
            // Normalize String instances, i.e. new String('foo') -> 'foo'
            return String(n)
        }
        if (this.isPercent) {
            return this.nf1.format(n * 100) + '%'
        }
        return this.nf1.format(n)
    }

    toEditable(n) {
        return this.toTSV(n)
    }

    /**
     * For example in locale de: parseNumber('1.000,2') -> 1000.2
     */
    fromEditable(s) {
        s = s.trim();
        if (!s) return undefined;
        const isPercent = s[s.length - 1] === '%';
        if (isPercent) {
            s = s.substr(0, s.length - 1);
        }
        let parts = s.split(this.decimalSep);
        parts[0] = parts[0].split(this.thousandSep).join('');
        const n = Number(parts.join('.'));
        return isNaN(n) ? s : (isPercent ? n / 100 : n);
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {number|*} value
     */
    render(element, value) {
        if (value.constructor !== Number) {
            // Normalize String instances, i.e. new String('foo') -> 'foo'
            element.textContent = String(value);
            element.className = 'error';
        } else {
            if (this.isPercent) {
                element.textContent = this.nf.format(value * 100) + '%';
            } else {
                element.textContent = this.nf.format(value);
            }
            element.className = 'non-string';
        }
    }
}

/**
 * Converter for naive dates without time information.
 * Uses the same concept for date representation as DateTimeLocalStringConverter.
 */
export class FullDateStringConverter {
    /**
     * @param {string=} locale
     */
    constructor(locale) {
        this.parser = u.localeDateParser(locale);
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        return s
    }

    toEditable(s) {
        return s
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    fromEditable(s) {
        const parts = this.parser.fullDate(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        /**@type{number[]}*/
        const foo =  /**@type{number[]}*/ (parts);
        return u.toUTCDateString(new Date(Date.UTC(foo[0], foo[1], ...foo)))
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string|*} value
     */
    render(element, value) {
        if (value.constructor !== String) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            const parts = this.parser.fullDate(value);
            if (parts.constructor === SyntaxError) {
                element.textContent = String(value);
                element.className = 'error';
            } else {
                element.textContent = value;
                element.className = 'non-string';
            }
        }
    }
}

/**
 * Converter for naive dates. Naive dates do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround, we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */
export class DatePartialTimeStringConverter {

    /**
     * @param {string=} displayResolution
     * @param {string=} locale
     */
    constructor(displayResolution, locale) {
        this.displayResolution = displayResolution || 'M';
        this.parser = u.localeDateParser(locale);
    }

    /**
     * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
     * @param {string|*} s
     * @returns {string}
     */
    toTSV(s) {
        if (s.constructor !== String) {
            return String(s);
        }

        let parts = this.parser.datePartialTime(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        const d = new Date(Date.UTC(...parts));
        return d.toISOString().substr(0, 16).replace('T', ' ');
    }

    toEditable(s) {
        return this.toTSV(s);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {string}
     */
    fromEditable(s) {
        const parts = this.parser.datePartialTime(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        return u.toUTCDatePartialTimeString(new Date(Date.UTC(...parts)), this.displayResolution).replace(' ', 'T')
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string|*} value
     */
    render(element, value) {
        if (value.constructor !== String) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            const parts = this.parser.datePartialTime(value);
            if (parts.constructor === SyntaxError) {
                element.textContent = value;
                element.className = 'error';
            } else {
                element.textContent = u.toUTCDatePartialTimeString(new Date(Date.UTC(...parts)), this.displayResolution);
                element.className = 'non-string';
            }
        }
    }
}

/**
 * Converter for timezone aware dates.
 */
export class DateTimeStringConverter {
    /**
     * @param {string=} displayResolution
     * @param {string=} locale
     */
    constructor(displayResolution, locale) {
        this.displayResolution = displayResolution || 'M';
        this.parser = u.localeDateParser(locale);
    }

    /**
     * Returns a iso formatted string in local time with time zone offset, for example 2017-01-01T02:00+01.
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        // Excel does not handle time zones, so just emmit the string.
        return s.replace('T', ' ')
    }

    toEditable(s) {
        return this.toTSV(s)
    }

    /**
     * @param {string|*} s
     * @returns {string}
     */
    fromEditable(s) {
        if (s.constructor !== String) {
            return String(s);
        }

        let parts = this.parser.dateTime(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        parts[3] -= parts[5]; // Get rid of hour offset
        parts[4] -= parts[6]; // Get rid of minute offset
        const d = new Date(Date.UTC(...parts.slice(0, 5)));
        return u.toLocaleISODateTimeString(d, 'M').replace(' ', 'T')
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string|*} value
     */
    render(element, value) {
        if (value.constructor !== String) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            const parts = this.parser.dateTime(value);
            if (parts.constructor === SyntaxError) {
                element.textContent = value;
                element.className = 'error';
            } else {
                parts[3] -= parts[5]; // Get rid of hour offset
                parts[4] -= parts[6]; // Get rid of minute offset
                element.textContent = u.toLocaleISODateTimeString(new Date(Date.UTC(...parts.slice(0, 5))), this.displayResolution);
                element.className = 'non-string';
            }
        }
    }
}

export class FullDateConverter {
    /**
     * @param {string=} locale
     */
    constructor(locale) {
        this.parser = u.localeDateParser(locale);
    }

    /**
     * @param {Date|*} d
     * @returns {string}
     */
    toTSV(d) {
        if (d.constructor !== Date) {
            return String(d);
        }
        return u.toUTCDateString(d);
    }

    toEditable(d) {
        return this.toTSV(d);
    }

    /**
     * @param {string} s
     * @returns {Date|string}
     */
    fromEditable(s) {
        const parts = this.parser.fullDate(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        return new Date(Date.UTC(...parts))
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {Date|*} value
     */
    render(element, value) {
        if (value.constructor !== Date) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = value.toISOString().substr(0, 10);
            element.className = 'non-string';
        }
    }
}

/**
 * Converter for naive dates. Naive dates do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround, we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */
export class DatePartialTimeConverter {
    /**
     * @param {string=} displayResolution
     * @param {string=} locale
     */
    constructor(displayResolution, locale) {
        this.displayResolution = displayResolution || 'M';
        this.parser = u.localeDateParser(locale);
    }

    /**
     * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
     * @param {Date|*} d
     * @returns {string}
     */
    toTSV(d) {
        if (d.constructor !== Date) {
            return String(d);
        }

        return d.toISOString().substr(0, 16).replace('T', ' ');
    }

    toEditable(d) {
        return this.toTSV(d);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {Date|string}
     */
    fromEditable(s) {
        let parts = this.parser.datePartialTime(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        return new Date(Date.UTC(...parts))
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {Date|*} value
     */
    render(element, value) {
        if (value.constructor !== Date) {
            element.textContent = String(value);
            element.className = 'error';
        } else {

            element.textContent =
                value.toISOString()
                    .substr(0, this.displayResolution === 'H' ? 13 : 16)
                    .replace('T', ' ');
            element.className = 'non-string';
        }
    }
}

/**
 * Converter for timezone aware dates.
 */
export class DateTimeConverter {
    /**
     * @param {string=} displayResolution
     * @param {string=} locale
     */
    constructor(displayResolution, locale) {
        this.displayResolution = displayResolution || 'M';
        this.parser = u.localeDateParser(locale);
    }

    /**
     * Returns a iso formatted string in local time with time zone offset, for example 2017-01-01T02:00+01.
     * @param {Date|*} d
     * @returns {string}
     */
    toTSV(d) {
        if (d.constructor !== Date) {
            return String(d)
        }
        return u.toLocaleISODateTimeString(d, 'M')
    }

    toEditable(d) {
        return this.toTSV(d);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {Date | string}
     */
    fromEditable(s) {
        let parts = this.parser.dateTime(s);
        if (parts.constructor === SyntaxError) {
            return s
        }
        parts[3] -= parts[5]; // Get rid of hour offset
        parts[4] -= parts[6]; // Get rid of minute offset
        return new Date(Date.UTC(...parts.slice(0, 5)));
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {Date|*} value
     */
    render(element, value) {
        if (value.constructor !== Date) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = u.toLocaleISODateTimeString(value, this.displayResolution);
            element.className = 'non-string';
        }
    }
}


// /**
//  * Parses a list of local date strings and returns a list of dates. This is only possible because we assert that
//  * the date value must always increase.
//  *
//  * Example:
//  * let dates = ['2019-10-27 01:00', '2019-10-27 02:00', '2019-10-27 02:15', '2019-10-27 02:00', '2019-10-27 02:15', '2019-10-27 03:00'];
//  * localDateStringToDate(dates).map((d, i) => dates[i] + ' -> ' + d.toJSON()).join('\n')
//  *  2019-10-27 01:00 -> 2019-10-26T23:00Z
//  *  2019-10-27 02:00 -> 2019-10-27T00:00Z
//  *  2019-10-27 02:15 -> 2019-10-27T00:15Z
//  *  2019-10-27 02:00 -> 2019-10-27T01:00Z
//  *  2019-10-27 02:15 -> 2019-10-27T01:15Z
//  *  2019-10-27 03:00 -> 2019-10-27T02:00Z
//  *
//  * @param {Array<string>} dateStrings
//  * @returns {Date[]}
//  */
// function localDateStringToDate(dateStrings) {
//     let prevTime = undefined;
//     return dateStrings.map(function (s) {
//         let d = new Date(s);
//         if (d.getTime() <= prevTime) {
//             d = new Date(d.getTime() + 60 * 60 * 1000);
//         }
//         prevTime = d.getTime();
//         return (d);
//     });
// }
