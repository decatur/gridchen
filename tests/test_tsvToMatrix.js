import {describe, assertEqual} from './utils.js'
import {tsvToMatrix} from '../modules/GridChen.js'

describe('tsvToMatrix', () => {
    let matrix = tsvToMatrix("1\t2\r\n3\t4\r\n");
    assertEqual(matrix, [['1', '2'], ['3', '4']]);

    matrix = tsvToMatrix("1\t2\r\n3\t\r\n");
    assertEqual(matrix, [['1', '2'], ['3', '']]);

    matrix = tsvToMatrix("1\t2\r\n3\t");
    assertEqual(matrix, [['1', '2'], ['3', '']]);

    matrix = tsvToMatrix("\r\n");
    assertEqual(matrix, [['']]);
});

