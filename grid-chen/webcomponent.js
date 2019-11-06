/**
 * Author: Wolfgang Kühn 2019
 * Source located at https://github.com/decatur/grid-chen/grid-chen
 *
 * Module implementing the visual grid and scrolling behaviour.
 */

 //@ts-check

import {logger} from "./utils.js";
import {registerGlobalTransactionManager} from "./utils.js";
import {Selection, Range, keyDownHandler} from "./selection.js";
import {createEditor} from "./editor.js"


//////////////////////
// Start Configuration
const cellPadding = 3;
const scrollBarBorderWidth = 1;
const scrollBarThumbWidth = 15;
const lineHeight = 22;
const dark = {
    selectionBackgroundColor: 'slategrey',
    activeCellBackgroundColor: 'dimgrey',
    headerRowBackgroundColor: 'dimgrey',
    headerRowSelectedBackgroundColor: 'slategrey',
    cellBorderWidth: 0.5
};
const light = {
    selectionBackgroundColor: '#c6c6c6',
    activeCellBackgroundColor: '#e6e6e6',
    headerRowBackgroundColor: '#e6e6e6',
    headerRowSelectedBackgroundColor: '#c6c6c6',
    cellBorderWidth: 1
};
// End Configuration
//////////////////////

window.console.log('Executing GridChen ...');

/**
 * Returns a numerical vector from a CSS color of the form rgb(1,2,3).
 * @param {string} color
 * @returns {number[]}
 */
function colorVector(color) {
    return color.substr(4).split(',').map(part => parseInt(part))
}

// We use document.body style for theming.
// TODO: Maybe use CSS custom properties https://developers.google.com/web/fundamentals/web-components/shadowdom#stylehooks
const bodyStyle = window.getComputedStyle(document.body);
const inputColor = bodyStyle.color;
const inputBackgroundColor = bodyStyle.backgroundColor;
const intensity = colorVector(bodyStyle.backgroundColor).reduce((a, b) => a + b, 0) / 3;
let {
    selectionBackgroundColor,
    activeCellBackgroundColor,
    headerRowBackgroundColor,
    headerRowSelectedBackgroundColor,
    cellBorderWidth
} = (intensity < 0xff / 2 ? dark : light);

const cellBorderStyle = `${cellBorderWidth}px solid ` + inputColor;
const scrollBarWidth = scrollBarThumbWidth + 2 * scrollBarBorderWidth;

//const numeric = new Set(['number', 'integer']);

function rangeIterator(count) {
    return Array.from({length: count}, (_, i) => i);
}


/**
 * @returns {HTMLElement}
 */
function openDialog() {
    let dialog = /** @type{HTMLDialogElement} */ (document.getElementById('gridchenDialog'));
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'gridchenDialog';
        document.body.appendChild(dialog);
    }
    dialog.textContent = '';
    dialog.showModal();
    return dialog;
}

/**
 * We export for testability.
 * @implements {GridChenNS.GridChen}
 */
export class GridChen extends HTMLElement {

    constructor() {
        super();
        // Property mixed in later
        this.selectedRange = void 0;
        // Method mixed in later
        this.select = void 0;
    }

    /**
     * @param {GridChenNS.MatrixView} viewModel
     * @param {GridChenNS.TransactionManager=} transactionManager
     * @returns {GridChen}
     */
    resetFromView(viewModel, transactionManager) {
        if (this.shadowRoot) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        } else {
            // First initialize creates shadow dom.
            this.attachShadow({mode: 'open'});
        }
        // TODO: Attention Layout Thrashing; Do not use clientHeight.
        let totalHeight = this.clientHeight || 100;  // Default value needed for unit testing.
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.height = totalHeight + 'px';
        this.shadowRoot.appendChild(container);
        createGrid(container, viewModel, this, transactionManager);
        this.style.width = container.style.width;
        return this
    }
}

customElements.define('grid-chen', GridChen);

class ScrollBar {

    /**
     * @param {HTMLElement} domParent
     * @param {number} xOffset the x-offset for the scroll bar.
     * @param {number} height the height of the vertical scroll bar.
     * @param handler
     */
    constructor(domParent, xOffset, height, handler) {
        /*
            We use a range input element to represent the scroll bar.
            Styling emulates a scroll bar for element overflow,
            See http://twiggle-web-design.com/tutorials/Custom-Vertical-Input-Range-CSS3.html
        */
        const offset = (height - scrollBarWidth) / 2;
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            #slider {
                 position: absolute;
                 cursor: pointer;
                 width: ${height - 2 * scrollBarBorderWidth}px !important;
                 transform:translate(${xOffset - offset}px,${offset}px) rotate(-90deg);
                 -webkit-appearance: unset;
                 border: ${scrollBarBorderWidth}px solid #888;
                 margin: unset;
                 background-color: inherit;
            }
    
            #slider::-webkit-slider-thumb {
                 -webkit-appearance: none;
                 width: ${scrollBarThumbWidth}px;
                 height: ${scrollBarThumbWidth}px;
                 background-color: #888;
            }
        `;
        domParent.appendChild(styleSheet);

        this.handler = handler;
        this.element = document.createElement('input');
        this.element.id = "slider";
        this.element.type = "range";
        this.element.min = '0';
        domParent.appendChild(this.element);

        // When this.element gains focus, container.parentElement.parentElement will loose is, so re-focus.
        this.element.oninput = () => {
            logger.log('slider oninput');
            this.handler(Math.round(Number(this.element.max) - Number(this.element.value)));
        };
    }

    /**
     * @param {number} max
     */
    setMax(max) {
        window.console.assert(max > 0, `Invalid max slider value: ${max}`);
        this.element.max = String(max);
    }

    /**
     * @param {number} value
     */
    setValue(value) {
        this.element.value = String(Number(this.element.max) - value);
    }
}


/**
 * @param {HTMLElement} container
 * @param {GridChenNS.MatrixView} viewModel
 * @param {GridChen} gridchenElement
 * @param {GridChenNS.TransactionManager} tm
 */
function createGrid(container, viewModel, gridchenElement, tm) {
    tm = tm || registerGlobalTransactionManager();
    const schema = viewModel.schema;
    const schemas = schema.columnSchemas;
    const totalHeight = parseInt(container.style.height);
    const rowHeight = lineHeight + 2 * cellBorderWidth;
    const innerHeight = (rowHeight - 2 * cellPadding - cellBorderWidth) + 'px';

    let total = 0;
    const columnEnds = [];
    for (const [index, schema] of schemas.entries()) {
        total += schema.width + cellBorderWidth + 2 * cellPadding;
        columnEnds[index] = total;
    }

    let viewPortRowCount = Math.floor((totalHeight) / rowHeight) - 1;
    const viewPortHeight = rowHeight * viewPortRowCount + cellBorderWidth;
    const gridWidth = columnEnds[columnEnds.length - 1] + cellBorderWidth;
    const styleSheet = document.createElement('style');

    styleSheet.textContent = `
        /* Common style to all data cell elements */
        .GRID span, a {
            position: absolute;
            border: ${cellBorderStyle};
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            height: ${innerHeight};
            padding: ${cellPadding}px;
        }
        
        a:link {
            color: var(--a-link-color);
        }
        
        a:visited {
            color: var(--a-visited-color); 
        }

        /* Important: The selectors string, non-string and error are used exclusively! */
        .GRID .string {
            text-align: left;
        }
        .GRID .non-string {
            text-align: right;
        }
        .GRID .error {
            text-align: left;
            border-color: red;
            z-index: 1;
        }
        
        #headerRow {
            position: absolute;
            text-align: center;
            font-weight: normal;
            background-color: ${headerRowBackgroundColor};
        }

        #info {
            color: inherit;
            background-color: inherit;
            cursor: help;
            font-size: large;
        }
        
        .GRID input, textarea {
            color: ${inputColor};
            background-color: ${inputBackgroundColor};
            position: absolute;
            height: ${innerHeight};
            padding: ${cellPadding}px;
            border-width: ${cellBorderWidth}px;
        }
    `;
    container.appendChild(styleSheet);

    // Only honour first columns sortDirection.
    schemas
        .filter(schema => Math.abs(schema.sortDirection) === 1)
        .slice(1).forEach(function (schema) {
        delete schema.sortDirection;
    });

    const headerRow = document.createElement('div');
    headerRow.id = 'headerRow';
    let style = headerRow.style;
    style.width = gridWidth + 'px';
    style.height = rowHeight + 'px';
    container.appendChild(headerRow);

    const info = document.createElement('span');
    info.id = 'info';
    info.innerText = '🛈';
    style = info.style;
    style.left = gridWidth + 'px';
    //style.top = '-3px';
    style.position = 'absolute';
    info.onclick = showInfo;
    container.appendChild(info);

    //let lastRefreshMillis = -100;

    function refresh() {
        rowCount = viewModel.rowCount();
        // TODO: Can we do better, i.e. send event to selection.grid?
        selection.grid.rowCount = rowCount;
        setFirstRow(firstRow);
        /*if (window.performance.now() - lastRefreshMillis < 100) {
            throw new Error();
        }
        lastRefreshMillis = window.performance.now();
        */
    }

    refreshHeaders();
    makeDataLists();

    /**
     * @param {GridChenNS.Transaction} trans
     */
    function commitTransaction(trans) {
        // Note: First refresh, then commit!
        refresh();
        trans.commit();
        gridchenElement.dispatchEvent(new CustomEvent('change', {detail: {patch: trans.patches}}));
    }

    /**
     * For each enum restricted column with index columnIndex,
     * generate a datalist element with id enum<columnIndex>.
     */
    function makeDataLists() {
        // Note we have to loop over all columns to retain the column index.
        for (const [columnIndex, schema] of schemas.entries()) {
            if (!schema.enum) continue;
            const datalist = document.createElement('datalist');
            datalist.id = 'enum' + columnIndex;
            for (const item of schema.enum) {
                datalist.appendChild(document.createElement('option')).value = String(item);
            }
            container.appendChild(datalist)
        }
    }

    function refreshHeaders() {
        headerRow.textContent = '';
        let left = 0;
        for (const [index, schema] of schemas.entries()) {
            const header = document.createElement('span');
            const style = header.style;
            style.position = 'absolute';
            style.left = left + 'px';
            style.width = schema.width + 'px';
            style.height = innerHeight;
            style.padding = cellPadding + 'px';
            style.border = cellBorderStyle;
            style.overflow = 'hidden';
            header.textContent = schema.title;
            header.title = schema.title;
            if (schema.sortDirection === 1) {
                header.textContent += ' ↑';
            } else if (schema.sortDirection === -1) {
                header.textContent += ' ↓'
            }
            header.onclick = function () {
                // header.textContent = schema.title + ' ' + (header.textContent.substr(-1)==='↑'?'↓':'↑');
                viewModel.sort(index);
                refresh();
            };
            headerRow.appendChild(header);
            left = columnEnds[index];
        }
    }

    container.style.width = (gridWidth + scrollBarWidth) + 'px';

    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.top = rowHeight + 'px';
    body.style.width = '100%';
    body.style.height = (viewPortHeight) + 'px';
    container.appendChild(body);

    /** @type {HTMLElement} */
    let cellParent = document.createElement('div');
    cellParent.className = 'GRID';
    cellParent.style.position = 'absolute';  // Must be absolute otherwise contentEditable=true produces strange behaviour
    cellParent.style.width = gridWidth + 'px';
    cellParent.style.height = viewPortHeight + 'px';
    container.tabIndex = 0;

    const activeCell = {
        openEditor: function (mode, value) {
            // TODO: rowIncrement should depend on scroll direction.
            scrollIntoView(selection.active.rowIndex, selection.active.rowIndex - firstRow);
            const spanStyle = getCell(selection.active).style;
            spanStyle.display = 'none';
            editor.open(mode, value, spanStyle, schemas[selection.active.columnIndex], activeCell.isReadOnly());
        },
        enterInputMode: function (value) {
            activeCell.openEditor('input', value);
        },
        enterEditMode: function () {
            let value = viewModel.getCell(selection.active.rowIndex, selection.active.columnIndex);
            if (value == null) {
                value = '';
            } else {
                value = schemas[selection.active.columnIndex].converter.toEditable(value);
            }
            activeCell.openEditor('edit', value);
        },
        isReadOnly: function () {
            return isColumnReadOnly(selection.active.columnIndex)
        }
    };

    /**
     *
     * @param {GridChenNS.Range} range
     * @param {boolean} show
     */
    function repaintSelection(range, show) {
        let r = range.offset(-firstRow, 0);
        let rr = r.intersect(new Range(0, 0, viewPortRowCount, colCount));
        if (!rr) return;
        for (let row = rr.rowIndex; row < rr.rowIndex + rr.rowCount; row++) {
            for (let col = rr.columnIndex; col < rr.columnIndex + rr.columnCount; col++) {
                const span = cellMatrix[row][col];
                const style = span.style;
                if (!show) {
                    style.removeProperty('background-color');
                } else {
                    style.backgroundColor = selectionBackgroundColor;
                }
            }
        }
    }

    function getCell(range) {
        let r = range.offset(-firstRow, 0);
        if (r.rowIndex < 0 || r.rowIndex >= cellMatrix.length) {
            // Note that active cell must not necessarily in view port.
            return undefined;
        }
        return cellMatrix[r.rowIndex][r.columnIndex];
    }

    function repaintActiveCell(range) {
        const span = getCell(range);
        if (span) {
            // Note that active cell must not necessarily in view port.
            span.style.backgroundColor = activeCellBackgroundColor;
        }
    }

    cellParent.ondblclick = () => activeCell.enterEditMode();

    cellParent.addEventListener('mousedown', function (evt) {
        logger.log('onmousedown');
        // But we do not want it to propagate as we want to avoid side effects.
        evt.stopPropagation();
        // The evt default is (A) to focus container element, and (B) start selecting text.
        // We want (A), but not (B), so we prevent defaults and focus explicitly.
        evt.preventDefault();
        // We need to prevent scroll, otherwise the evt coordinates do not relate anymore
        // with the target element coordinates. OR move this after call of index()!
        container.focus({preventScroll: true});

        selection.startSelection(evt, cellParent, rowHeight, colCount, columnEnds, firstRow)
    });

    /** @param {WheelEvent} evt */
    cellParent.onmousewheel = function (evt) {
        logger.log('onmousewheel');
        if ((/** @type {DocumentOrShadowRoot} */(container.parentNode)).activeElement !== container) return;

        // Do not disable zoom. Both Excel and Browsers zoom on ctrl-wheel.
        if (evt.ctrlKey) return;
        evt.stopPropagation();
        evt.preventDefault();  // Prevents scrolling of any surrounding HTML element.

        window.console.assert(evt.deltaMode === evt.DOM_DELTA_PIXEL);  // We only support Chrome. FireFox will have evt.deltaMode = 1.
        // TODO: Chrome seems to always give evt.deltaY +-150 pixels. Why?
        // Excel scrolls about 3 lines per wheel tick.
        let newFirstRow = firstRow + 3 * Math.sign(evt.deltaY);
        if (newFirstRow >= 0) {
            setFirstRow(newFirstRow);
        }
    };

    /**
     * @param {FocusEvent} evt
     */
    container.onblur = function (evt) {
        logger.log('container.onblur: ' + evt);
        if (!container.contains(/** @type {HTMLElement} */ (evt.relatedTarget))) {
            // We are leaving the component.
            selection.hide();
        }
    };

    container.onfocus = function (evt) {
        logger.log('container.onfocus: ' + evt);
        evt.stopPropagation();
        evt.preventDefault();
        selection.show();
    };

    function isColumnReadOnly(columnIndex) {
        const readOnly = schemas[columnIndex].readOnly;
        return readOnly === undefined ? schema.readOnly : readOnly;
    }

    function isSelectionReadOnly() {
        for (const r of selection.areas) {
            for (let colIndex = r.columnIndex; colIndex < r.columnIndex + r.columnCount; colIndex++) {
                if (isColumnReadOnly(colIndex)) return true
            }
        }
        return false
    }

    function deleteSelection() {
        if (isSelectionReadOnly()) {
            alert('Parts of the cells are locked!');
            return
        }

        const trans = tm.openTransaction();
        const patch = createPatch();
        trans.patches.push(patch);
        const operations = patch.operations;

        for (const r of selection.areas) {
            let rowIndex = r.rowIndex;
            let endRowIndex = Math.min(rowCount, rowIndex + r.rowCount);
            let endColIndex = r.columnIndex + r.columnCount;

            for (; rowIndex < endRowIndex; rowIndex++) {
                for (let colIndex = r.columnIndex; colIndex < endColIndex; colIndex++) {
                    operations.push(...viewModel.setCell(rowIndex, colIndex, undefined));
                }
            }
        }

        let rowIndex = viewModel.rowCount() - 1;
        while (rowIndex >= 0) {
            const row = viewModel.getRow(rowIndex);
            if (row.some(item => item != null)) {
                break
            }
            operations.push(...viewModel.deleteRow(rowIndex));
            rowIndex--;
        }

        if (rowIndex === -1) {
            // We can ignore this patch, because it is included in the patch from updateHolder().
            // TODO: Do we need removeModel()s patch at all? => No, but there is a unit test to that effect.
            void viewModel.removeModel();
            trans.patches.push(viewModel.updateHolder());
        }

        commitTransaction(trans);
    }

    function deleteRows() {
        if (schema.readOnly) {
            alert('This grid is locked!');
            return
        }

        const trans = tm.openTransaction();
        const patch = createPatch();
        trans.patches.push(patch);
        const operations = patch.operations;

        for (const r of selection.areas) {
            rangeIterator(r.rowCount).forEach(function () {
                operations.push(...viewModel.deleteRow(r.rowIndex));  // Note: Always the first row
            });
        }

        commitTransaction(trans);
    }

    function insertRow() {
        if (schema.readOnly) {
            alert('This grid is locked!');
            return
        }
        const trans = tm.openTransaction();
        trans.patches.push(createPatch(viewModel.splice(selection.active.rowIndex)));

        commitTransaction(trans);
    }

    function copySelection(doCut) {
        window.navigator.clipboard.writeText(rangeToTSV(selection.areas[0], '\t', selection.headerSelected))
            .then(() => {
                logger.log('Text copied to clipboard');
                if (doCut) {
                    deleteSelection();
                }
            })
            .catch(err => {
                // This can happen if the user denies clipboard permissions:
                logger.error('Could not copy text: ', err);
            });
    }

    function keyDownListener(evt) {
        logger.log('container.onkeydown ' + evt.code);

        // Note 1: All handlers call both preventDefault() and stopPropagation().
        //         The reason is documented in the handler code.
        // Note 2: For responsiveness, make sure this code is executed fast.

        if ((evt.code === 'KeyC' || evt.code === 'KeyX') && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent text is copied from container.
            if (selection.areas.length > 1) {
                alert('This action is not possible with multi-selections.');
                return
            }
            copySelection(evt.code === 'KeyX');
        } else if (evt.code === 'KeyV' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent that text is pasted into editable container.
            const cond = pastePrecondition();
            if (cond) {
                alert(cond);
                return
            }
            window.navigator.clipboard.readText()
                .then(text => {
                    //log.log('Pasted content: ', text);
                    let matrix = tsvToMatrix(text);
                    if (matrix) {
                        paste(matrix);
                    }
                })
                .catch(err => {
                    logger.error('Failed to read clipboard contents: ', err);
                })
        } else if (evt.code === 'Delete') {
            evt.preventDefault();
            evt.stopPropagation();
            deleteSelection();
        } else if (evt.code === 'F1' && evt.altKey) {
            // Alt + F1 creates a modal chart of the data.
            evt.preventDefault();
            evt.stopPropagation();
            plot();
        } else if (evt.key === '+' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            insertRow();
        } else if (evt.key === '-' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            deleteRows();
        } else if (evt.code === 'F2') {
            evt.preventDefault();
            evt.stopPropagation();
            activeCell.enterEditMode();
        } else if (evt.key.length === 1 && !evt.ctrlKey && !evt.altKey) {
            // evt.key.length === 1 looks like a bad idea to sniff for character input, but keypress is deprecated.
            if (editor.mode === 'hidden' && !activeCell.isReadOnly()) {
                // We now focus the input element. This element would receive the key as value in interactive mode, but
                // not when called as dispatchEvent() from unit tests!
                // We want to make this unit testable, so we stop the propagation and hand over the key.
                evt.preventDefault();
                evt.stopPropagation();
                activeCell.enterInputMode(evt.key);
            }
        }
    }

    /**
     * @param {GridChenNS.Patch} patch
     */
    function tmListener(patch) {
        viewModel.applyJSONPatch(patch.operations);
        viewModel.updateHolder();
        const {rowIndex, columnIndex} = /**@type{{rowIndex: number, columnIndex: number}}*/ (patch.detail);
        selection.setRange(rowIndex, columnIndex, 1, 1);
        // TODO: refresh on transaction level!
        refresh();
    }

    /**
     * @param {GridChenNS.JSONPatchOperation[]=} operations
     * @returns {GridChenNS.Patch}
     */
    function createPatch(operations) {
        return /** @type{GridChenNS.Patch} */ {
            operations: operations || [],
            pathPrefix: schema.pathPrefix,
            apply: tmListener,
            detail: {rowIndex: selection.active.rowIndex, columnIndex: selection.active.columnIndex}
        };
    }

    function showInfo() {
        let dialog = openDialog();
        const div = document.createElement('div');
        const actions = [
            ['Key', 'Action'],
            ['Ctrl+Z', 'Undo last transaction'],
            ['Ctrl+Y', 'Redo, reverse last undo'],
            ['Arrows', 'Move active cell up/down/left/right (not in edit mode)'],
            ['Tab', 'Move active cell right (non-rolling)'],
            ['Enter', 'Move active cell down (non-rolling)'],
            ['Shift + Enter', 'Move active cell up (non-rolling)'],
            ['Shift + Tab', 'Move active cell left (non-rolling)'],
            ['SHIFT + Arrows', 'Select a range of cells'],
            ['Ctrl + Space', 'Select entire column'],
            ['Shift + Space', 'Select entire row'],
            ['Shift + MouseClick', 'Expand selection'],
            ['Ctrl + MouseClick', 'Multi-select cells'],
            ['Ctrl + "-"', 'Delete selected row'],
            ['Ctrl + "+"', 'Insert row before selection'],
            ['Alt + Enter', 'In edit mode, insert newline'],
            ['Page Down', 'Move one page down'],
            ['Page Up', 'Move one page up'],
            ['Ctrl + A', 'Select all grid cells (same as Ctrl+A in a Excel List Object)'],
            ['Ctrl + A Ctrl+A', 'Select the entire grid including header (same as Ctrl+A Ctrl+A in a Excel List Object)'],
            ['ESC', 'Cancel edit or input mode'],
            ['Delete', 'Remove selected cells contents'],
            ['Ctrl + C', 'Copy selected cells to clipboard'],
            ['Ctrl + V', 'Paste clipboard into selected cells'],
            ['Ctrl + X', 'Cut'],
            ['F2', 'Enter edit mode; In input or edit mode, toggle between input and edit.'],
            ['Alt + F1', 'Open a modal chart of the selection.'],
            ['Backspace', 'In input or edit mode, deletes one character to the left'],
            ['Delete', 'In input or edit mode, deletes one character to the right'],
            ['End', 'In input or edit mode, move to the end of the text'],
            ['Home', 'In input or edit mode, move to the beginning of the text']];
        for (const action of actions) {
            const key = document.createElement('span');
            key.textContent = action[0];
            div.appendChild(key);
            const desc = document.createElement('span');
            desc.textContent = action[1];
            div.appendChild(desc);
        }

        div.style.display = 'grid';
        div.style.gridTemplateColumns = 'auto auto';
        div.style.columnGap = '5px';
        dialog.appendChild(div);
    }

    function plot() {
        let dialog = openDialog();
        dialog.style.width = '80%';

        /** @type{Array<number>} */
        const columnIndices = [];
        for (const r of selection.areas) {
            for (let count = 0; count < r.columnCount; count++) {
                columnIndices.push(r.columnIndex + count);
            }
        }

        if (columnIndices.length < 2) {
            dialog.textContent = `🤮 Please select 2 columns or more, you only selected column ${columnIndices[0]}`;
            return
        }

        /** @type{GridChenNS.ColumnSchema[]}*/
        let columnSchemas = [];
        /** @type{number[][]}*/
        const columns = [];
        for (const columnIndex of columnIndices) {
            columnSchemas.push(schemas[columnIndex]);
            columns.push(viewModel.getColumn(columnIndex));
        }

        // Note: We completely erase dialogs content because some frameworks (plotly for example) will cache information
        // in the HTML element.
        dialog.textContent = '';
        const graphElement = dialog.appendChild(document.createElement('div'));
        /** @type {GridChenNS.PlotEventDetail} */
        let detail = Object.assign({
            graphElement: graphElement,
            title: schema.title,
            schemas: columnSchemas,
            columns: columns
        });
        gridchenElement.dispatchEvent(new CustomEvent('plot', {detail: detail}));
    }

    function scrollIntoView(rowIndex, rowIncrement) {
        if (firstRow === 0 && rowIncrement < 0) {
            return;
        }

        const viewRow = rowIndex - firstRow;
        if (viewRow < 0 || viewRow >= viewPortRowCount) {
            setFirstRow(Math.max(0, firstRow + rowIncrement));
        }
    }

    // Note that the slider must before the cells (we avoid using z-order)
    // so that the textarea-resize handle is in front of the slider.
    let scrollBar = new ScrollBar(body, gridWidth, viewPortHeight, (n) => setFirstRow(n, this));

    body.appendChild(cellParent);

    let colCount = schemas.length;

    let firstRow = 0;
    /** @type{number} */
    let rowCount = 0;

    function commitCellEdit(value) {
        logger.log('commitCellEdit');
        getCell(selection.active).style.display = 'inline-block';

        if (!activeCell.isReadOnly()) {
            const rowIndex = selection.active.rowIndex;
            const colIndex = selection.active.columnIndex;

            if (value === '') {
                value = undefined;
            } else {
                value = schemas[colIndex].converter.fromEditable(value.trim());
                //value = value.replace(/\\n/g, '\n');
            }

            const model = viewModel.getModel();
            const operations = viewModel.setCell(rowIndex, colIndex, value);
            const trans = tm.openTransaction();

            if (model !== viewModel.getModel()) {
                trans.patches.push(viewModel.updateHolder());
            } else {
                trans.patches.push(createPatch(operations));
            }

            commitTransaction(trans);
        }

        container.focus({preventScroll: true});
    }

    /** @type {Array<Array<HTMLElement>>} */
    let cellMatrix = Array(viewPortRowCount);
    let pageIncrement = Math.max(1, viewPortRowCount);

    function setFirstRow(_firstRow, caller) {
        refreshHeaders();
        selection.hide();

        firstRow = _firstRow;

        if (caller !== scrollBar) {
            // TODO: remove caller.
            if (scrollBar.max !== rowCount - viewPortRowCount) {
                // Note that rowCount - viewPortRowCount may be 0.
                scrollBar.setMax(Math.max(viewPortRowCount, rowCount - viewPortRowCount));
            }
            scrollBar.setValue(firstRow)
        }

        updateViewportRows(getRangeData(
            new Range(firstRow, 0, viewPortRowCount, colCount)));
        selection.show();
    }

    function createCell(vpRowIndex, colIndex) {
        const schema = schemas[colIndex];
        const elem = schema.converter.createElement();

        cellMatrix[vpRowIndex][colIndex] = elem;
        let style = elem.style;
        style.top = (vpRowIndex * rowHeight) + 'px';
        style.left = (colIndex ? columnEnds[colIndex - 1] : 0) + 'px';
        style.width = schemas[colIndex].width + 'px';
        cellParent.appendChild(elem);
    }

    /**
     * @param {GridChenNS.Range} range
     * @returns {Array<Array<?>>}
     */
    function getRangeData(range) {
        let matrix = Array(range.rowCount);
        for (let i = 0, rowIndex = range.rowIndex; rowIndex < range.rowIndex + range.rowCount; i++, rowIndex++) {
            matrix[i] = Array(range.columnCount);
            if (rowIndex >= rowCount) continue;
            for (let j = 0, colIndex = range.columnIndex; colIndex < range.columnIndex + range.columnCount; colIndex++, j++) {
                matrix[i][j] = viewModel.getCell(rowIndex, colIndex);
            }
        }
        return matrix
    }

    /**
     * TODO: Move this to matrixview.js
     * @param {GridChenNS.Range} r
     * @param {string} sep
     * @param {boolean} withHeaders
     * @returns {string}
     */
    function rangeToTSV(r, sep, withHeaders) {
        const rowMatrix = getRangeData(r);
        let tsvRows = Array(rowMatrix.length);
        for (const [i, row] of rowMatrix.entries()) {
            tsvRows[i] = row.map(function (value, j) {
                let schema = schemas[r.columnIndex + j];
                if (value == null) {
                    return null;
                }
                value = schema.converter.toTSV(value).trim();
                if (value.includes('\t') || value.includes('\n')) {
                    value = '"' + value + '"';
                }
                return value;
            }).join(sep);  // Note that a=[null, 3].join(',') is ',3', which is what we want.
        }
        if (withHeaders) {
            tsvRows.unshift(schemas.map(schema => schema.title).join(sep));
        }
        return tsvRows.join('\r\n')
    }

    function toTSV() {
        const range = new Range(0, 0, rowCount, colCount);
        return rangeToTSV(range, '\t', true)
    }

    /**
     * @param {number} topRowIndex
     * @param {number} topColIndex
     * @param {Array<Array<string|undefined>>} matrix
     * @returns {GridChenNS.JSONPatchOperation[]}
     */
    function pasteSingle(topRowIndex, topColIndex, matrix) {
        let rowIndex = topRowIndex;
        let endRowIndex = rowIndex + matrix.length;
        let endColIndex = Math.min(schemas.length, topColIndex + matrix[0].length);
        /** @type{GridChenNS.JSONPatchOperation[]} */
        let patch = [];

        for (let i = 0; rowIndex < endRowIndex; i++, rowIndex++) {
            let colIndex = topColIndex;

            for (let j = 0; colIndex < endColIndex; colIndex++, j++) {
                let s = matrix[i][j];
                let value;
                if (s !== undefined) {
                    value = schemas[colIndex].converter.fromEditable(s.trim());
                } else {
                    value = s;
                }
                patch.push(...viewModel.setCell(rowIndex, colIndex, value));
            }
        }

        return patch;
    }

    function pastePrecondition() {
        if (selection.areas.length > 1) {
            return 'This action is not possible with multi-selections.'
        }

        if (isSelectionReadOnly()) {
            return 'Parts of the cells are locked!'
        }
    }

    /**
     * If paste target selection is multiple of source row matrix, then tile target with source,
     * otherwise just paste source
     * @param {Array<Array<string>>} matrix
     */
    function paste(matrix) {
        const r = selection.areas[0];

        if (!matrix[0].length) {
            alert('You have nothing to paste')
        }

        const trans = tm.openTransaction();
        const patch = createPatch();
        trans.patches.push(patch);
        const operations = patch.operations;

        const sourceRows = matrix.length;
        const sourceColumns = matrix[0].length;
        const targetRows = r.rowCount;
        const targetColumns = r.columnCount;
        if (targetRows % sourceRows || targetColumns % sourceColumns) {
            operations.push(...pasteSingle(r.rowIndex, r.columnIndex, matrix));
            // TODO: Reshape selection
        } else {
            // Tile target with source.
            for (let i = 0; i < Math.trunc(targetRows / sourceRows); i++) {
                for (let j = 0; j < Math.trunc(targetColumns / sourceColumns); j++) {
                    operations.push(...pasteSingle(r.rowIndex + i * sourceRows, r.columnIndex + j * sourceColumns, matrix));
                }
            }
        }

        commitTransaction(trans);
    }

    function updateViewportRows(matrix) {
        // log.log('setRowData', rowData)
        for (let index = 0; index < cellMatrix.length; index++) {
            let elemRow = cellMatrix[index];
            let row = matrix[index];
            for (let colIndex = 0; colIndex < colCount; colIndex++) {
                let elem = elemRow[colIndex];
                elem.removeAttribute('class');
                let value = (row ? row[colIndex] : undefined);
                if (value == null) { // JavaScript hack: checks also for undefined
                    elem.textContent = '';
                    continue;
                }

                schemas[colIndex].converter.render(elem, value);
            }
        }
    }

    for (let rowIndex = 0; rowIndex < cellMatrix.length; rowIndex++) {
        cellMatrix[rowIndex] = Array(colCount);
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            createCell(rowIndex, colIndex);
        }
    }

    /** @type{GridChenNS.Selection} */
    let selection = /** @type{GridChenNS.Selection} */ (new Selection(repaintSelection));
    selection.grid = {
        container,
        rowCount, // Will be updated on refresh().
        colCount,
        pageIncrement,
        scrollIntoView,
        repaintActiveCell
    };

    selection.setRange(0, 0, 1, 1);

    container.addEventListener('selectionChanged', function () {
        logger.log('selectionChanged');
        headerRow.style.backgroundColor = selection.headerSelected ? headerRowSelectedBackgroundColor : headerRowBackgroundColor;
    });

    // Important: add in this order!
    container.addEventListener('keydown', (evt) => keyDownHandler(evt, selection));
    container.addEventListener('keydown', keyDownListener);

    const editor = createEditor(cellParent, commitCellEdit, selection, lineHeight);

    firstRow = 0;
    refresh();

    Object.defineProperty(gridchenElement, 'selectedRange',
        {
            get: () => ({
                rowIndex: selection.rowIndex, columnIndex: selection.columnIndex,
                rowCount: selection.rowCount, columnCount: selection.columnCount
            })
        }
    );

    /**
     * @param {GridChenNS.Range} range
     */
    gridchenElement.select = function (range) {
        container.focus();
        selection.setRange(range.rowIndex, range.columnIndex, range.rowCount, range.columnCount);
    };

    // TODO: Move this to matrixview module.
    gridchenElement['_toTSV'] = toTSV;

    /**
     * Hidden API for unit testing.
     * Dispatches a mousedown&mouseup event in the middle of the specified cell.
     */
    gridchenElement['_click'] = function (rowIndex, columnIndex) {
        // TODO: This is the inverse of selection.startSelection.index(), so bring it together.
        const rect = cellParent.getBoundingClientRect();
        let grid_y = rowIndex - firstRow;
        let y = rowHeight * (grid_y + 0.5);
        let clientY = y + rect.y;
        let x = ((columnIndex === 0 ? 0 : columnEnds[columnIndex - 1]) + columnEnds[columnIndex]) / 2;
        let clientX = x + rect.x;

        cellParent.dispatchEvent(new MouseEvent('mousedown', {clientX: clientX, clientY: clientY}));
        cellParent.dispatchEvent(new MouseEvent('mouseup', {clientX: clientX, clientY: clientY}));
    };

    /**
     * Hidden API for unit testing.
     * Dispatches the specified keyboard event.
     */
    gridchenElement['_keyboard'] = function (typeArg, eventInitDict) {
        if (editor.mode !== 'hidden') {
            editor._keyboard(typeArg, eventInitDict);
        } else {
            container.dispatchEvent(new KeyboardEvent(typeArg, eventInitDict));
        }
    };

    gridchenElement['_sendKeys'] = function(keys) {
        if (editor.mode !== 'hidden') {
            editor._sendKeys(keys);
        } else if (!activeCell.isReadOnly()) {
            activeCell.enterInputMode(keys);
        }
    };

    Object.defineProperty(gridchenElement, '_textContent',
        {get: () => cellParent.textContent}
    );

    gridchenElement['_refresh'] = refresh;
}

/**
 * Transforms a tsv-formatted text to a matrix of strings.
 * @param {string} text
 * @returns {string[][]}
 */
export function tsvToMatrix(text) {
    let qs = [];
    if (text.includes('"')) {
        [text, qs] = normalizeQuotes(text);
    }

    let lines = text.split(/\r?\n/);
    // We always expect a line separator, so we expect at least two lines.
    // An empty clipboard is encoded as '\n', which yields [['']]
    if (lines[lines.length - 1] === '') {
        lines.pop();
    }

    if (!lines.length) {
        // Note that this should not happen.
        return [];
    }

    let matrix = Array(lines.length);
    let minRowLength = Number.POSITIVE_INFINITY;
    let maxRowLength = Number.NEGATIVE_INFINITY;
    for (const [i, line] of lines.entries()) {
        let row = line.split('\t');
        if (qs.length) {
            row = row.map(function (cell) {
                if (cell === String.fromCharCode(0)) {
                    cell = qs.shift();
                }
                return cell;
            });
        }
        minRowLength = Math.min(minRowLength, row.length);
        maxRowLength = Math.max(maxRowLength, row.length);
        matrix[i] = row
    }

    if (minRowLength !== maxRowLength) {
        // TODO: Why? Just fill with empty values.
        alert('Pasted text must be rectangular.');
        return null;
    }

    return matrix;
}


function normalizeQuotes(text) {
    text = text + '@';
    // Chrome understands s-flag: /(".*?"[^"])/s
    // Firefox does not. So we use the [\s\S] idiom instead
    const a = text.split(/("[\s\S]*?"[^"])/);
    const qs = [];
    for (let i = 1; i < a.length; i += 2) {
        let s = a[i];
        a[i] = String.fromCharCode(0) + s[s.length - 1];
        s = s.substr(1, s.length - 3);
        s = s.replace(/""/g, '"');
        qs.push(s);
    }

    text = a.join('');
    return [text.substr(0, text.length - 1), qs]
}

/*
function complexTsvToMatrix(text) {
    let matrix = [];
    let row = [];
    let i = 0;

    while (true) {
        let nextTab = text.substr(i).indexOf('\t');
        let nextQuote = text.substr(i).indexOf('"');
        let nextNewline = text.substr(i).indexOf('\n');

        if (nextTab === -1) nextTab = Number.POSITIVE_INFINITY;
        if (nextQuote === -1) nextQuote = Number.POSITIVE_INFINITY;
        if (nextNewline === -1) nextNewline = Number.POSITIVE_INFINITY;

        if (nextTab < nextQuote && nextTab < nextNewline) {
            row.push(text.substr(i, nextTab));
            i += 1+nextTab;
        } else if (nextQuote < nextTab && nextQuote < nextNewline) {
            // "sds""d"
            const start = i+nextQuote+1;
            i = start;
            while (true) {
                i += 1;
                if (text[i] === '"' && text[i + 1] !== '"') {
                    break;
                }
            }
            row.push(text.substr(start, i-start));
            i += 1;
        } else if (nextNewline < nextTab && nextNewline < nextQuote) {
            matrix.push(row);
            row = [];
            i += 1+nextNewline;
        } else if (nextTab === Number.POSITIVE_INFINITY && nextQuote === Number.POSITIVE_INFINITY && nextNewline === Number.POSITIVE_INFINITY) {
            if (row) matrix.push(row);
            break;
        }
    }

    return matrix;
}*/

