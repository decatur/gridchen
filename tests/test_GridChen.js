import {test, assert} from './utils.js'
import {GridChen} from '../modules/GridChen.js'
import {createColumnMatrixView, createRowMatrixView} from "../modules/DataViews.js";
import {NumberStringConverter} from "../modules/converter.js";

const decimalSep = new NumberStringConverter(1).decimalSep;

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
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const view = createRowMatrixView(schema, rows);
    gc.resetFromView(view);
    dispatchMouseDown(gc);
    dispatch(gc, 'keypress', {key:"2"});
    // TODO: How to dispatchEvent a keypress event to input?
    gc.shadowRoot.getElementById('editor').value = ' 123 ';
    dispatch(gc, 'keydown', {code: 'Tab'});
    dispatch(gc, 'keypress', {key:" "});
    gc.shadowRoot.getElementById('editor').value = ' abc ';
    dispatch(gc, 'keydown', {code: 'Enter'});

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

    let evt;
    gc.setEventListener('selectionChanged', function (_evt) {
        evt = _evt;
    });

    test('ColumnMatrix', () => {
        gc.resetFromView(createColumnMatrixView(schema, [[new Number(0)], ['a']]));
        test('ViewportText', () =>
            assert.equal(`0${decimalSep}00a`, getGridElement(gc).textContent)
        );

        dispatchMouseDown(gc);
        dispatch(gc, 'keydown',{code: 'ArrowRight', shiftKey: true});
        test('should expand selection', () => {
            assert.equal({min: 0, sup: 1}, evt.row);
            assert.equal({min: 0, sup: 2}, evt.col);
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
            assert.equal({min: 0, sup: 1}, evt.row);
            assert.equal({min: 0, sup: 2}, evt.col);
        });
    });

    test('Delete Selected Rows', () => {
        const rows = [[0, 'a'], [1, 'b']];
        gc.resetFromView(createRowMatrixView(schema, rows));
        dispatchMouseDown(gc);
        dispatch(gc, 'keydown', {code: 'ArrowRight', shiftKey: true});

        // Delete first row
        gc.shadowRoot.getElementById('delete').click();
        assert.equal([[1, 'b']], rows);

        // Delete remaining row.
        gc.shadowRoot.getElementById('delete').click();
        assert.equal([], rows);

    });

    test('View is error', () => {
        const error = new Error('FooBar');
        gc.resetFromView(error);
        assert.equal(String(error), gc.shadowRoot.firstElementChild.textContent);
    });
});

