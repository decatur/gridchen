import {test, assert} from './utils.js'
import {createView, createRowMatrixView, createColumnMatrixView} from '../modules/gridchen/DataViews.js'

const schema = {
    title: 'test',
    columnSchemas: [{title: 'number', type: 'number', width: 0}, {title: 'string', type: 'string', width: 0}]
};

test('RowMatrixView', () => {
    const createMatrix = () => [[1, 'b'], [NaN, undefined], [3, 'c'], [2, 'a']];

    test('\tsort', () => {
        const rowMatrix = createMatrix();
        const rowView = createRowMatrixView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([[1, 'b'], [2, 'a'], [3, 'c'], [NaN, undefined]], rowMatrix);
        rowView.sort(1);
        assert.equal([[2, 'a'], [1, 'b'], [3, 'c'], [NaN, undefined]], rowMatrix);
    });


});

test('ColumnMatrixView', () => {
    const createMatrix = () => [[1, NaN, 3, 2], ['b', undefined, 'c', 'a']];

    test('\tsort', () => {
        const colMatrix = createMatrix();
        const colView = createColumnMatrixView(schema, colMatrix);
        colView.sort(0);
        assert.equal([[1, 2, 3, NaN], ['b', 'a', 'c', undefined]], colMatrix);
        colView.sort(1);
        assert.equal([[2, 1, 3, NaN], ['a', 'b', 'c', undefined]], colMatrix);
    });

});


test('Test Invalid Schema', () => {
    const view = createView({title: 'FooBar'}, []);
    assert.equal('createView() received undefined schema', view.message);
});

