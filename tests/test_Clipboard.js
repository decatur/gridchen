import {assert, testAsync} from './utils.js'
import '../grid-chen/webcomponent.js'
import {createView} from "../grid-chen/matrixview.js";
import {createTransactionManager} from "../grid-chen/utils.js"

function dispatchKey(gc, eventInitDict) {
    gc.shadowRoot.firstElementChild.dispatchEvent(new KeyboardEvent('keydown', eventInitDict));
}

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

(async function () {

    await testAsync('copy', async function () {
        const rows = [
            [0, 'a'],
            [NaN, 'b']
        ];
        const gc = new (customElements.get('grid-chen'))();
        gc.resetFromView(createView(schema, rows), tm);

        gc.getRangeByIndexes(0, 0, 2, 2).select();
        dispatchKey(gc, {code: 'KeyC', ctrlKey: true});
        const text = await navigator.clipboard.readText();
        assert.equal(`0\ta\r\nNaN\tb`, text);
    });

    await testAsync('should paste cells to (2,1)', async function () {
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
            dispatchKey(gc, {code: 'ArrowDown'});
            dispatchKey(gc, {code: 'KeyV', ctrlKey: true});
        });
        assert.equal([[0, 'a'], [0, 'a'], [NaN, 'b']], rows);
    });


    await testAsync('tiling', async function () {
        const rows = [
            [0, 'a'],
            [NaN, 'b']
        ];
        const gc = new (customElements.get('grid-chen'))();
        gc.resetFromView(createView(schema, rows), tm);

        await navigator.clipboard.writeText(`3\tc`);
        gc.getRangeByIndexes(0, 0, 2, 2).select();
        await tm.requestTransaction(function () {
            dispatchKey(gc, {code: 'KeyV', ctrlKey: true});
        });
        assert.equal([[3, 'c'], [3, 'c']], rows)
    });

    await testAsync('paste outside of column range', async function () {
        const rows = [
            [0, 'a'],
            [NaN, 'b']
        ];
        const gc = new (customElements.get('grid-chen'))();
        gc.resetFromView(createView(schema, rows), tm);

        await navigator.clipboard.writeText(`3\tc`);
        gc.getRangeByIndexes(0, 1, 1, 1).select();
        await tm.requestTransaction(function () {
            dispatchKey(gc, {code: 'KeyV', ctrlKey: true});
        });
        assert.equal([[0, '3'], [NaN, 'b']], rows);
    });


})();


