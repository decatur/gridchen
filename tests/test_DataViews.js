import {test, assert} from './utils.js'
import {createView} from '../grid-chen/DataViews.js'

const jsonpatch = window.jsonpatch;

test('RowMatrixView', () => {
    const createModel = () => [[1, 'b'], [NaN], [3, 'c'], [2, 'a']];
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

    test('set', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 'x');
        assert.equal(view.getModel(), model);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('add', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 1, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(4, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setSecondAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(5, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteCell', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, undefined);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('set-from-scratch', () => {
        const view = createView(schema, undefined);
        const patch = view.setCell(1, 1, 42);
        const patched = jsonpatch.apply_patch(undefined, patch);
        assert.equal(patched, view.getModel());
    });

    test('splice', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteRow', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteSingleRemainingRow', () => {
        const view = createView(schema, [[1, 'b']]);
        const patch = view.deleteRow(0);
        const patched = jsonpatch.apply_patch([[1, 'b']], patch);
        assert.equal(patched, []);
    });

    test('remove', () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, undefined);
    });

    test('sort', () => {
        const rowMatrix = createModel();
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([[1, 'b'], [2, 'a'], [3, 'c'], [NaN]], rowMatrix);
        rowView.sort(1);
        assert.equal([[2, 'a'], [1, 'b'], [3, 'c'], [NaN]], rowMatrix);
    });


});

test('RowObjectsView', () => {
    const createModel = () => [{c1: 1, c2: 'b'}, {c1: NaN}, {c1: 3, c2: 'c'}, {c1: 2, c2: 'a'}];
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

    test('set', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 'x');
        assert.equal(view.getModel(), model);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('add', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 1, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(4, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setSecondAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(5, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteCell', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, undefined);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('set-from-scratch', () => {
        const view = createView(schema, undefined);
        const patch = view.setCell(1, 1, 42);
        const patched = jsonpatch.apply_patch(undefined, patch);
        assert.equal(patched, view.getModel());
    });

    test('splice', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteRow', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteSingleRemainingRow', () => {
        const view = createView(schema, [{c1: 1, c2: 'b'}]);
        const patch = view.deleteRow(0);
        const patched = jsonpatch.apply_patch([{c1: 1, c2: 'b'}], patch);
        assert.equal(patched, []);
    });

    test('remove', () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, undefined);
    });

    test('sort', () => {
        const rowMatrix = createModel();
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
    const createModel = () => [[1, NaN, 3, 2], ['b', undefined, 'c', 'a']];
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

    test('set', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 'x');
        assert.equal(view.getModel(), model);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('add', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 1, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(4, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setSecondAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(5, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteCell', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, undefined);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('set-from-scratch', () => {
        const view = createView(schema, undefined);
        const patch = view.setCell(1, 1, 42);
        const patched = jsonpatch.apply_patch(undefined, patch);
        assert.equal(patched, view.getModel());
    });

    test('splice', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteRow', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteSingleRemainingRow', () => {
        const view = createView(schema, [[1], ['b']]);
        const patch = view.deleteRow(0);
        const patched = jsonpatch.apply_patch([[1], ['b']], patch);
        assert.equal(patched, [[],[]]);
    });

    test('remove', () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, undefined);
    });

    test('sort', () => {
        const model = createModel();
        const colView = createView(schema, model);
        colView.sort(0);
        assert.equal([[1, 2, 3, NaN], ['b', 'a', 'c', undefined]], model);
        colView.sort(1);
        assert.equal([[2, 1, 3, NaN], ['a', 'b', 'c', undefined]], model);
    });

});

test('ColumnObjectView', () => {
    const createModel = function () {
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

    test('set', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 42);
        assert.equal(view.getModel(), model);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('add', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 1, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(4, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('setSecondAfterLast', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(5, 0, 'x');
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteCell', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, undefined);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('set-from-scratch', () => {
        const view = createView(schema, undefined);
        const patch = view.setCell(1, 1, 'x');
        const patched = jsonpatch.apply_patch(undefined, patch);
        assert.equal(patched, view.getModel());
    });

    test('splice', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteRow', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteSingleRemainingRow', () => {
        const view = createView(schema, {col1: [1], col2: ['b']});
        const patch = view.deleteRow(0);
        const patched = jsonpatch.apply_patch({col1: [1], col2: ['b']}, patch);
        assert.equal(patched, {col1: [], col2: []});
    });

    test('remove', () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, undefined);
    });

    test('sort', () => {
        const model = createModel();
        const colView = createView(schema, model);
        colView.sort(0);
        assert.equal({col1: [1, 2, 3, NaN], col2: ['b', 'a', 'c', undefined]}, model);
        colView.sort(1);
        assert.equal({col1: [2, 1, 3, NaN], col2: ['a', 'b', 'c', undefined]}, model);
    });

});

test('ColumnVectorView', () => {
    const createModel = () => [1, NaN, 3, 2];
    const schema = {
        "title": "Single Column",
        "type": "object",
        "items": {
            "width": 200,
            "type": "number"
        }
    };

    test('set', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, 42);
        assert.equal(view.getModel(), model);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteCell', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(1, 0, undefined);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('set-from-scratch', () => {
        const view = createView(schema, undefined);
        const patch = view.setCell(1, 0, 42);
        const patched = jsonpatch.apply_patch(undefined, patch);
        assert.equal(patched, view.getModel());
    });

    test('splice', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteRow', () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, model);
    });

    test('deleteSingleRemainingRow', () => {
        const view = createView(schema, [1]);
        const patch = view.deleteRow(0);
        const patched = jsonpatch.apply_patch([1], patch);
        assert.equal(patched, []);
    });

    test('remove', () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = jsonpatch.apply_patch(createModel(), patch);
        assert.equal(patched, undefined);
    });

    test('sort', () => {
        const column = createModel();
        const view = createView(schema, column);
        view.sort(0);
        assert.equal([1, 2, 3, NaN], column);
    });

});

test('Test Invalid Schema', () => {
    const view = createView({title: 'FooBar'}, []);
    assert.equal('createView() received undefined schema', view.message);
});

