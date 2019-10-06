import {testSync, assert} from './utils.js'
import * as c from "../grid-chen/converter.js";

testSync('URIConverter', () => {
    const converter = new c.URIConverter();
    const markdown = '[foobar](http://foobar.org)'
    assert.equal(markdown, converter.toTSV(markdown));
    assert.equal(markdown, converter.toEditable(markdown));
    assert.equal(markdown, converter.fromEditable(markdown));

    const elem = document.createElement('a');
    converter.render(elem, markdown);
    assert.equal('foobar', elem.textContent);
    assert.equal('http://foobar.org/', elem.href)
    assert.equal('non-string', elem.className);

    converter.render(elem, 123);
    assert.equal('123', elem.textContent)
    assert.equal('error', elem.className);
});

testSync('BooleanStringConverter', () => {
    let converter = new c.BooleanStringConverter();
    assert.equal('true', converter.toTSV(true));
    assert.equal('true', converter.toEditable(true));

    for (const truely of ['true', 'wahr', '1', 'y']) {
        assert.equal(true, converter.fromEditable(truely));
    }

    for (const falsey of ['false', 'falsch', '0', 'n']) {
        assert.equal(false, converter.fromEditable(falsey));
    }

    const elem = document.createElement('span');
    converter.render(elem, true);
    assert.equal('true', elem.textContent);
    assert.equal('non-string', elem.className);

    converter.render(elem, 13);
    assert.equal('13', elem.textContent);
    assert.equal('error', elem.className);
});

testSync('NumberConverter', () => {
    function pi(locale, fractionDigits, piLongString, piShortString) {
        const converter = new c.NumberConverter(fractionDigits, locale);
        assert.equal(piLongString, converter.toTSV(Math.PI));
        assert.equal(piLongString, converter.toEditable(Math.PI));
        assert.equal(3.1415926536, converter.fromEditable(piLongString));

        const elem = document.createElement('span');
        converter.render(elem, Math.PI);
        assert.equal(piShortString, elem.textContent);
        assert.equal('non-string', elem.className);

        converter.render(elem, {});
        assert.equal('[object Object]', elem.textContent);
        assert.equal('error', elem.className);
    }

    pi('de', 2,'3,1415926536', '3,14');
    pi('en', 2,'3.1415926536', '3.14');
    pi('de', 0,'3,1415926536', '3');
    pi('en', 0,'3.1415926536', '3');
});

testSync('FullDateStringConverter', () => {
    let converter = new c.FullDateStringConverter('de');
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27', converter.toEditable('2019-10-27'));
    assert.equal('2019-10-27', converter.fromEditable('27.10.2019'));
    assert.equal('2019-10-27', converter.fromEditable('2019-10-27'));

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27');
    assert.equal('2019-10-27', elem.textContent);
    assert.equal('non-string', elem.className);

    converter.render(elem, 'not_a_date');
    assert.equal('not_a_date', elem.textContent);
    assert.equal('error', elem.className);
});


testSync('DatePartialTimeStringConverter', () => {
    let converter = new c.DatePartialTimeStringConverter('M', 'de');
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27 00:00', converter.toEditable('2019-10-27T00:00'));
    assert.equal('2019-10-27T00:00', converter.fromEditable('2019-10-27T00:00'));
    assert.equal('2019-10-27T00:00', converter.fromEditable('27.10.2019 00:00'));

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27T01:00');
    assert.equal('2019-10-27 01:00', elem.textContent);
    assert.equal('non-string', elem.className);

    converter.render(elem, 'not_a_date');
    assert.equal('not_a_date', elem.textContent);
    assert.equal('error', elem.className);
});

testSync('DateTimeStringConverter', () => {
    let converter = new c.DateTimeStringConverter();
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27 01:00+02:00', converter.toTSV('2019-10-27T01:00+02:00'));
    assert.equal('2019-10-27 00:00+02:00', converter.toEditable('2019-10-27T00:00+02:00'));
    assert.equal('2019-10-27T02:00+02:00', converter.fromEditable('2019-10-27T00:00Z'));
    assert.equal('2019-10-27T00:00+02:00', converter.fromEditable('2019-10-27T00:00+02:00'));
    assert.equal('2019-10-27T00:00+02:00', converter.fromEditable('27.10.2019 00:00+02:00'));

    converter = new c.DateTimeStringConverter('H');
    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27T01:00+02:00');
    assert.equal('2019-10-27 01+02:00', elem.textContent);
    assert.equal('non-string', elem.className);

    converter.render(elem, 'not_a_date');
    assert.equal('not_a_date', elem.textContent);
    assert.equal('error', elem.className);

});

testSync('FullDateConverter', () => {
    throw new Error('TODO: Review from here')
    let converter = new c.FullDateConverter();
    let d = new Date(Date.UTC(2019, 9, 27));
    assert.equal(d, converter.fromEditable('2019-10-27'));
    assert.equal('2019-10-27', converter.toTSV(d));
    assert.equal('2019-10-27', converter.toTSV('2019-10-27'));

    converter = new c.FullDateConverter('de');
    assert.equal(d, converter.fromEditable('27.10.2019'));
    converter = new c.FullDateConverter('en');
    assert.equal(d, converter.fromEditable('10/27/2019'));
});

testSync('DatePartialTimeConverter', () => {
    let converter = new c.DatePartialTimeConverter();
    let d = new Date(Date.UTC(2019, 9, 27, 2, 0));
    assert.equal(d, converter.fromEditable('2019-10-27 02:00'));
    assert.equal('2019-10-27 02:00', converter.toTSV(d));
    assert.equal('2019-10-27 02:00', converter.toTSV('2019-10-27 02:00'));

    converter = new c.DatePartialTimeConverter(undefined, 'de');
    assert.equal(d, converter.fromEditable('27.10.2019 02:00'));
    assert.equal(d, converter.fromEditable('27.10.2019T02:00'));

    converter = new c.DatePartialTimeConverter(undefined, 'en');
    assert.equal(d, converter.fromEditable('10/27/2019 02:00'));

    converter = new c.DatePartialTimeConverter(undefined, 'en-US');
    assert.equal(d, converter.fromEditable('10/27/2019 02:00'));

    assert.equal('10/27/2019@02:00', converter.fromEditable('10/27/2019@02:00'));
    assert.equal('10/27/foo 02:00', converter.fromEditable('10/27/foo 02:00'));
});

testSync('DateTimeConverter Minute', () => {
    let converter = new c.DateTimeConverter();
    let d = new Date('2019-10-27T01:00+02:00');
    assert.equal('2019-10-27 01:00+02:00', converter.toTSV(d));
    assert.equal(d, converter.fromEditable(converter.toTSV(d)));
    assert.equal(d, converter.fromEditable('2019-10-27 01:01+02:01'));

    const elem = document.createElement('span');
    converter.render(elem, new Date('2019-10-27T01:00+02:00'));
    assert.equal('2019-10-27 01:00+02:00', elem.textContent);
    assert.equal('non-string', elem.className);
});

testSync('DateTimeConverter Hour', () => {
    let converter = new c.DateTimeConverter('H');
    let d = new Date('2019-10-27T01:00+02:00');
    assert.equal('2019-10-27 01:00+02:00', converter.toTSV(d));
    assert.equal(d, converter.fromEditable(converter.toTSV(d)));
    assert.equal(d, converter.fromEditable('2019-10-27 01:01+02:01'));
});



