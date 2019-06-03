import {describe, assertEqual} from './utils.js'
import {createRowMatrixView, createColumnMatrixView} from '../modules/DataViews.js'
import {Rectangle} from '../modules/GridChen.js'
import {NumberStringConverter} from '../modules/converter.js'

const decimalSep = new NumberStringConverter(1).decimalSep;

const schema = {
    title: 'test',
    columnSchemas: [{title: 'number', type: 'number', width: 0}, {title: 'string', type: 'string', width: 0}]
};

describe('RowMatrixView', () => {
    const createMatrix = () => [[1, 'b'], [NaN, undefined], [3, 'c'], [2, 'a']];

    describe('\tsort', () => {
        const rowMatrix = createMatrix();
        const rowView = createRowMatrixView(schema, rowMatrix);
        assertEqual(1, rowView.getCell(0, 0));
        assertEqual('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assertEqual([[1, 'b'], [2, 'a'], [3, 'c'], [NaN, undefined]], rowMatrix);
        rowView.sort(1);
        assertEqual([[2, 'a'], [1, 'b'], [3, 'c'], [NaN, undefined]], rowMatrix);
    });

    describe('\tcopy', () => {
        const rowMatrix = createMatrix();
        const rowView = createRowMatrixView(schema, rowMatrix);
        assertEqual(`NaN\t\r\n3${decimalSep}00\tc`,
            rowView.copy(new Rectangle({min: 1, sup: 3}, {min: 0, sup: 2}), '\t'));

        rowView.paste(1, 0, [['1', '2'], ['1', '2']]);
        assertEqual([[1,"b"],[1,"2"],[1,"2"],[2,"a"]], rowMatrix);
    });
});

describe('ColumnMatrixView', () => {
    const createMatrix = () => [[1, NaN, 3, 2], ['b', undefined, 'c', 'a']];

    describe('\tsort', () => {
        const colMatrix = createMatrix();
        const colView = createColumnMatrixView(schema, colMatrix);
        assertEqual({0: [1, 'b']}, colView.getRows(0, 1));
        colView.sort(0);
        assertEqual([[1, 2, 3, NaN], ['b', 'a', 'c', undefined]], colMatrix);
        colView.sort(1);
        assertEqual([[2, 1, 3, NaN], ['a', 'b', 'c', undefined]], colMatrix);
    });

    describe('\tcopy', () => {
        const colMatrix = createMatrix();
        const colView = createColumnMatrixView(schema, colMatrix);
        assertEqual(`NaN\t\r\n3${decimalSep}00\tc`,
            colView.copy(new Rectangle({min: 1, sup: 3}, {min: 0, sup: 2}), '\t'));

        colView.paste(1, 0, [['1', '2'], ['1', '2']]);
        assertEqual([[1,1,1,2], ["b","2","2","a"]], colMatrix);
    });
});