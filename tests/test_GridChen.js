import {describe, it, assert} from './utils.js'
import '../modules/GridChen.js'
import {createColumnMatrixView, createRowMatrixView} from "../modules/DataViews.js";

let clipboardText;
navigator.clipboard.writeText = function (text) {
    clipboardText = text;
    return new Promise(resolve => null);
};

function dispatchMouseDown(gc) {
    gc.shadowRoot.querySelector('.GRID').dispatchEvent(new MouseEvent('mousedown'));
}

function dispatchKey(gc, keyboardEvent) {
    gc.shadowRoot.firstElementChild.dispatchEvent(keyboardEvent);
}

const schema = {
    title: 'test',
    columnSchemas: [{title: 'number', type: 'number', width: 0}, {title: 'string', type: 'string', width: 0}]
};

describe('Selection', () => {
    const gc = new (customElements.get('grid-chen'))();

    //gc.addEventListener('activecellchanged', activecellchanged);
    let evt;
    gc.addEventListener('selectionchanged', function (_evt) {
        evt = _evt;
    });

    describe('ColumnMatrix', () => {
        gc.resetFromView(createColumnMatrixView(schema, [[0], ['a']]));
        dispatchMouseDown(gc);
        dispatchKey(gc, new KeyboardEvent('keydown', {code: 'ArrowRight', shiftKey: true}));
        it('should expand selection', () => {
            assert.equal({min: 0, sup: 1}, evt.row);
            assert.equal({min: 0, sup: 2}, evt.col);
        });
    });

    describe('RowMatrix', () => {
        gc.resetFromView(createRowMatrixView(schema, [[0, 'a']]));
        dispatchMouseDown(gc);
        dispatchKey(gc, new KeyboardEvent('keydown', {code: 'ArrowRight', shiftKey: true}));
        it('should expand selection', () => {
            assert.equal({min: 0, sup: 1}, evt.row);
            assert.equal({min: 0, sup: 2}, evt.col);
        });
    });
});

describe('Clipboard', () => {
    const gc = new (customElements.get('grid-chen'))();
    gc.resetFromView(createColumnMatrixView(schema, [[0, 1], ['a', 'b']]));
    dispatchMouseDown(gc);
    dispatchKey(gc, new KeyboardEvent('keydown', {code: 'ArrowRight', shiftKey: true}));
    dispatchKey(gc, new KeyboardEvent('keydown', {code: 'ArrowDown', shiftKey: true}));
    dispatchKey(gc, new KeyboardEvent('keydown', {code: 'KeyC', ctrlKey: true}));

    it('should copy cells (0,0) to (1,1) to clipboard', () => {
        assert.equal('0,00\ta\r\n1,00\tb', clipboardText);
    });
});