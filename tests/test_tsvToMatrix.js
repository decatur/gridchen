import {test, assert} from './utils.js'
import {tsvToMatrix} from '../modules/GridChen.js'

test('tsvToMatrix', () => {
    let matrix = tsvToMatrix("1\t2\r\n3\t4\r\n");
    assert.equal(matrix, [['1', '2'], ['3', '4']]);

    matrix = tsvToMatrix("1\t2\r\n3\t\r\n");
    assert.equal(matrix, [['1', '2'], ['3', '']]);

    matrix = tsvToMatrix("1\t2\r\n3\t");
    assert.equal(matrix, [['1', '2'], ['3', '']]);

    matrix = tsvToMatrix("\r\n");
    assert.equal(matrix, [['']]);
});

