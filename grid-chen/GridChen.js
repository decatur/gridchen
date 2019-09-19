/**
 * Author: Wolfgang Kühn 2019
 * https://github.com/decatur/GridChen
 *
 * See README.md
 */

/** @typedef {{row: number, col:number}} */
let IPosition;

/**
 * Right open interval.
 * @typedef {{min: number, sup:number}}
 */
let IInterval;

window.console.log('Executing GridChen ...');

//const numeric = new Set(['number', 'integer']);

function range(count) {
    return Array.from({length: count}, (_, i) => i);
}

let logCounter = 0;
// TODO: Rename to logger.
const console = {
    assert: window.console.assert,
    log: function (a, b) {
        window.console.log(logCounter++ + ': ' + a, b);
    },
    error: function (a, b) {
        window.console.error(logCounter++ + ': ' + a, b);
    }
};

/**
 * @param {IInterval} i1
 * @param {IInterval} i2
 * @returns {IInterval}
 */
function intersectInterval(i1, i2) {
    const min = Math.max(i1.min, i2.min);
    const sup = Math.min(i1.sup, i2.sup);
    if (sup <= min) {
        return undefined;
    }
    return {min, sup};
}

// We export for testability.
export class GridChen extends HTMLElement {
    constructor() {
        super();
        this.eventListeners = {
            'dataChanged': () => null,
            'activeCellChanged': () => null,
            'selectionChanged': () => null,
            'paste': () => null,
            'plot': undefined
        };
    }

    /**
     * @param {GridChen.MatrixView} viewModel
     */
    resetFromView(viewModel) {
        if (this.shadowRoot) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        } else {
            // First initialize creates shadow dom.
            this.attachShadow({mode: 'open'});
        }
        let totalHeight = this.clientHeight || 100;  // Default value needed for unit testing.
        const container = document.createElement('div');
        container.style.height = totalHeight + 'px';
        this.shadowRoot.appendChild(container);
        if (viewModel instanceof Error) {
            container.innerText = String(viewModel);
            return null
        }
        this.grid = Grid(container, viewModel, this.eventListeners);
        return this
    }

    setEventListener(type, listener) {
        const filteredKeys = Object.keys(this.eventListeners).filter(key => key.toLowerCase() === type.toLowerCase());
        if (!filteredKeys) {
            throw new Error('Invalid listener type: ' + type);
        }
        this.eventListeners[filteredKeys[0]] = function (_) {
            try {
                listener(...arguments);
            } catch (err) {
                console.error(err);
            }
        };
        return this
    }

    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     * @param {number} rowCount
     * @param {number} columnCount
     * @returns {GridChen.Range}
     */
    getRangeByIndexes(rowIndex, columnIndex, rowCount, columnCount) {
        return this.grid.getRange(rowIndex, columnIndex, rowCount, columnCount);
    }

    /**
     * @returns {GridChen.Range}
     */
    getSelectedRange() {
        return this.grid.getSelection();
    }

    /**
     * @returns {GridChen.Range}
     */
    getActiveCell() {
        return this.grid.getActiveCell();
    }
}

customElements.define('grid-chen', GridChen);

class Slider {

    /**
     * @param {number} left
     * @param {number} height
     * @param handler
     */
    constructor(left, height, handler) {
        this.handler = handler;
        this.element = document.createElement('input');
        this.element.type = "range";
        const style = this.element.style;
        if (navigator.userAgent.includes('Firefox')) {
            this.element.setAttribute('orient', 'vertical');
        } else {
            // Setting -webkit-appearance will prevent to set any custom styles on it
            style['-webkit-appearance'] = 'slider-vertical';
        }
        style.position = 'absolute';
        style.display = 'inline-block';
        //this.element.style.marginLeft = '10px'
        style.height = height + 'px';
        style.left = left + 'px';
        style.width = '20px';
        this.element.min = '0';

        // When this.element gains focus, container.parentElement.parentElement will loose is, so re-focus.
        this.element.oninput = () => {
            console.log('slider oninput');
            this.handler(Math.round(this.element.max - this.element.value));
        };
    }

    /**
     * @param {number} max
     */
    setMax(max) {
        console.assert(max > 0, `Invalid max slider value: ${max}`);
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
 * @param {number} row
 * @param {number} col
 * @returns {IPosition}
 */
function pos(row, col) {
    return {row: row, col: col}
}

class Range {
    constructor(rowIndex, columnIndex, rowCount, columnCount) {
        this.rowIndex = rowIndex;
        this.columnIndex = columnIndex;
        this.rowCount = rowCount;
        this.columnCount = columnCount;
    }

    toString() {
        return `Range(${this.rowIndex}, ${this.columnIndex}, ${this.rowCount}, ${this.columnCount})`
    }

    /**
     * TODO: Implement on Range.
     * Intersect this range with another range.
     * @param {Range} other
     * @returns {Range}
     */
    intersect(other) {
        const row = intersectInterval(
            {min: this.rowIndex, sup: this.rowIndex + this.rowCount},
            {min: other.rowIndex, sup: other.rowIndex + other.rowCount});
        const col = intersectInterval(
            {min: this.columnIndex, sup: this.columnIndex + this.columnCount},
            {min: other.columnIndex, sup: other.columnIndex + other.columnCount});
        if (col === undefined || row === undefined) {
            return undefined;
        }
        return new Range(row.min, col.min, row.sup - row.min, col.sup - col.min)
    }

    /**
     * Copy this range to an offset position.
     * @param {number} rowOffset
     * @param {number} colOffset
     * @returns {Range}
     */
    offset(rowOffset, colOffset) {
        return new Range(
            this.rowIndex + rowOffset, this.columnIndex + colOffset,
            this.rowCount, this.columnCount)
    }
}

class Selection extends Range {
    constructor(repainter, eventListeners) {
        super(0, 0, 1, 1);
        this.initial = pos(0, 0);
        this.head = pos(0, 0); // Cell opposite the initial.
        this.repainter = repainter;
        this.eventListeners = eventListeners;
        /** @type{Array<Range>} */
        this.areas = [];
    }

    /**
     */
    show() {
        for (const /** @type{Range} */ r of this.areas) {
            console.log('show: ' + r.toString());
            this.repainter('LightBlue', r);
        }
    }

    hide() {
        for (const r of this.areas) {
            this.repainter(undefined, r);
        }
    }

    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     */
    set(rowIndex, columnIndex) {
        console.log('Selection.set');
        this.hide(); // TODO: Why?
        this.initial = {row: rowIndex, col: columnIndex};
        this.head = {row: rowIndex, col: columnIndex};
        this.areas = [];
        this.add(rowIndex, columnIndex);
        this.eventListeners['selectionChanged'](this);
    }

    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     */
    expand(rowIndex, columnIndex) {
        console.log('Selection.expand');
        this.hide();

        this.head = {row: rowIndex, col: columnIndex};
        const r = this.areas.pop();
        r.rowIndex = Math.min(this.initial.row, rowIndex);
        r.columnIndex = Math.min(this.initial.col, columnIndex);
        r.rowCount = 1 + Math.max(this.initial.row, rowIndex) - r.rowIndex;
        r.columnCount = 1 + Math.max(this.initial.col, columnIndex) - r.columnIndex;
        this.areas.push(r);
        this.convexHull();
        this.show();
        this.eventListeners['selectionChanged'](this);
    }

    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     */
    add(rowIndex, columnIndex) {
        console.log('Selection.add');
        this.hide(); // TODO: Why?
        this.areas.push(new Range(rowIndex, columnIndex, 1, 1));
        this.convexHull();
        this.eventListeners['selectionChanged'](this);
    }

    /**
     * Synchronizes the convex hull of all areas.
     */
    convexHull() {
        this.rowIndex = Math.min(...this.areas.map(r => r.rowIndex));
        this.rowCount = Math.max(...this.areas.map(r => r.rowIndex + r.rowCount)) - this.rowIndex;
        this.columnIndex = Math.min(...this.areas.map(r => r.columnIndex));
        this.columnCount = Math.max(...this.areas.map(r => r.columnIndex + r.columnCount)) - this.columnIndex;
    }
}


const cellBorderWidth = 1;
const cellPadding = 3;


/**
 * @param {HTMLElement} container
 * @param {GridChen.MatrixView} viewModel
 * @param {Array<function()>} eventListeners
 */
function Grid(container, viewModel, eventListeners) {
    const schema = viewModel.schema;
    const schemas = schema.columnSchemas;
    let totalHeight = parseInt(container.style.height);

    let styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .GRID textarea {
            background-color: white; border: {cellBorderWidth}px solid black; padding: {cellPadding}px;
        }
        .GRID .non_string { text-align: right; }
    `;
    container.appendChild(styleSheet);

    const rowHeight = 22;
    const innerHeight = (rowHeight - 2 * cellPadding - cellBorderWidth) + 'px';

    let total = 0;
    const columnEnds = [];
    for (const [index, schema] of schemas.entries()) {
        total += schema.width + 2 * cellBorderWidth + 2 * cellPadding;
        columnEnds[index] = total;
    }

    // Only honour first columns sortDirection.
    schemas
        .filter(schema => Math.abs(schema.sortDirection) === 1)
        .slice(1).forEach(function (schema) {
        delete schema.sortDirection;
    });

    const headerRow = document.createElement('div');
    let style = headerRow.style;
    style.position = 'relative';
    style.width = columnEnds[columnEnds.length - 1] + 'px';
    style.height = rowHeight + 'px';
    style.textAlign = 'center';
    style.fontWeight = 'bold';
    style.backgroundColor = 'khaki';
    container.appendChild(headerRow);

    function refresh(_rowCount) {
        rowCount = _rowCount;
        setFirstRow(firstRow)
    }

    refreshHeaders();
    makeDataLists();

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
                datalist.appendChild(document.createElement('option')).value = item;
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
            style.border = '1px solid black';
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
                refresh(viewModel.rowCount());
            };
            headerRow.appendChild(header);
            left = columnEnds[index];
        }
    }

    let totalWidth = columnEnds[columnEnds.length - 1] + 20;
    container.style.width = totalWidth + 'px';

    const body = document.createElement('div');
    body.style.position = 'relative';
    body.style.width = '100%';
    body.style.height = (totalHeight - 20) + 'px';
    container.appendChild(body);

    let viewPortRowCount = Math.floor((totalHeight - 20) / rowHeight);
    const viewPortHeight = rowHeight * viewPortRowCount;
    let cellParent = /** @type {HTMLElement} */ document.createElement('div');
    cellParent.className = "GRID";
    cellParent.style.position = 'absolute';  // Must be absolute otherwise contentEditable=true produces strange behaviour
    cellParent.style.display = 'inline-block';
    cellParent.style.width = columnEnds[columnEnds.length - 1] + 'px';
    cellParent.style.height = viewPortHeight + 'px';
    container.tabIndex = 0;

    class Editor {

        constructor(container) {
            /** @type{HTMLInputElement} */
            this.input = document.createElement('input');
            this.input.id = 'editor';
            this.input.style.position = 'absolute';
            this.input.style.display = 'none';
            this.input.style.height = innerHeight;
            this.input.style.padding = cellPadding + 'px';

            /** @type{HTMLTextAreaElement} */
            this.textarea = document.createElement('textarea');
            this.textarea.id = 'textarea';
            this.textarea.style.position = 'absolute';
            this.textarea.style.display = 'none';
            this.textarea.style.height = innerHeight;
            this.textarea.style.padding = cellPadding + 'px';

            function foo(evt) {
                // Clicking editor should invoke default: move the caret. It should not delegate to containers action.
                evt.stopPropagation();
            }

            this.input.addEventListener('keydown', this.keydownHandler);
            this.textarea.addEventListener('keydown', this.keydownHandler);

            this.input.addEventListener('mousedown', foo);
            this.textarea.addEventListener('mousedown', foo);

            container.appendChild(this.input);
            container.appendChild(this.textarea);
        }

        /**
         * @param {KeyboardEvent} evt
         */
        keydownHandler(evt) {
            console.log('editor.onkeydown: ' + evt.code);
            // Clicking editor should invoke default: move caret. It should not delegate to containers action.
            evt.stopPropagation();

            if (evt.code === 'F2') {
                evt.preventDefault();
                evt.stopPropagation();
                // Toggle between input and edit mode
                activeCell.mode = (activeCell.mode === 'input' ? 'edit' : input);
            } else if (evt.code === 'ArrowLeft' && activeCell.mode === 'input') {
                evt.preventDefault();
                evt.stopPropagation();
                navigateCell(evt, 0, -1);
            } else if (evt.code === 'ArrowRight' && activeCell.mode === 'input') {
                evt.preventDefault();
                evt.stopPropagation();
                navigateCell(evt, 0, 1);
            } else if (evt.code === 'Enter' && evt.altKey) {
                evt.preventDefault();
                evt.stopPropagation();
                if (ee.input.style.display !== 'none') {
                    ee.showTextArea();
                } else {
                    ee.textarea.setRangeText('\n', ee.textarea.selectionStart, ee.textarea.selectionEnd, 'end');
                }
            } else if (evt.code === 'Enter') {
                evt.preventDefault();
                evt.stopPropagation();
                commit();
                navigateCell(evt, evt.shiftKey ? -1 : 1, 0);
            } else if (evt.code === 'Tab') {
                evt.preventDefault();
                evt.stopPropagation();
                commit();
                navigateCell(evt, 0, evt.shiftKey ? -1 : 1);
            } else if (evt.code === 'Escape') {
                // Leave edit mode.
                evt.preventDefault();
                evt.stopPropagation();
                commit();
            }
        }

        blurHandler(evt) {
            console.log('editor.onblur');
            commit();

            if (!container.contains(evt.relatedTarget)) {
                container.blur();
                activeCell.hide();
                selection.hide();
            }
        }

        hide() {
            this.setValue('');
            if (this.input.style.display !== 'none') {
                this.input.style.display = 'none';
            } else {
                this.textarea.style.display = 'none';
            }
        }

        showInput(top, left, width) {
            const style = this.input.style;
            style.top = top;
            style.left = left;
            style.width = (parseInt(width) + 20) + 'px';  // Account for the resize handle, which is about 20px
            //style.height = innerHeight;
            if (schemas[activeCell.col].enum) {
                this.input.setAttribute('list', 'enum' + activeCell.col);
            } else {
                this.input.removeAttribute('list');
            }

            this.input.readOnly = activeCell.isReadOnly();  // Must not use disabled!

            style.display = 'inline-block';
            // focus on input element, which will then receive this keyboard event.
            // Note: focus after display!
            // Note: It is ok to scroll on focus here.
            this.input.focus();
            this.input.addEventListener('blur', this.blurHandler);
        }

        showTextArea() {
            const style = this.input.style;
            style.display = 'none';
            this.input.removeEventListener('blur', this.blurHandler);
            this.textarea.style.left = style.left;
            this.textarea.style.top = style.top;
            this.textarea.style.display = 'inline-block';

            this.textarea.readOnly = activeCell.isReadOnly();  // Must not use disabled!

            this.textarea.value = this.input.value;
            this.textarea.focus();
            //window.setTimeout(()=>textarea.focus(), 10);
            this.textarea.addEventListener('blur', this.blurHandler);
        }

        /**
         * @param {string} value
         */
        setValue(value) {
            if (this.input.style.display !== 'none') {
                this.input.value = value;
                if (value.includes('\n')) {
                    this.showTextArea();
                    this.textarea.value = value;
                }
            } else {
                this.textarea.value = value;
            }
        }

        getValue() {
            if (this.input.style.display !== 'none') {
                return this.input.value;
            } else {
                return this.textarea.value;
            }
        }
    }


    /** @type {{span?:{HTMLSpanElement}, editor:{HTMLInputElement}, row:number, col:number, mode:string}} */
    const activeCell = {
        span: undefined,
        row: 0,
        col: 0,
        mode: 'display',
        hide: function () {
            if (this.span) this.span.style.backgroundColor = 'white';
            headerRow.style.backgroundColor = 'khaki';//removeProperty('background-color');
            //rowMenu.style.display = 'none';
        },
        show: function () {
            if (this.span) this.span.style.backgroundColor = 'mistyrose';
            //rowMenu.style.top = this.span.offsetTop + 'px';
            //rowMenu.style.display = 'block';
        },
        move: function (rowIndex, colIndex) {
            this.hide();
            const targetRow = rowIndex - firstRow;
            if (targetRow < 0 || targetRow >= viewPortRowCount) return;
            this.span = spanMatrix[rowIndex - firstRow][colIndex];
            this.col = colIndex;
            this.row = rowIndex;
            this.show();
            eventListeners['activeCellChanged'](this);
        },
        enterMode: function () {
            if (this.row < firstRow) {
                // scroll into view
                setFirstRow(this.row)
            }

            const spanStyle = this.span.style;
            spanStyle.display = 'none';
            ee.showInput(spanStyle.top, spanStyle.left, spanStyle.width);
        },
        enterInputMode: function (value) {
            this.mode = 'input';
            this.enterMode();
            ee.input.value = value;
        },
        enterEditMode: function () {
            this.mode = 'edit';
            this.enterMode();
            let value = viewModel.getCell(this.row, this.col);
            if (value === undefined || value === null) {
                value = '';
            } else {
                value = schemas[this.col].converter.toEditable(value);
            }
            ee.setValue(value);
        },
        isReadOnly: function() {
            return isColumnReadOnly(this.col)
        }
    };

    /**
     *
     * @param {string?} backgroundColor
     * @param {Range} range
     */
    function repaintRange(backgroundColor, range) {
        let r = range.offset(-firstRow, 0);
        let rr = r.intersect(new Range(0, 0, viewPortRowCount, colCount));
        if (!rr) return;
        for (let row = rr.rowIndex; row < rr.rowIndex + rr.rowCount; row++) {
            for (let col = rr.columnIndex; col < rr.columnIndex + rr.columnCount; col++) {
                const span = spanMatrix[row][col];
                const style = span.style;
                if (spanMatrix[row][col] === activeCell.span) {
                    // Do not change color of active cell.
                } else if (backgroundColor === undefined) {
                    style.backgroundColor = 'white'; //removeProperty('background-color');
                } else {
                    style.backgroundColor = backgroundColor;
                }
            }
        }
    }

    cellParent.onmousedown = function (evt) {
        console.log('onmousedown');
        // But we do not want it to propagate as we want to avoid side effects.
        evt.stopPropagation();
        // The evt default is (A) to focus container element, and (B) start selecting text.
        // We want (A), but not (B), so we prevent defaults and focus explicitly.
        evt.preventDefault();
        // We need to prevent scroll, otherwise the evt coordinates do not relate anymore
        // with the target element coordinates. OR move this after call of index()!
        container.focus({preventScroll: true});

        const rect = cellParent.getBoundingClientRect();

        function index(evt) {
            const y = evt.clientY - rect.y;
            const x = evt.clientX - rect.x;
            // console.log(x + ' ' + y);
            const grid_y = Math.trunc(y / rowHeight);
            let grid_x = 0;
            for (grid_x; grid_x < colCount; grid_x++) {
                if (columnEnds[grid_x] > x) {
                    break;
                }
            }
            return {rowIndex: grid_y + firstRow, colIndex: grid_x}
        }

        let {rowIndex, colIndex} = index(evt);

        if (evt.shiftKey) {
            selection.expand(rowIndex, colIndex);
        } else if (evt.ctrlKey) {
            selection.add(rowIndex, colIndex);
            selection.show();
        } else {
            navigateCell(evt, rowIndex - activeCell.row, colIndex - activeCell.col);
            selection.set(rowIndex, colIndex);
        }

        function resetHandlers() {
            cellParent.onmousemove = cellParent.onmouseup = cellParent.onmouseleave = undefined;
        }

        cellParent.onmousemove = function (evt) {
            let {rowIndex, colIndex} = index(evt);
            console.log(`onmousemove ${rowIndex} ${colIndex}`);

            if (rowIndex - firstRow < spanMatrix.length) {
                selection.expand(rowIndex, colIndex);
            }
        };

        cellParent.onmouseleave = function () {
            console.log('onmouseleave');
            resetHandlers();
        };

        cellParent.onmouseup = function () {
            console.log('onmouseup');
            resetHandlers();
            cellParent.focus(); // So that we receive keyboard events.
        }
    };

    cellParent.onmousewheel = function (_evt) {
        console.log('onmousewheel');

        if (container.parentNode.activeElement !== container) return;

        let evt = /** @type {WheelEvent} */ _evt;
        // Do not disable zoom. Both Excel and Browsers zoom on ctrl-wheel.
        if (evt.ctrlKey) return;
        evt.stopPropagation();
        evt.preventDefault();  // Prevents scrolling of any surrounding HTML element.

        console.assert(evt.deltaMode === evt.DOM_DELTA_PIXEL);  // We only support Chrome. FireFox will have evt.deltaMode = 1.
        // TODO: Chrome seems to always give evt.deltaY +-150 pixels. Why?
        // Excel scrolls about 3 lines per wheel tick.
        let newFirstRow = firstRow + 3 * Math.sign(evt.deltaY);
        if (newFirstRow >= 0) {
            setFirstRow(newFirstRow);
        }
    };

    container.onblur = function (evt) {
        console.log('container.onblur: ' + evt);
        if (!container.contains(/** @type {HTMLElement} */ evt.relatedTarget)) {
            // We are leaving the component.
            activeCell.hide();
            selection.hide();
        }
    };

    container.onfocus = function (evt) {
        console.log('container.onfocus: ' + evt);
        evt.stopPropagation();
        evt.preventDefault();
        activeCell.show();
        selection.show();
    };

    function isColumnReadOnly(columnIndex) {
        const readOnly = schemas[columnIndex].readOnly
        return readOnly === undefined?schema.readOnly:readOnly;
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
        const patches = [];
        // const modifiedRows = new Set();
        for (const r of selection.areas) {
            let rowIndex = r.rowIndex;
            let endRowIndex = Math.min(rowCount, rowIndex + r.rowCount);
            let endColIndex = r.columnIndex + r.columnCount;

            for (; rowIndex < endRowIndex; rowIndex++) {
                //modifiedRows.add(rowIndex);
                for (let colIndex = r.columnIndex; colIndex < endColIndex; colIndex++) {
                    patches.push(...viewModel.setCell(rowIndex, colIndex, undefined));
                }
            }
        }

        /*for (const rowIndex of Array.from(modifiedRows).sort().reverse()) {
            const row = viewModel.getRow(rowIndex);
            if (row.every(item => item == null)) {
                patches.push(...viewModel.deleteRow(rowIndex));
            }
        }*/

        let rowIndex = viewModel.rowCount() - 1;
        while (rowIndex >= 0) {
            const row = viewModel.getRow(rowIndex);
            if (row.some(item => item != null)) {
                break
            }
            patches.push(...viewModel.deleteRow(rowIndex));
            rowIndex--;
        }

        if (rowIndex === -1) {
            patches.push(...viewModel.removeModel())
        }

        eventListeners['dataChanged'](patches);
        refresh(viewModel.rowCount());
    }

    function deleteRows() {
        const patches = [];
        for (const r of selection.areas) {
            range(r.rowCount).forEach(function (i) {
                patches.push(...viewModel.deleteRow(r.rowIndex));  // Note: Always the first row
            });
        }

        eventListeners['dataChanged'](patches);
        refresh(viewModel.rowCount());
    }

    function insertRow() {
        /* TODO: Should we restrict?
        if (isSelectionReadOnly()) {
            alert('Parts of the cells are locked!');
            return
        }*/
        const patches = viewModel.splice(activeCell.row);
        eventListeners['dataChanged'](patches);
        refresh(viewModel.rowCount());
    }

    function copySelection(doCut, withHeaders) {
        window.navigator.clipboard.writeText(rangeToTSV(selection.areas[0], '\t', withHeaders))
            .then(() => {
                console.log('Text copied to clipboard');
                if (doCut) {
                    deleteSelection();
                }
            })
            .catch(err => {
                // This can happen if the user denies clipboard permissions:
                console.error('Could not copy text: ', err);
            });
    }

    container.onkeydown = function (evt) {
        console.log('container.onkeydown ' + evt.code);
        //if (activeCell.mode === 'edit') throw Error();
        // Note 1: All handlers call both preventDefault() and stopPropagation().
        //         The reason is documented in the handler code.
        // Note 2: For responsiveness, make sure this code is executed fast.

        if (evt.code === 'ArrowLeft' || (evt.code === "Tab" && evt.shiftKey)) {
            evt.preventDefault();
            evt.stopPropagation();
            navigateCell(evt, 0, -1);
        } else if (evt.code === 'ArrowRight' || evt.code === 'Tab') {
            evt.preventDefault();
            evt.stopPropagation();
            navigateCell(evt, 0, 1);
        } else if (evt.code === "ArrowUp" || (evt.code === "Enter" && evt.shiftKey)) {
            evt.preventDefault();
            evt.stopPropagation();
            navigateCell(evt, -1, 0);
        } else if (evt.code === 'ArrowDown' || evt.code === 'Enter') {
            evt.preventDefault();
            evt.stopPropagation();
            navigateCell(evt, 1, 0);
        } else if (evt.code === 'PageUp') {
            evt.preventDefault();
            evt.stopPropagation();
            navigateCell(evt, -pageIncrement, 0);
        } else if (evt.code === 'PageDown') {
            evt.preventDefault();
            evt.stopPropagation();
            navigateCell(evt, pageIncrement, 0);
        } else if (evt.code === 'KeyA' && evt.ctrlKey) {
            // Like MS-Excel selects all non-empty cells, in our case the complete grid.
            // This is reverted on the next onblur event.
            evt.preventDefault();  // Do not select the inputs content.
            evt.stopPropagation();
            if (selection.rowIndex === 0 && selection.columnIndex === 0
                && selection.rowCount === rowCount && selection.columnCount === colCount) {
                // Already all data cells selected.
                headerRow.style.backgroundColor = 'red';
            } else {
                selection.set(0, 0);
                selection.expand(rowCount - 1, colCount - 1);
            }
        } else if ((evt.code === 'KeyC' || evt.code === 'KeyX') && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent text is copied from container.
            if (selection.areas.length > 1) {
                alert('This action is not possible with multi-selections.');
                return
            }
            copySelection(evt.code === 'KeyX', headerRow.style.backgroundColor === 'red');
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
                    //console.log('Pasted content: ', text);
                    let matrix = tsvToMatrix(text);
                    if (matrix) {
                        refresh(paste(matrix));
                        eventListeners['paste']();
                    }
                })
                .catch(err => {
                    console.error('Failed to read clipboard contents: ', err);
                })
        } else if (evt.code === 'Escape') {
            // Leave edit mode.
            evt.preventDefault();
            evt.stopPropagation();
            commit();
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
        } else if (evt.code === 'Space' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            selection.set(0, activeCell.col);
            selection.expand(rowCount - 1, activeCell.col);
        } else if (evt.code === 'Space' && evt.shiftKey) {
            evt.preventDefault();
            evt.stopPropagation();
            selection.set(activeCell.row, 0);
            selection.expand(activeCell.row, colCount);
        } /*else if (evt.code === 'F10' && evt.shiftKey) {
            // Both Web and Excel binding of context menu.
            evt.preventDefault();
            evt.stopPropagation();
            showContextMenu();
        } */ else if (evt.code === 'F2') {
            evt.preventDefault();
            evt.stopPropagation();
            activeCell.enterEditMode();
        } else if (evt.key.length === 1 && !evt.ctrlKey && !evt.altKey) {
            // evt.key.length === 1 looks like a bad idea to sniff for character input, but keypress is deprecated.
            if (activeCell.mode === 'display' && !activeCell.isReadOnly()) {
                // We now focus the input element. This element would receive the key as value in interactive mode, but
                // not when called as dispatchEvent() from unit tests!
                // We want to make this unit testable, so we stop the propagation and hand over the key.
                evt.preventDefault();
                evt.stopPropagation();
                activeCell.enterInputMode(evt.key);
            }
        }
    };

    function plot() {
        let dialog = document.getElementById('gridchenDialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'gridchenDialog';
            dialog.style.width = '80%';
            //dialog.innerHTML = '<form method="dialog"><button type="submit">Hide</button></form>';

            document.body.appendChild(dialog);
        }

        dialog.showModal();

        if (!eventListeners['plot']) {
            dialog.textContent = 'You must set an event listener of type plot.';
            return
        }

        /** @type{Array<number>} */
        const columnIndices = [];
        for (const /** @type{Range} */ r of selection.areas) {
            for (let count = 0; count < r.columnCount; count++) {
                columnIndices.push(r.columnIndex + count);
            }
        }

        if (columnIndices.length < 2) {
            dialog.textContent = `🤮 Please select 2 columns or more, you only selected column ${columnIndices[0]}`;
            return
        }

        const columnSchemas = [];
        const columns = [];
        for (const columnIndex of columnIndices) {
            columnSchemas.push(schemas[columnIndex]);
            columns.push(viewModel.getColumn(columnIndex));
        }

        // Note: We complete erase dialogs content because some frameworks (plotly for example) will cache information
        // in the HTML element.
        dialog.textContent = '';
        const graphElement = dialog.appendChild(document.createElement('div'));
        eventListeners['plot'](graphElement, schema.title, columnSchemas, columns);
    }

    function navigateCell(evt, rowOffset, colOffset) {
        console.log('navigateCell');

        if (activeCell.mode !== 'display') {
            commit();
        }

        let isExpansion = evt.shiftKey && !(evt.code === 'Tab' || evt.code === 'Enter');

        let cell;
        if (isExpansion) {
            cell = selection.head;
        } else {
            cell = activeCell;
        }

        let rowIndex = cell.row + rowOffset;
        let colIndex = cell.col + colOffset;
        if (colIndex === -1) {
            if (rowIndex > 0) {
                colIndex = colCount - 1;
                rowIndex--;
            } else {
                rowIndex = rowCount - 1;
                colIndex = colCount - 1;
            }
        } else if (colIndex === colCount) {
            colIndex = 0;
            rowIndex++;
        }
        //let colIndex = Math.min(colCount - 1, Math.max(0, cell.col + colOffset));

        if (isExpansion) {
            selection.expand(rowIndex, colIndex);
        } else {
            selection.set(rowIndex, colIndex);
        }

        console.log(`rowIndex ${rowIndex} colIndex ${colIndex}`);

        const viewRow = rowIndex - firstRow;

        if (viewRow < 0 || viewRow >= viewPortRowCount) {
            // Trigger scrolling. Note that for all scrolls we do not need nor want to change the active cell.
            // Meaning that rowIndex - firstRow is invariant before and after the scroll.
            if (firstRow === 0 && rowOffset < 0) {
                if (viewRow >= 0) {
                } else if (rowOffset === -1) {
                    rowIndex = 0;
                } else {
                    rowIndex = cell.row;
                }
            } else if (firstRow + rowOffset < 0) {
                setFirstRow(0);
            } else if (rowOffset !== 0) {
                setFirstRow(firstRow + rowOffset);
            }
        }

        if (!isExpansion) {
            activeCell.move(rowIndex, colIndex);
        }
    }

    let slider = new Slider(totalWidth - 20, viewPortHeight, (n) => setFirstRow(n, this));
    // Note that the slider must before the cells (we avoid using z-order)
    // so that the textarea-resize handle is in front of the slider.
    body.appendChild(slider.element);
    body.appendChild(cellParent);

    let colCount = schemas.length;

    let firstRow = 0;
    /** @type{number} */
    let rowCount = 0;

    function commit() {
        console.log('commit');
        activeCell.span.style.display = 'inline-block';

        if (activeCell.mode !== 'display') {
            if (activeCell.isReadOnly()) {
                ee.hide();
            } else {
                const rowIndex = activeCell.row;
                const colIndex = activeCell.col;
                let value = ee.getValue().trim();
                ee.hide();
                // activeCell.span.textContent = value;
                if (value === '') {
                    value = undefined;
                } else {
                    value = schemas[colIndex].converter.fromString(value);
                    //value = value.replace(/\\n/g, '\n');
                }
                const patches = viewModel.setCell(rowIndex, colIndex, value);
                refresh(viewModel.rowCount());
                // Must be called AFTER model is updated.
                eventListeners['dataChanged'](patches);
            }
        }

        activeCell.mode = 'display';
        container.focus({preventScroll: true});
    }

    /** @type {Array<Array<HTMLElement>>} */
    let spanMatrix = Array(viewPortRowCount);
    let pageIncrement = Math.max(1, viewPortRowCount);

    function setFirstRow(_firstRow, caller) {
        refreshHeaders();
        activeCell.hide();
        selection.hide();

        firstRow = _firstRow;
        //if (rowCount < firstRow + viewPortRowCount) {
        //    rowCount = firstRow + viewPortRowCount;
        //}

        if (caller !== slider) {
            // TODO: remove caller.
            if (slider.max !== rowCount - viewPortRowCount) {
                // Note that rowCount - viewPortRowCount may be 0.
                slider.setMax(Math.max(viewPortRowCount, rowCount - viewPortRowCount));
            }
            slider.setValue(firstRow)
        }

        updateViewportRows(getSelection(
            new Range(firstRow, 0, viewPortRowCount, colCount)));
        activeCell.move(activeCell.row, activeCell.col);
        selection.show();
    }

    function createCell(vpRowIndex, colIndex) {
        const schema = schemas[colIndex];
        /** @type {HTMLElement} */
        let elem;
        if (schema.format === 'uri') {
            elem = document.createElement('a');
            elem.target = '_blank';
        } else {
            elem = document.createElement('span');
        }

        let style = elem.style;
        spanMatrix[vpRowIndex][colIndex] = elem;
        style.position = 'absolute';
        style.top = (vpRowIndex * rowHeight) + 'px';
        style.left = (colIndex ? columnEnds[colIndex - 1] : 0) + 'px';
        style.width = schemas[colIndex].width + 'px';
        style.height = innerHeight;
        style.overflow = 'hidden';
        style.whiteSpace = 'nowrap';
        style.overflow = 'hidden';
        style.textOverflow = 'ellipsis';
        style.border = '1px solid black';
        style.padding = cellPadding + 'px';
        style.backgroundColor = 'white';

        if (schema.type !== 'string' || schema.format) {
            elem.className = 'non_string'
        }

        elem.addEventListener('dblclick', () => activeCell.enterEditMode());
        cellParent.appendChild(elem);
    }

    /**
     * TODO: Rename to getData
     * @param {Range} selection
     * @returns {Array<Array<?>>}
     */
    function getSelection(selection) {
        let matrix = Array(selection.rowCount);
        for (let i = 0, rowIndex = selection.rowIndex; rowIndex < selection.rowIndex + selection.rowCount; i++, rowIndex++) {
            matrix[i] = Array(selection.columnCount);
            if (rowIndex >= rowCount) continue;
            for (let j = 0, colIndex = selection.columnIndex; colIndex < selection.columnIndex + selection.columnCount; colIndex++, j++) {
                matrix[i][j] = viewModel.getCell(rowIndex, colIndex);
            }
        }
        return matrix
    }

    /**
     * @param {Range} r
     * @param {string} sep
     * @param {boolean} withHeaders
     * @returns {string}
     */
    function rangeToTSV(r, sep, withHeaders) {
        const rowMatrix = getSelection(r);
        let tsvRows = Array(rowMatrix.length);
        for (const [i, row] of rowMatrix.entries()) {
            tsvRows[i] = row.map(function (value, j) {
                let schema = schemas[r.columnIndex + j];
                if (value === undefined || value === null) {
                    return undefined;
                }
                value = schema.converter.toString(value);
                if (value.includes('\t') || value.includes('\n')) {
                    value = '"' + value + '"';
                }
                return value;
            }).join(sep);  // Note that a=[undefined, 3].join(',') is ',3', which is what we want.
        }
        if (withHeaders) {
            tsvRows.unshift(schemas.map(schema => schema.title).join(sep));
        }
        return tsvRows.join('\r\n')
    }

    /**
     * @param {number} topRowIndex
     * @param {number} topColIndex
     * @param {Array<Array<string|undefined>>} matrix
     * @returns {number}
     */
    function pasteSingle(topRowIndex, topColIndex, matrix) {
        let rowIndex = topRowIndex;
        let endRowIndex = rowIndex + matrix.length;
        let endColIndex = Math.min(schemas.length, topColIndex + matrix[0].length);

        for (let i = 0; rowIndex < endRowIndex; i++, rowIndex++) {
            let colIndex = topColIndex;

            for (let j = 0; colIndex < endColIndex; colIndex++, j++) {
                let value = matrix[i][j];
                if (value !== undefined) value = schemas[colIndex].converter.fromString(value);
                const patches = viewModel.setCell(rowIndex, colIndex, value);
                eventListeners['dataChanged'](patches);
            }
        }
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
     * @returns {number}
     */
    function paste(matrix) {
        const r = selection.areas[0];

        if (!matrix[0].length) {
            alert('You have nothing to paste')
        }

        const sourceRows = matrix.length;
        const sourceColumns = matrix[0].length;
        const targetRows = r.rowCount;
        const targetColumns = r.columnCount;
        if (targetRows % sourceRows || targetColumns % sourceColumns) {
            pasteSingle(r.rowIndex, r.columnIndex, matrix);
            // TODO: Reshape selection
        } else {
            // Tile target with source.
            for (let i = 0; i < Math.trunc(targetRows / sourceRows); i++) {
                for (let j = 0; j < Math.trunc(targetColumns / sourceColumns); j++) {
                    pasteSingle(r.rowIndex + i * sourceRows, r.columnIndex + j * sourceColumns, matrix);
                }
            }
        }

        return viewModel.rowCount();
    }

    function updateViewportRows(matrix) {
        // console.log('setRowData', rowData)
        for (let index = 0; index < spanMatrix.length; index++) {
            let elemRow = spanMatrix[index];
            let row = matrix[index];
            for (let colIndex = 0; colIndex < colCount; colIndex++) {
                let elem = elemRow[colIndex];
                let value = (row ? row[colIndex] : undefined);
                if (value === undefined || value === null) {
                    value = '';
                } else {
                    value = schemas[colIndex].converter.toString(value);
                }

                if (elem.tagName === 'A') {
                    // Check for markdown link, i.e. [sdsd](http://sdsd)
                    const m = value.match(/^\[(.+)\]\((.+)\)$/);
                    if (m) {
                        elem.textContent = m[1];
                        elem.href = m[2];
                    } else {
                        elem.href = elem.textContent = value;
                    }
                } else {
                    elem.textContent = value;
                }
            }
        }
    }

    for (let rowIndex = 0; rowIndex < spanMatrix.length; rowIndex++) {
        spanMatrix[rowIndex] = Array(colCount);
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            createCell(rowIndex, colIndex);
        }
    }

    const ee = new Editor(cellParent);

    /** @type {Selection} */
    let selection = new Selection(repaintRange, eventListeners);
    //selection.set(0, 0);

    firstRow = 0;
    refresh(viewModel.rowCount());
    // Revoke action by setFirstRow(). TODO: Refactor.
    activeCell.hide();
    selection.hide();

    class Range1 extends Range {
        constructor(rowIndex, columnIndex, rowCount, columnCount) {
            super(rowIndex, columnIndex, rowCount, columnCount);
        }

        select() {
            activeCell.move(this.rowIndex, this.columnIndex);
            selection.set(this.rowIndex, this.columnIndex);
            selection.expand(this.rowIndex + this.rowCount - 1, this.columnIndex + this.columnCount - 1);
        }
    }

    return {
        /**
         * @returns {Range1}
         */
        getActiveCell() {
            return new Range1(activeCell.row, activeCell.col, 1, 1);
        },
        /**
         * @returns {Range1}
         */
        getSelection() {
            return new Range1(selection.rowIndex, selection.columnIndex,
                selection.rowCount, selection.columnCount);
        },
        /**
         * @param {number} rowIndex
         * @param {number} columnIndex
         * @param {number} rowCount
         * @param {number} columnCount
         * @returns {Range}
         */
        getRange(rowIndex, columnIndex, rowCount, columnCount) {
            return new Range1(rowIndex, columnIndex, rowCount, columnCount);
        }
    };
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

