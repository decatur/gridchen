import {test, assert} from './utils.js'
import {DateTimeStringConverter, DateStringConverter, DateTimeLocalStringConverter, NumberConverter} from "../modules/gridchen/converter.js";

test('DateTimeStringConverter', () => {
    let converter = new DateTimeStringConverter();
    let d = new Date('2019-10-27T01:00+02:00');
    assert.equal('2019-10-27T01:00+02', converter.toString(d));
    assert.equal('2019-10-27T01:00+02:00', converter.toString('2019-10-27T01:00+02:00'));
    assert.equal('2019-10-27T01:00+02:00', converter.toString(new String('2019-10-27T01:00+02:00')));

    let s = converter.toString(d);
    test('fromString o toString is the identity', () => assert.equal(d, converter.fromString(s)));
});

test('DateStringConverter', () => {
    let converter = new DateStringConverter();
    let d = new Date(Date.UTC(2019,9,27));
    assert.equal(d, converter.fromString('2019-10-27'));
    assert.equal('2019-10-27', converter.toString(d));
    assert.equal('2019-10-27', converter.toString('2019-10-27'));
    assert.equal('2019-10-27', converter.toString(new String('2019-10-27')));

    converter = new DateStringConverter('de');
    assert.equal(d, converter.fromString('27.10.2019'));
    converter = new DateStringConverter('en');
    assert.equal(d, converter.fromString('10/27/2019'));
});

test('DateTimeLocalStringConverter', () => {
    let converter = new DateTimeLocalStringConverter();
    let d = new Date(Date.UTC(2019,9,27, 2));
    assert.equal(d, converter.fromString(new String('2019-10-27T02:00')));
    assert.equal(d, converter.fromString('2019-10-27 02:00'));
    assert.equal('2019-10-27 02:00', converter.toString(d));
    assert.equal('2019-10-27 02:00', converter.toString('2019-10-27 02:00'));
    assert.equal('2019-10-27 02:00', converter.toString(new String('2019-10-27 02:00')));

    converter = new DateTimeLocalStringConverter(undefined, 'de');
    assert.equal(d, converter.fromString('27.10.2019 02:00'));
    assert.equal(d, converter.fromString('27.10.2019, 02:00'));
    assert.equal(d, converter.fromString('27.10.2019T02:00'));
    converter = new DateTimeLocalStringConverter(undefined, 'en');
    assert.equal(d, converter.fromString('10/27/2019 02:00'));
    converter = new DateTimeLocalStringConverter(undefined, 'en-US');
    assert.equal(d, converter.fromString('10/27/2019 02:00'));

    assert.equal('10/27/2019@02:00', converter.fromString('10/27/2019@02:00'));
    assert.equal('10/27/foo 02:00', converter.fromString('10/27/foo 02:00'));
});

test('NumberConverter', () => {
    let converter = new NumberConverter(2);
    // This will work in any locale.
    assert.equal(3.14, converter.fromString(converter.toString(Math.PI)));
});

