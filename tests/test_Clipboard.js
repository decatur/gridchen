import {assert, testAsync, log} from './utils.js'
import '../grid-chen/component.js'
import {createRowMatrixView} from "../grid-chen/grid-data-view.js";

function dispatchKey(gc, eventInitDict) {
    gc.shadowRoot.firstElementChild.dispatchEvent(new KeyboardEvent('keydown', eventInitDict));
}

const schema = {
    title: 'test',
    columnSchemas: [{title: 'number', type: 'number', width: 0}, {title: 'string', type: 'string', width: 0}]
};
/**
 * @type {GridChen}
 */
const gc = new (customElements.get('grid-chen'))();
const rows = [
    [0, 'a'],
    [NaN, 'b']
];
const view = createRowMatrixView(schema, rows);
let listener;
gc.resetFromView(view);
gc.addEventListener('dataChanged', (evt) => listener(evt));

(async function () {

    await testAsync('copy', async function () {
        gc.getRangeByIndexes(0, 0, 2, 2).select();
        dispatchKey(gc, {code: 'KeyC', ctrlKey: true});
        const text = await navigator.clipboard.readText();
        log('should copy cells (0,0) ... (1,1) to clipboard');
        assert.equal(`0\ta\r\nNaN\tb`, text);
    });

    await testAsync('should paste cells to (2,1)', async function () {
        await navigator.clipboard.writeText(`0\ta\r\nNaN\tb`);

        listener = (evt) => assert.equal([[0, 'a'], [0, 'a'], [NaN, 'b']], rows);

        dispatchKey(gc, {code: 'ArrowDown'});
        dispatchKey(gc, {code: 'KeyV', ctrlKey: true});
    });

    await testAsync('tiling', async function () {
        await navigator.clipboard.writeText(`3\tc`);

        listener = (evt) => assert.equal([[3, 'c'],[3, 'c'],[NaN, 'b']], rows);

        gc.getRangeByIndexes(0, 0, 2, 2).select();
        dispatchKey(gc, {code: 'KeyV', ctrlKey: true});
    });

    await testAsync('paste outside of column range', async function () {
        await navigator.clipboard.writeText(`3\tc`);

        listener = (evt) => assert.equal([[3, '3'],[3, 'c'],[NaN, 'b']], rows);

        gc.getRangeByIndexes(0, 1, 1, 2).select();
        dispatchKey(gc, {code: 'KeyV', ctrlKey: true});
    });

})();


