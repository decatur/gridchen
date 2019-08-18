import {test, assert} from './utils.js'
import {FullDate, DatePartialTime, DateTimeConverter, DateTimeStringConverter, FullDateConverter, DatePartialTimeConverter, NumberConverter} from "../modules/gridchen/converter.js";

test('DateTimeStringConverter', () => {
    let converter = new DateTimeStringConverter();
    assert.equal('2019-10-27T01:00+02:00', converter.toString('2019-10-27T01:00+02:00'));
    assert.equal('2019-10-27T01:00+02:00', converter.toString(new String('2019-10-27T01:00+02:00')));
});

test('DateTimeConverter', () => {
    let converter = new DateTimeConverter();
    let d = new Date('2019-10-27T01:00+02:00');
    assert.equal('2019-10-27T01:00+02:00', converter.toString(d));

    let s = converter.toString(d);
    test('fromString after toString is the identity', () => assert.equal(d, converter.fromString(s)));
});

test('FullDateConverter', () => {
    let converter = new FullDateConverter();
    let d = new FullDate(2019,9,27);
    assert.equal(d, converter.fromString('2019-10-27'));
    assert.equal('2019-10-27', converter.toString(d));
    assert.equal('2019-10-27', converter.toString('2019-10-27'));
    assert.equal('2019-10-27', converter.toString(new String('2019-10-27')));

    converter = new FullDateConverter('de');
    assert.equal(d, converter.fromString('27.10.2019'));
    converter = new FullDateConverter('en');
    assert.equal(d, converter.fromString('10/27/2019'));
});

test('DatePartialTimeConverter', () => {
    let converter = new DatePartialTimeConverter();
    let d = new DatePartialTime(2019,9,27, 2, 0);
    assert.equal(d, converter.fromString(new String('2019-10-27T02:00')));
    assert.equal(d, converter.fromString('2019-10-27 02:00'));
    assert.equal('2019-10-27 02:00', converter.toString(d));
    assert.equal('2019-10-27 02:00', converter.toString('2019-10-27 02:00'));
    assert.equal('2019-10-27 02:00', converter.toString(new String('2019-10-27 02:00')));

    converter = new DatePartialTimeConverter(undefined, 'de');
    assert.equal(d, converter.fromString('27.10.2019 02:00'));
    assert.equal(d, converter.fromString('27.10.2019, 02:00'));
    assert.equal(d, converter.fromString('27.10.2019T02:00'));
    converter = new DatePartialTimeConverter(undefined, 'en');
    assert.equal(d, converter.fromString('10/27/2019 02:00'));
    converter = new DatePartialTimeConverter(undefined, 'en-US');
    assert.equal(d, converter.fromString('10/27/2019 02:00'));

    assert.equal('10/27/2019@02:00', converter.fromString('10/27/2019@02:00'));
    assert.equal('10/27/foo 02:00', converter.fromString('10/27/foo 02:00'));
});

test('NumberConverter', () => {
    let converter = new NumberConverter(2);
    // This will work in any locale.
    assert.equal(3.14, converter.fromString(converter.toString(Math.PI)));
});

