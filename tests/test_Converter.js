import {testSync, assert} from './utils.js'
import * as c from "../grid-chen/converter.js";

testSync('URIConverter', () => {
    const converter = new c.URIConverter();
    const markdown = '[foobar](http://foobar.org)';
    assert.equal(markdown, converter.toTSV(markdown));
    assert.equal(markdown, converter.toEditable(markdown));
    assert.equal(markdown, converter.fromEditable(markdown));

    const elem = document.createElement('a');
    converter.render(elem, markdown);
    assert.equal('foobar', elem.textContent);
    assert.equal('http://foobar.org/', elem.href);
    assert.equal('non-string', elem.className);

    converter.render(elem, 123);
    assert.equal('123', elem.textContent);
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

    pi('de', 2, '3,1415926536', '3,14');
    pi('en', 2, '3.1415926536', '3.14');
    pi('de', 0, '3,1415926536', '3');
    pi('en', 0, '3.1415926536', '3');
});

const sampleDateTimes = {};
sampleDateTimes['default'] = ['2019-10-27T02:00+02:00', '2019-10-27 02:00+02:00', '2019-10-27T00:00Z'];
sampleDateTimes['de'] = sampleDateTimes['default'].concat(['27.10.2019 02:00+02:00']);
sampleDateTimes['en'] = sampleDateTimes['default'].concat(['10/27/2019 02:00+02:00']);

function assertNotADate(converter, elem) {
    converter.render(elem, 'not_a_date');
    assert.equal('not_a_date', elem.textContent);
    assert.equal('error', elem.className);
}

testSync('FullDateStringConverter', () => {
    function run(locale, localizedDates) {
        let converter = new c.FullDateStringConverter(locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27', converter.toEditable('2019-10-27'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27');
        assert.equal('2019-10-27', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, ['2019-10-27']));
    testSync('... de',
        () => run('de', ['2019-10-27', '27.10.2019']));
    testSync('... en',
        () => run('en', ['2019-10-27', '10/27/2019']))
});


testSync('DatePartialTimeStringConverter', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeStringConverter('M', locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02:00', converter.toEditable('2019-10-27T02:00'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27T02:00', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27T02:00');
        assert.equal('2019-10-27 02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, ['2019-10-27T02:00']));
    testSync('... de',
        () => run('de', ['2019-10-27T02:00', '27.10.2019 02:00']));
    testSync('... en',
        () => run('en', ['2019-10-27T02:00', '10/27/2019 02:00']))

});

testSync('DateTimeStringConverter', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeStringConverter(undefined, locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 01:00+02:00', converter.toTSV('2019-10-27T01:00+02:00'));
        assert.equal('2019-10-27 00:00+02:00', converter.toEditable('2019-10-27T00:00+02:00'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27T02:00+02:00', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27T01:00+02:00');
        assert.equal('2019-10-27 01:00+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, sampleDateTimes['default']));
    testSync('... de',
        () => run('de', sampleDateTimes['de']));
    testSync('... en',
        () => run('en', sampleDateTimes['en']))
});

testSync('FullDateConverter', () => {
    function run(locale, localizedDates) {
        let converter = new c.FullDateConverter(locale);
        let d = new Date(Date.UTC(2019, 9, 27));
        assert.equal('2019-10-27', converter.toTSV(d));
        assert.equal('2019-10-27', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, ['2019-10-27']));
    testSync('... de',
        () => run('de', ['2019-10-27', '27.10.2019']));
    testSync('... en',
        () => run('en', ['2019-10-27', '10/27/2019']))
});

testSync('DatePartialTimeConverter Minute', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeConverter(undefined, locale);
        let d = new Date(Date.UTC(2019, 9, 27, 2, 0));

        assert.equal('2019-10-27 02:00', converter.toTSV(d));
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, ['2019-10-27 02:00', '2019-10-27T02:00']));
    testSync('... de',
        () => run('de', ['27.10.2019 02:00']));
    testSync('... en',
        () => run('en', ['10/27/2019 02:00']))
});

testSync('DatePartialTimeConverter Hour', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeConverter('H', locale);
        let d = new Date(Date.UTC(2019, 9, 27, 2, 0));

        assert.equal('2019-10-27 02:00', converter.toTSV(d));
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, ['2019-10-27 02:00', '2019-10-27T02:00']));
    testSync('... de',
        () => run('de', ['27.10.2019 02:00']));
    testSync('... en',
        () => run('en', ['10/27/2019 02:00']))
});

testSync('DateTimeConverter Minute', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeConverter('M', locale);
        let d = new Date('2019-10-27T02:00+02:00');
        assert.equal('2019-10-27 02:00+02:00', converter.toTSV(d));
        assert.equal('2019-10-27 02:00+02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:00+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, sampleDateTimes['default']));
    testSync('... de',
        () => run('de', sampleDateTimes['de']));
    testSync('... en',
        () => run('en', sampleDateTimes['en']))
});

testSync('DateTimeConverter Hour', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeConverter('H', locale);
        let d = new Date('2019-10-27T02:00+02:00');
        assert.equal('2019-10-27 02:00+02:00', converter.toTSV(d));
        assert.equal('2019-10-27 02:00+02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    testSync('... default',
        () => run(undefined, sampleDateTimes['default']));
    testSync('... de',
        () => run('de', sampleDateTimes['de']));
    testSync('... en',
        () => run('en', sampleDateTimes['en']))

});



