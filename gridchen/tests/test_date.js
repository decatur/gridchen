import {test, assert} from '../testing/utils.js'
import {localeDateParser, toUTCDateTimeString, resolvePeriod} from "../utils.js";

test('FullDate', () => {
    let parser = localeDateParser(undefined);
    assert.equal([2019, 9, 27], parser.fullDate('2019-10-27').parts);
    assert.equal(true, parser.fullDate('27.10').error !== void 0);
    assert.equal(true, parser.fullDate('2019-27.10').error !== void 0);
    assert.equal(true, parser.fullDate('27/10/2019').error !== void 0);
});

test('deFullDate', () => {
    let parser = localeDateParser('de');
    assert.equal([2019, 9, 27], parser.fullDate('2019-10-27').parts);
    assert.equal([2019, 9, 27], parser.fullDate('27.10.2019').parts);
    assert.equal(true, parser.fullDate('27.10').error !== void 0);
    assert.equal(true, parser.fullDate('2019-27.10').error !== void 0);
    assert.equal(true, parser.fullDate('27/10/2019').error !== void 0);
});

test('enFullDate', () => {
    let parser = localeDateParser('en');
    assert.equal([2019, 9, 27], parser.fullDate('2019-10-27').parts);
    assert.equal([2019, 9, 27], parser.fullDate('10/27/2019').parts);
    assert.equal(true, parser.fullDate('27.10').error !== void 0);
    assert.equal(true, parser.fullDate('2019-27.10').error !== void 0);
    assert.equal(true, parser.fullDate('27.10.2019').error !== void 0);
});

test('deDatePartialTime', () => {
    let parser = localeDateParser('de');
    assert.equal([2019, 9, 27, 1, 2, 0, 0], parser.datePartialTime('2019-10-27 01:02').parts);
    assert.equal([2019, 9, 27, 1, 2, 0, 0], parser.datePartialTime('27.10.2019 01:02').parts);
    assert.equal(true, parser.datePartialTime('foo 01:00').error !== void 0);
});

test('deDateTime', () => {
    let parser = localeDateParser('de');
    assert.equal([2019, 9, 27, 1, 2, 0, 0, 0, 0], parser.dateTime('2019-10-27 01:02Z').parts);
    assert.equal([2019, 9, 27, 1, 2, 0, 0, 1, 0], parser.dateTime('27.10.2019 01:02+01:00').parts);
    assert.equal([2019, 9, 27, 1, 2, 0, 0, -3, 4], parser.dateTime('27.10.2019 01:02-03:04').parts);
    assert.equal([2019, 9, 27, 1, 2, 0, 0, -3, 4], parser.dateTime('27.10.2019T01:02-03:04').parts);
    assert.equal([2019, 9, 27, 1, 2, 13, 123, -3, 4], parser.dateTime('27.10.2019T01:02:13.123456-03:04').parts);
    assert.equal(true, parser.dateTime('27.10.2019').error !== void 0);
    assert.equal(true, parser.dateTime('27.10.2019T01:02:13.1234-03:04').error !== void 0);
});

test('toUTCDateTimeString', () => {
    assert.equal('2020-01-04 01:02:03.012Z', toUTCDateTimeString(
        new Date(Date.UTC(2020, 0, 4, 1, 2, 3, 12)),
        resolvePeriod('MILLISECONDS')));
});




