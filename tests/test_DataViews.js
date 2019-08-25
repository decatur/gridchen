import {test, assert} from './utils.js'
import {createView} from '../grid-chen/DataViews.js'

test('RowMatrixView', () => {
    const createMatrix = () => [[1, 'b'], [NaN, undefined], [3, 'c'], [2, 'a']];
    const schema = {
        "title": "Array of Row Arrays",
        "type": "object",
        "items": {
            "type": "object",
            "items": [
                {title: 'number', type: 'number', width: 0},
                {title: 'string', type: 'string', width: 0}
            ]
        }
    };
    test('\tsort', () => {
        const rowMatrix = createMatrix();
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([[1, 'b'], [2, 'a'], [3, 'c'], [NaN, undefined]], rowMatrix);
        rowView.sort(1);
        assert.equal([[2, 'a'], [1, 'b'], [3, 'c'], [NaN, undefined]], rowMatrix);
    });


});

test('RowObjectsView', () => {
    const createMatrix = () => [{c1: 1, c2: 'b'}, {c1: NaN}, {c1: 3, c2: 'c'}, {c1: 2, c2: 'a'}];
    const schema = {
        "title": "Array of Row Objects",
        "type": "object",
        "items": {
            "type": "object",
            "properties": {
                "c1": {title: 'number', type: 'number', width: 0},
                "c2": {title: 'string', type: 'string', width: 0}
            }
        }
    };
    test('\tsort', () => {
        const rowMatrix = createMatrix();
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([{"c1": 1, "c2": "b"}, {"c1": 2, "c2": "a"}, {"c1": 3, "c2": "c"}, {"c1": "NaN"}], rowMatrix);
        rowView.sort(1);
        assert.equal([{"c1": 2, "c2": "a"}, {"c1": 1, "c2": "b"}, {"c1": 3, "c2": "c"}, {"c1": "NaN"}], rowMatrix);
    });


});

test('ColumnMatrixView', () => {
    const createMatrix = () => [[1, NaN, 3, 2], ['b', undefined, 'c', 'a']];
    const schema = {
        "title": "Array of Column Array",
        "type": "object",
        "items": [
            {
                "type": "object",
                "items": {title: 'number', type: 'number', width: 0}
            },
            {
                "type": "object",
                "items": {title: 'string', type: 'string', width: 0}
            }
        ]
    };
    test('\tsort', () => {
        const colMatrix = createMatrix();
        const colView = createView(schema, colMatrix);
        colView.sort(0);
        assert.equal([[1, 2, 3, NaN], ['b', 'a', 'c', undefined]], colMatrix);
        colView.sort(1);
        assert.equal([[2, 1, 3, NaN], ['a', 'b', 'c', undefined]], colMatrix);
    });

});

test('ColumnObjectView', () => {
    const createObject = function () {
        return {
            col1: [1, NaN, 3, 2],
            col2: ['b', undefined, 'c', 'a']
        };
    };
    const schema = {
        title: 'test',
        type: 'object',
        properties: {
            col1: {"type": "object", items: {title: 'number', type: 'number', width: 0}},
            col2: {"type": "object", items: {title: 'string', type: 'string', width: 0}}
        }
    };
    test('\tsort', () => {
        const columnObject = createObject();
        const colView = createView(schema, columnObject);
        colView.sort(0);
        assert.equal({col1: [1, 2, 3, NaN], col2: ['b', 'a', 'c', undefined]}, columnObject);
        colView.sort(1);
        assert.equal({col1: [2, 1, 3, NaN], col2: ['a', 'b', 'c', undefined]}, columnObject);
    });

});

test('ColumnVectorView', () => {
    const createVector = () => [1, NaN, 3, 2];
    const schema = {
        "title": "Single Column",
        "type": "object",
        "items": {
            "width": 200,
            "type": "number"
        }
    };

    test('\tsort', () => {
        const column = createVector();
        const view = createView(schema, column);
        view.sort(0);
        assert.equal([1, 2, 3, NaN], column);
    });

});

test('Test Invalid Schema', () => {
    const view = createView({title: 'FooBar'}, []);
    assert.equal('createView() received undefined schema', view.message);
});

