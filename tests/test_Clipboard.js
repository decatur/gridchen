import {assert, test} from './grid-chen/utils.js'
import '../grid-chen/webcomponent.js'
import {createView} from "../grid-chen/matrixview.js";
import {createTransactionManager} from "../grid-chen/utils.js"
import {Range} from "../grid-chen/selection.js";

/**
 * @type {GridChen.JSONSchema}
 */
const schema = {
    title: 'test',
    type: 'array',
    items: {
        type: 'array',
        items: [
            {title: 'number', type: 'number', width: 0},
            {title: 'string', type: 'string', width: 0}
        ]
    }
};

const tm = createTransactionManager();

test('copy', async function () {
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const gc = new (customElements.get('grid-chen'))();
    gc.resetFromView(createView(schema, rows), tm);

    gc.select(new Range(0, 0, 2, 2));
    gc._keyboard('keydown', {code: 'KeyC', ctrlKey: true});
    const text = await navigator.clipboard.readText();
    assert.equal(`0\ta\r\nNaN\tb`, text);
});

test('should paste cells to (2,1)', async function () {
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const gc = new (customElements.get('grid-chen'))();
    gc.resetFromView(createView(schema, rows), tm);
    // Write to clipboard 2x2 matrix
    //  0    a
    //  NaN  b

    await navigator.clipboard.writeText(`0\ta\r\nNaN\tb`);
    await tm.requestTransaction(function () {
        gc._keyboard('keydown', {code: 'ArrowDown'});
        gc._keyboard('keydown', {code: 'KeyV', ctrlKey: true});
    });
    assert.equal([[0, 'a'], [0, 'a'], [NaN, 'b']], rows);
});


test('tiling', async function () {
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const gc = new (customElements.get('grid-chen'))();
    gc.resetFromView(createView(schema, rows), tm);

    await navigator.clipboard.writeText(`3\tc`);
    gc.select(new Range(0, 0, 2, 2));
    await tm.requestTransaction(function () {
        gc._keyboard('keydown',  {code: 'KeyV', ctrlKey: true});
    });
    assert.equal([[3, 'c'], [3, 'c']], rows)
});

test('paste outside of column range', async function () {
    const rows = [
        [0, 'a'],
        [NaN, 'b']
    ];
    const gc = new (customElements.get('grid-chen'))();
    gc.resetFromView(createView(schema, rows), tm);

    await navigator.clipboard.writeText(`3\tc`);
    gc.select(new Range(0, 1, 1, 1));
    await tm.requestTransaction(function () {
        gc._keyboard('keydown', {code: 'KeyV', ctrlKey: true});
    });
    assert.equal([[0, '3'], [NaN, 'b']], rows);
});
