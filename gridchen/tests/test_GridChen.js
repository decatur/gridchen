import {test, log, assert} from '../testing/utils.js'
import {GridChen} from '../webcomponent.js'
import {createColumnMatrixView, createRowMatrixView} from "../matrixview.js";
import {NumberConverter} from "../converter.js";
import {Range} from "../selection.js";
import {createTransactionManager} from "../utils.js";

const decimalSep = new NumberConverter(1).decimalSep;

const rowMatrixSchema = {
    title: 'test',
    type: 'array',
    items: {
        type: 'array',
        items:
            [
                {title: 'number', type: 'number', width: 0},
                {title: 'string', type: 'string', width: 0}
            ]
    }
};

test('Activate Cell', async function () {
    const gc = new GridChen();
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const view = createRowMatrixView(rowMatrixSchema, rows);
    //const tm = createTransactionManager();
    gc.resetFromView(view);
    gc._click(0, 0);
    const r = gc.selectedRange;
    assert.equal([0, 0, 1, 1], [r.rowIndex, r.columnIndex, r.rowCount, r.columnCount]);

});

test('Edit Cell', async function () {
    const gc = new GridChen();
    document.body.appendChild(gc);
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const view = createRowMatrixView(rowMatrixSchema, rows);
    const tm = createTransactionManager();
    gc.resetFromView(view, tm);
    gc._click(0, 0);
    gc._keyboard('keydown', {key: " "});
    gc._sendKeys('123 ');
    gc._keyboard('keydown', {code: 'Tab'});
    gc._keyboard('keydown', {key: "a"});
    gc._sendKeys('bc ');
    gc._keyboard('keydown', {code: 'Enter'});

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
    const view = createRowMatrixView(rowMatrixSchema, rows);
    gc.resetFromView(view);

    gc.select(new Range(0, 0, 1, 1));
    let r = gc.selectedRange;
    assert.equal([0, 0, 1, 1], [r.rowIndex, r.columnIndex, r.rowCount, r.columnCount]);
    gc._keyboard('keydown', {code: 'ArrowRight', shiftKey: true});
    gc._keyboard('keydown', {code: 'ArrowDown', shiftKey: true});
    r = gc.selectedRange;
    assert.equal([0, 0, 2, 2], [r.rowIndex, r.columnIndex, r.rowCount, r.columnCount]);
});


test('ColumnMatrix', () => {
    const schema = {
        title: 'test',
        type: 'array',
        items:
            [
                {type: 'array', items: {title: 'number', type: 'number', width: 0}},
                {type: 'array', items: {title: 'string', type: 'string', width: 0}}
            ]
    };
    const gc = new GridChen();
    gc.resetFromView(createColumnMatrixView(schema, [[new Number(0)], ['a']]));
    log('ViewportText');
    assert.equal(`0${decimalSep}00a`, gc._textContent)

    gc._click(0, 0);
    gc._keyboard('keydown', {code: 'ArrowRight', shiftKey: true});
    log('should expand selection');
    const r = gc.selectedRange;
    assert.equal(0, r.rowIndex);
    assert.equal(1, r.rowCount);
    assert.equal(0, r.columnIndex);
    assert.equal(2, r.columnCount);

});

test('RowMatrix', () => {
    const gc = new GridChen();
    gc.resetFromView(createRowMatrixView(rowMatrixSchema, [[0, 'a']]));
    log('ViewportText');
    assert.equal(`0${decimalSep}00a`, gc._textContent)

    gc._click(0, 0);
    gc._keyboard('keydown', {code: 'ArrowRight', shiftKey: true});
    log('should expand selection');
    const r = gc.selectedRange;
    assert.equal(0, r.rowIndex);
    assert.equal(1, r.rowCount);
    assert.equal(0, r.columnIndex);
    assert.equal(2, r.columnCount);
});

test('Delete Selected Rows', () => {
    const gc = new GridChen();
    const rows = [[0, 'a'], [1, 'b']];
    const tm = createTransactionManager();
    gc.resetFromView(createRowMatrixView(rowMatrixSchema, rows), tm);
    gc._click(0, 0);
    // Delete first row
    gc._keyboard('keydown', {key: '-', ctrlKey: true});
    assert.equal([[1, 'b']], rows);

    // Delete remaining row.
    gc._keyboard('keydown', {key: '-', ctrlKey: true});
    assert.equal([], rows);

});



