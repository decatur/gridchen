import {describe, assertEqual} from './utils.js'
import {DateTimeStringConverter, DateStringConverter, DateTimeLocalStringConverter, NumberStringConverter} from "../modules/converter.js";

describe('DateTimeStringConverter', () => {
    let converter = new DateTimeStringConverter();
    let d = new Date('2019-10-27T01:00+02:00');
    let s = converter.toString(d);
    assertEqual(d, converter.fromString(s));
});

describe('DateStringConverter', () => {
    let converter = new DateStringConverter();
    let d = new Date(Date.UTC(2019,9,27));
    assertEqual(d, converter.fromString('2019-10-27'));
    let s = converter.toString(d);
    assertEqual('2019-10-27', s);

    converter = new DateStringConverter('de');
    assertEqual(d, converter.fromString('27.10.2019'));
    converter = new DateStringConverter('en');
    assertEqual(d, converter.fromString('10/27/2019'));
});

describe('DateTimeLocalStringConverter', () => {
    let converter = new DateTimeLocalStringConverter();
    let d = new Date(Date.UTC(2019,9,27, 2));
    assertEqual(d, converter.fromString('2019-10-27T02:00'));
    assertEqual(d, converter.fromString('2019-10-27 02:00'));
    let s = converter.toString(d);
    assertEqual('2019-10-27 02:00', s);

    converter = new DateTimeLocalStringConverter(undefined, 'de');
    assertEqual(d, converter.fromString('27.10.2019 02:00'));
    assertEqual(d, converter.fromString('27.10.2019, 02:00'));
    assertEqual(d, converter.fromString('27.10.2019T02:00'));
    converter = new DateTimeLocalStringConverter(undefined, 'en');
    assertEqual(d, converter.fromString('10/27/2019 02:00'));
    converter = new DateTimeLocalStringConverter(undefined, 'en-US');
    assertEqual(d, converter.fromString('10/27/2019 02:00'));

    assertEqual(new Date(NaN), converter.fromString('10/27/2019@02:00'));
    assertEqual(new Date(NaN), converter.fromString('10/27/foo 02:00'));
});

describe('NumberStringConverter', () => {
    let converter = new NumberStringConverter(2);
    // This will work in any locale.
    assertEqual(3.14, converter.fromString(converter.toString(Math.PI)));
});

