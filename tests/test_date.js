import {test, assert} from './grid-chen/utils.js'
import {localeDateParser} from "../grid-chen/utils.js";

test('FullDate', () => {
    let parser = localeDateParser();
    assert.equal([2019, 9, 27], parser.fullDate('2019-10-27'));
    assert.equal(SyntaxError, parser.fullDate('27.10').constructor);
    assert.equal(SyntaxError, parser.fullDate('2019-27.10').constructor);
    assert.equal(SyntaxError, parser.fullDate('27/10/2019').constructor);
});

test('deFullDate', () => {
    let parser = localeDateParser('de');
    assert.equal([2019, 9, 27], parser.fullDate('2019-10-27'));
    assert.equal([2019, 9, 27], parser.fullDate('27.10.2019'));
    assert.equal(SyntaxError, parser.fullDate('27.10').constructor);
    assert.equal(SyntaxError, parser.fullDate('2019-27.10').constructor);
    assert.equal(SyntaxError, parser.fullDate('27/10/2019').constructor);
});

test('enFullDate', () => {
    let parser = localeDateParser('en');
    assert.equal([2019, 9, 27], parser.fullDate('2019-10-27'));
    assert.equal([2019, 9, 27], parser.fullDate('10/27/2019'));
    assert.equal(SyntaxError, parser.fullDate('27.10').constructor);
    assert.equal(SyntaxError, parser.fullDate('2019-27.10').constructor);
    assert.equal(SyntaxError, parser.fullDate('27.10.2019').constructor);
});

test('deDatePartialTime', () => {
    let parser = localeDateParser('de');
    assert.equal([2019, 9, 27, 1, 2], parser.datePartialTime('2019-10-27 01:02'));
    assert.equal([2019, 9, 27, 1, 2], parser.datePartialTime('27.10.2019 01:02'));
    assert.equal(SyntaxError, parser.datePartialTime('27.10.2019 01').constructor);
    assert.equal(SyntaxError, parser.datePartialTime('foo 01:00').constructor);
});

test('deDateTime', () => {
    let parser = localeDateParser('de');
    assert.equal([2019, 9, 27, 1, 2, 0, 0], parser.dateTime('2019-10-27 01:02Z'));
    assert.equal([2019, 9, 27, 1, 2, 1, 0], parser.dateTime('27.10.2019 01:02+01:00'));
    assert.equal([2019, 9, 27, 1, 2, -3, 4], parser.dateTime('27.10.2019 01:02-03:04'));
    assert.equal([2019, 9, 27, 1, 2, -3, 4], parser.dateTime('27.10.2019T01:02-03:04'));
    assert.equal(SyntaxError, parser.dateTime('27.10.2019 01+01:00').constructor);
});


