import {test, assert} from './utils.js'
import {GridChen} from '../modules/gridchen/GridChen.js'
import {createColumnMatrixView, createRowMatrixView} from "../modules/gridchen/DataViews.js";
import {NumberConverter} from "../modules/gridchen/converter.js";

const decimalSep = new NumberConverter(1).decimalSep;

function getGridElement(gc) {
    return gc.shadowRoot.querySelector('.GRID');
}

function dispatchMouseDown(gc) {
    getGridElement(gc).dispatchEvent(new MouseEvent('mousedown'));
}

function dispatch(gc, typeArg, eventInitDict) {
    gc.shadowRoot.firstElementChild.dispatchEvent(new KeyboardEvent(typeArg, eventInitDict));
}

const schema = {
    title: 'test',
    columnSchemas: [{title: 'number', type: 'number', width: 0}, {title: 'string', type: 'string', width: 0}]
};

test('Activate Cell', async function () {
    const gc = new GridChen();
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const view = createRowMatrixView(schema, rows);
    gc.resetFromView(view);
    dispatchMouseDown(gc);
    const r = gc.getActiveCell();
    assert.equal([0, 0, 1, 1], [r.rowIndex, r.columnIndex, r.rowCount, r.columnCount]);

});

test('Edit Cell', async function () {
    const gc = new GridChen();
    document.body.appendChild(gc);
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const view = createRowMatrixView(schema, rows);
    gc.resetFromView(view);
    dispatchMouseDown(gc);
    dispatch(gc, 'keydown', {key: " "});
    const editor = gc.shadowRoot.getElementById('editor');
    editor.value += '123 ';
    editor.dispatchEvent(new KeyboardEvent('keydown', {code: 'Tab'}));
    dispatch(gc, 'keydown', {key: "a"});
    editor.value += 'bc ';
    editor.dispatchEvent(new KeyboardEvent('keydown', {code: 'Enter'}));

    assert.equal([
        [123, 'abc'],
        [NaN, 'b']
    ], rows);

});

test('expand selection with keys', async function () {
    const gc = new GridChen();
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const view = createRowMatrixView(schema, rows);
    gc.resetFromView(view);

    gc.getRangeByIndexes(0, 0, 1, 1).select();
    let r = gc.getSelectedRange();
    assert.equal([0, 0, 1, 1], [r.rowIndex, r.columnIndex, r.rowCount, r.columnCount]);
    dispatch(gc, 'keydown',{code: 'ArrowRight', shiftKey: true});
    dispatch(gc, 'keydown', {code: 'ArrowDown', shiftKey: true});
    r = gc.getSelectedRange();
    assert.equal([0, 0, 2, 2], [r.rowIndex, r.columnIndex, r.rowCount, r.columnCount]);
});

test('Selection', () => {
    const gc = new GridChen();

    test('ColumnMatrix', () => {
        gc.resetFromView(createColumnMatrixView(schema, [[new Number(0)], ['a']]));
        test('ViewportText', () =>
            assert.equal(`0${decimalSep}00a`, getGridElement(gc).textContent)
        );

        dispatchMouseDown(gc);
        dispatch(gc, 'keydown',{code: 'ArrowRight', shiftKey: true});
        test('should expand selection', () => {
            const r = gc.getSelectedRange();
            assert.equal(0, r.rowIndex);
            assert.equal(1, r.rowCount);
            assert.equal(0, r.columnIndex);
            assert.equal(2, r.columnCount);
        });
    });

    test('RowMatrix', () => {
        gc.resetFromView(createRowMatrixView(schema, [[0, 'a']]));
        test('ViewportText', () =>
            assert.equal(`0${decimalSep}00a`, getGridElement(gc).textContent)
        );

        dispatchMouseDown(gc);
        dispatch(gc, 'keydown', {code: 'ArrowRight', shiftKey: true});
        test('should expand selection', () => {
            const r = gc.getSelectedRange();
            assert.equal(0, r.rowIndex);
            assert.equal(1, r.rowCount);
            assert.equal(0, r.columnIndex);
            assert.equal(2, r.columnCount);
        });
    });

    test('Delete Selected Rows', () => {
        const rows = [[0, 'a'], [1, 'b']];
        gc.resetFromView(createRowMatrixView(schema, rows));
        dispatchMouseDown(gc);
        // Delete first row
        dispatch(gc, 'keydown', {key: '-', ctrlKey: true});
        assert.equal([[1, 'b']], rows);

        // Delete remaining row.
        dispatch(gc, 'keydown', {key: '-', ctrlKey: true});
        assert.equal([], rows);

    });

    test('View is error', () => {
        const error = new Error('FooBar');
        gc.resetFromView(error);
        assert.equal(String(error), gc.shadowRoot.firstElementChild.textContent);
    });
});

