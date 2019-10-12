import {testSync, assert, positiveTestNames} from './utils.js'
import {createView} from '../grid-chen/matrixview.js'

const jsonPatch = window.jsonpatch;

positiveTestNames.push();
//positiveTestNames.push(...['RowObjectsView', '...deleteCell11']);

/**
 * Runs tests on all five supported matrix types.
 * @param {GridChen.JSONSchema} schema
 * @param {function():object} createModel
 * @param {object} emptyModel
 */
function testsOnFirstColumn(schema, createModel, emptyModel) {
    testSync('...set', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 'x');
        assert.equal(view.getModel(), model);
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    testSync('...add', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 'x');
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    testSync('...setAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(4, 0, 'x');
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    testSync('...setSecondAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(5, 0, 'x');
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    testSync('...deleteAllCells', () => {
        function deleteCell(rowIndex, columnIndex) {
            const model = createModel();
            const view = createView(schema, model);
            const patch = view.setCell(rowIndex, columnIndex, undefined);
            const patched = jsonPatch.apply_patch(createModel(), patch);
            assert.equal(patched, model);
        }

        const model = createModel();
        const view = createView(schema, model);
        for (let rowIndex = 0; rowIndex < view.rowCount(); rowIndex++) {
            for (let columnIndex = 0; columnIndex < view.columnCount(); columnIndex++) {
                deleteCell(rowIndex, columnIndex);
            }
        }
    });

    testSync('...setAllCells', () => {
        function setCell(rowIndex, columnIndex) {
            const model = createModel();
            const view = createView(schema, model);
            const patch = view.setCell(rowIndex, columnIndex, 'x');
            const patched = jsonPatch.apply_patch(createModel(), patch);
            assert.equal(patched, model);
        }

        const model = createModel();
        const view = createView(schema, model);
        for (let rowIndex = 0; rowIndex < view.rowCount(); rowIndex++) {
            for (let columnIndex = 0; columnIndex < view.columnCount(); columnIndex++) {
                setCell(rowIndex, columnIndex);
            }
        }
    });

    testSync('...set-from-scratch', () => {
        const view = createView(schema, undefined);
        const patch = view.setCell(1, 0, 42);
        const patched = jsonPatch.apply_patch(undefined, patch);
        assert.equal(patched, view.getModel());
    });

    testSync('...splice', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    testSync('...deleteRow', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    testSync('...deleteAllRowsAndOne', () => {
        const model = createModel();
        const view = createView(schema, model);
        const rowCount = view.rowCount();
        view.deleteRow(rowCount);  // NoOp
        for (let i = 0; i < rowCount; i++) {
            view.deleteRow(0);
        }
        assert.equal(emptyModel, view.getModel());
        view.deleteRow(0); // NoOp
        assert.equal(emptyModel, view.getModel());
    });

    testSync('...remove', () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = jsonPatch.apply_patch(createModel(), patch);
        assert.equal(patched, undefined);
    });
}

/*
 * Our test matrix is 3x3 with one unset row and column each and is of the form
 * a ~ b
 * ~ ~ ~
 * c ~ d
 */

testSync('RowMatrixView', () => {
    const createModel = () => [['a', undefined, 'b'], undefined, ['c', undefined, 'd']];
    const emptyModel = [];
    const schema = {
        "title": "Array of Row Arrays",
        "type": "object",
        "items": {
            "type": "object",
            "items": [
                {title: 'c1', type: 'string'},
                {title: 'c2', type: 'string'},
                {title: 'c3', type: 'string'}
            ]
        }
    };

    testsOnFirstColumn(schema, createModel, emptyModel);

    testSync('sort', () => {
        const rowMatrix = [[1, 'b'], [NaN], [3, 'c'], [2, 'a']];
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([[1, 'b'], [2, 'a'], [3, 'c'], [NaN]], rowMatrix);
        rowView.sort(1);
        assert.equal([[2, 'a'], [1, 'b'], [3, 'c'], [NaN]], rowMatrix);
    });

});

testSync('RowObjectsView', () => {
    const createModel = () => [{c1: 'a', c3: 'b'}, undefined, {c1: 'c', c3: 'd'}];
    const emptyModel = [];
    const schema = {
        "title": "Array of Row Objects",
        "type": "object",
        "items": {
            "type": "object",
            "properties": {
                "c1": {title: 'string', type: 'string'},
                "c2": {title: 'string', type: 'string'},
                "c3": {title: 'string', type: 'string'}
            }
        }
    };

    testsOnFirstColumn(schema, createModel, emptyModel);

    testSync('sort', () => {
        const rowMatrix = [{c1: 1, c2: 'b'}, {c1: NaN}, {c1: 3, c2: 'c'}, {c1: 2, c2: 'a'}];
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([{"c1": 1, "c2": "b"}, {"c1": 2, "c2": "a"}, {"c1": 3, "c2": "c"}, {"c1": "NaN"}], rowMatrix);
        rowView.sort(1);
        assert.equal([{"c1": 2, "c2": "a"}, {"c1": 1, "c2": "b"}, {"c1": 3, "c2": "c"}, {"c1": "NaN"}], rowMatrix);
    });

});

testSync('ColumnMatrixView', () => {
    const createModel = () => [['a', undefined, 'c'], undefined, ['b', undefined, 'd']];
    const emptyModel = [[], undefined, []];
    const schema = {
        "title": "Array of Column Array",
        "type": "object",
        "items": [
            {"type": "object", "items": {title: 'c1', type: 'string'}},
            {"type": "object", "items": {title: 'c2', type: 'string'}},
            {"type": "object", "items": {title: 'c3', type: 'string'}},
        ]
    };

    testsOnFirstColumn(schema, createModel, emptyModel);

    testSync('sort', () => {
        const model = [[1, NaN, 3, 2], ['b', undefined, 'c', 'a']];
        const colView = createView(schema, model);
        colView.sort(0);
        assert.equal([[1, 2, 3, NaN], ['b', 'a', 'c', undefined]], model);
        colView.sort(1);
        assert.equal([[2, 1, 3, NaN], ['a', 'b', 'c', undefined]], model);
    });

});

testSync('ColumnObjectView', () => {
    const createModel = function () {
        return {
            col1: ['a', undefined, 'c'],
            col3: ['b', undefined, 'd']
        };
    };
    const emptyModel = {col1: [], col3: []};
    const schema = {
        title: 'testSync',
        type: 'object',
        properties: {
            col1: {"type": "object", items: {title: 'number', type: 'string'}},
            col2: {"type": "object", items: {title: 'string', type: 'string'}},
            col3: {"type": "object", items: {title: 'string', type: 'string'}}
        }
    };

    testsOnFirstColumn(schema, createModel, emptyModel);

    testSync('sort', () => {
        const model = {
            col1: [1, NaN, 3, 2],
            col2: ['b', undefined, 'c', 'a']
        };
        const colView = createView(schema, model);
        colView.sort(0);
        assert.equal({col1: [1, 2, 3, NaN], col2: ['b', 'a', 'c', undefined]}, model);
        colView.sort(1);
        assert.equal({col1: [2, 1, 3, NaN], col2: ['a', 'b', 'c', undefined]}, model);
    });

});

testSync('ColumnVectorView', () => {
    const createModel = () => [1, undefined, 3, 2];
    const emptyModel = [];
    const schema = {
        "title": "Single Column",
        "type": "object",
        "items": {
            "width": 200,
            "type": "number"
        }
    };

    testsOnFirstColumn(schema, createModel, emptyModel);

    testSync('sort', () => {
        const column = [1, NaN, 3, 2];
        const view = createView(schema, column);
        view.sort(0);
        assert.equal([1, 2, 3, NaN], column);
    });

});

testSync('Test Invalid Schema', () => {
    const view = createView({title: 'FooBar'}, []);
    assert.equal('createView() received undefined schema', view.message);
});

