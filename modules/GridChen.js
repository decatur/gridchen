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

export class Rectangle {
    /**
     * @param {IInterval} row
     * @param {IInterval} col
     */
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    /**
     * TODO: Implement on Range.
     * Intersect this rectangle with another rectangle.
     * @param {Rectangle} other
     * @returns {Rectangle}
     */
    intersect(other) {
        const row = intersectInterval(this.row, other.row);
        const col = intersectInterval(this.col, other.col);
        if (col === undefined || row === undefined) {
            return undefined;
        }
        return new Rectangle(row, col)
    }

    /**
     * Copy this reactangle to a shifted position.
     * @param {number} rowOffset
     * @param {number} colOffset
     * @returns {Rectangle}
     */
    shift(rowOffset, colOffset) {
        return new Rectangle(
            {min: this.row.min + rowOffset, sup: this.row.sup + rowOffset},
            {min: this.col.min + colOffset, sup: this.col.sup + colOffset});
    }
}

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
            'paste': () => null
        };
    }

    /**
     * @param {GridChen.DataView} viewModel
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
        this.eventListeners[filteredKeys[0]] = listener;
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
     * @param {HTMLElement} container
     * @param {string} left
     * @param handler
     */
    constructor(left, height, handler) {
        this.handler = handler;
        this.element = document.createElement('input');
        this.element.type = "range";
        const style = this.element.style;
        style['-webkit-appearance'] = 'slider-vertical';
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

class Selection extends Rectangle {
    constructor(repainter, eventListeners) {
        super({min: 0, sup: 1}, {min: 0, sup: 1});
        this.initial = pos(0, 0);
        this.head = pos(0, 0); // Cell opposite the initial.
        this.repainter = repainter;
        this.eventListeners = eventListeners;
    }

    /**
     */
    show() {
        this.repainter('LightBlue', this);
    }

    hide() {
        this.repainter(undefined, this);
    }

    /**
     * @param {number} rowIndex
     * @param {number} colIndex
     */
    set(rowIndex, colIndex) {
        console.log('Selection.set');
        this.hide(); // TODO: Why?
        this.initial = {row: rowIndex, col: colIndex};
        this.head = {row: rowIndex, col: colIndex};
        this.row = {min: rowIndex, sup: 1 + rowIndex};
        this.col = {min: colIndex, sup: 1 + colIndex};
        this.eventListeners['selectionChanged'](this);
    }

    /**
     * @param {number} rowIndex
     * @param {number} colIndex
     */
    expand(rowIndex, colIndex) {
        console.log('Selection.expand');
        this.hide();

        this.head = {row: rowIndex, col: colIndex};
        this.row = {
            min: Math.min(this.initial.row, rowIndex),
            sup: 1 + Math.max(this.initial.row, rowIndex)
        };

        this.col = {
            min: Math.min(this.initial.col, colIndex),
            sup: 1 + Math.max(this.initial.col, colIndex)
        };

        this.show();
        this.eventListeners['selectionChanged'](this);
    }
}


const cellBorderWidth = 1;
const cellPadding = 3;


/**
 * @param {HTMLElement} container
 * @param viewModel
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
        .slice(1).forEach(function(schema) {
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
                refresh(viewModel.sort(index));
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

    /*let rowMenu = document.createElement('div');
    rowMenu.style.position = 'absolute';
    rowMenu.style.display = 'none';

    let insertRowButton = document.createElement('button');
    insertRowButton.type = 'button';
    insertRowButton.style.position = 'absolute';
    insertRowButton.style.top = '-20px';
    insertRowButton.style.padding = '0';
    insertRowButton.title = "Insert Row Above";
    insertRowButton.textContent = '+';
    insertRowButton.onclick = function () {
        refresh(viewModel.insertRowBefore(activeCell.row - 1));
        //inputList[previousFocus.row][0].select()
    };
    rowMenu.appendChild(insertRowButton);

    let deleteRowButton = document.createElement('button');
    deleteRowButton.id = 'delete';
    deleteRowButton.type = 'button';
    deleteRowButton.style.position = 'absolute';
    deleteRowButton.style.padding = '0';
    deleteRowButton.type = 'button';
    deleteRowButton.title = "Delete Selected Rows";
    deleteRowButton.textContent = '-';
    deleteRowButton.onclick = function () {
        let rowCount = 0;
        range(selection.row.sup - selection.row.min).forEach(function() {
            rowCount = viewModel.deleteRow(selection.row.min);
        });
        refresh(rowCount);
    };
    rowMenu.appendChild(deleteRowButton);
    body.appendChild(rowMenu);
*/

    // TODO: Why is sometdeleteRowButtonimes clientHeight not set?
    let viewPortHeight = totalHeight - 20;
    let cellParent = /** @type {HTMLElement} */ document.createElement('div');
    cellParent.className = "GRID";
    cellParent.style.position = 'absolute';  // Must be absolute otherwise contentEditable=true produces strange behaviour
    cellParent.style.display = 'inline-block';
    cellParent.style.width = columnEnds[columnEnds.length - 1] + 'px';
    cellParent.style.height = viewPortHeight + 'px';
    container.tabIndex = 0;

    /** @type{HTMLTextAreaElement} */
    const editor = /** @type{HTMLTextAreaElement} */ document.createElement('textarea');
    editor.id = 'editor';
    editor.style.position = 'absolute';
    editor.style.display = 'none';
    editor.style.height = innerHeight;
    editor.style.padding = cellPadding + 'px';
    /** @type {{span?:{HTMLSpanElement}, editor:{HTMLInputElement}, row:number, col:number, mode:string}} */
    const activeCell = {
        span: undefined,
        editor: editor, row: 0, col: 0, mode: 'display',
        hide: function () {
            if (this.span) this.span.style.backgroundColor = 'white'; //removeProperty('background-color');
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
       enterMode: function() {
            if (this.row < firstRow) {
                // scroll into view
                setFirstRow(this.row)
            }

            const spanStyle = this.span.style;
            spanStyle.display = 'none';
            const style = this.editor.style;
            style.top = spanStyle.top;
            style.left = spanStyle.left;
            style.width = (parseInt(spanStyle.width) + 20) + 'px';  // Account for the resize handle, which is about 20px
            editor.style.height = innerHeight;
            style.display = 'inline-block';

            // focus on input element, which will then receive this keyboard event.
            // Note: focus after display!
            // Note: It is ok to scroll on focus here.
            this.editor.focus();
        },
        enterInputMode: function() {
            this.mode = 'input';
            this.enterMode();
        },
        enterEditMode: function() {
            this.mode = 'edit';
            this.enterMode();
            let value = viewModel.getCell(this.row, this.col);
            if ( value === undefined ) {
                value = '';
            } else {
                value = schemas[this.col].converter.toEditable(value);
            }
            editor.value = value;
        }
    };

    /**
     *
     * @param {string?} backgroundColor
     * @param {Rectangle} rectangle
     */
    function repaintRectangle(backgroundColor, rectangle) {
        let r = rectangle.shift(-firstRow, 0);
        let rr = r.intersect(new Rectangle({min: 0, sup: viewPortRowCount}, {min: 0, sup: colCount}));
        if (!rr) return;
        for (let row = rr.row.min; row < rr.row.sup; row++) {
            for (let col = rr.col.min; col < rr.col.sup; col++) {
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

    function deleteSelection() {
        let emptyRow = Array(selection.col.sup - selection.col.min);
        emptyRow.fill(undefined);
        let emptyMatrix = Array(selection.row.sup - selection.row.min);
        emptyMatrix.fill(emptyRow);
        refresh(paste(emptyMatrix));
    }

    function deleteRows() {
        let rowCount;
        range(selection.row.sup - selection.row.min).forEach(function() {
            rowCount = viewModel.deleteRow(selection.row.min);
        });
        refresh(rowCount);
    }

    function showContextMenu() {
        let dialog = document.getElementById('gridchenDialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'gridchenDialog';
            dialog.style.width = '20em';
            dialog.style.height = '60px';
            dialog.style.backgroundColor = 'transparent';
            const form = document.createElement('div');
            const actions = [
                ['Cut', () => copySelection(true)],
                ['Copy', () => copySelection(false)],
                ['Paste', () => alert('Not Implemented')],
                ['Insert Row', () => refresh(viewModel.insertRowBefore(activeCell.row - 1))],
                ['Delete Rows', deleteRows],
                ['Delete Contents', deleteSelection]
            ];
            for (const action of actions) {
                const button = form.appendChild(document.createElement('button'));
                button.textContent = action[0];
                button.onclick = action[1];
            }

            dialog.appendChild(form);
            const graphElement = document.createElement('div');
            dialog.appendChild(graphElement);
            document.body.appendChild(dialog);
            styleSheet.textContent = `
                #gridchenDialog div { position:absolute;display: inline-block;background-color: bisque; }
                #gridchenDialog button { display: block; }
            `;
            document.body.appendChild(styleSheet);
            // Note that this event is caught even if the dialog is not directly clicked.
            dialog.onclick = () => dialog.close();
        }
        dialog.style.left = (activeCell.col * 100) + 'px';
        dialog.style.top = (activeCell.row * rowHeight) + 'px'
        dialog.showModal();
    }

    function copySelection(doCut) {
        window.navigator.clipboard.writeText(selectionToTSV('\t'))
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
            selection.set(0, 0);
            selection.expand(rowCount - 1, colCount - 1);
        } else if ((evt.code === 'KeyC' || evt.code === 'KeyX') && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent text is copied from container.
            copySelection(evt.code === 'KeyX');
        } else if (evt.code === 'KeyV' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent that text is pasted into editable container.
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
        } else if (evt.code === 'KeyQ' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            viewModel.plot();
        } else if (evt.code === 'F10' && evt.shiftKey) {
            // Both Web and Excel binding of context menu.
            evt.preventDefault();
            evt.stopPropagation();
            showContextMenu();
        } else if (evt.code === 'F2') {
            evt.preventDefault();
            evt.stopPropagation();
            activeCell.enterEditMode();
        }
    };

    container.onkeypress = function (evt) {
        console.log('keypress ' + evt.code);
        if (activeCell.mode === 'display') {
            activeCell.enterInputMode();
        }
    };

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
        let colIndex = Math.min(colCount - 1, Math.max(0, cell.col + colOffset));

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
            const rowIndex = activeCell.row;
            const colIndex = activeCell.col;
            let value = editor.value.trim();
            editor.value = '';
            editor.style.display = 'none';
            // activeCell.span.textContent = value;
            if (value === '') {
                value = undefined;
            } else {
                value = schemas[colIndex].converter.fromString(value);
                //value = value.replace(/\\n/g, '\n');
            }
            refresh(viewModel.setCell(rowIndex, colIndex, value));
            // Must be called AFTER model is updated.
            eventListeners['dataChanged'](value);
        }

        activeCell.mode = 'display';
        container.focus({preventScroll: true});
    }

    editor.addEventListener('blur', function (evt) {
        console.log('editor.onblur');
        commit();

        if (!container.contains(evt.relatedTarget)) {
            container.blur();
            activeCell.hide();
            selection.hide();
        }
    });

    /**
     * @param {KeyboardEvent} evt
     */
    editor.addEventListener('keydown', function (evt) {
        console.log('editor.onkeydown: ' + evt);
        // Clicking editor should invoke default: move caret. It should not delegate to containers action.
        evt.stopPropagation();

        if (evt.code === 'F2') {
            evt.preventDefault();
            evt.stopPropagation();
            // Toggle between input and edit mode
            activeCell.mode = (activeCell.mode=='input'?'edit':input);
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
            //editor.dispatchEvent(new KeyboardEvent('keydown', {code: 'Enter'}));
            editor.setRangeText('\n', editor.selectionStart, editor.selectionEnd, 'end');
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
    });

    editor.addEventListener('mousedown', function (evt) {
        // Clicking editor should invoke default: move the caret. It should not delegate to containers action.
        evt.stopPropagation();
    });


    let viewPortRowCount = Math.floor(viewPortHeight / rowHeight);
    /** @type {Array<Array<HTMLElement>>} */
    let spanMatrix = Array(viewPortRowCount);
    let pageIncrement = Math.max(1, viewPortRowCount);

    function setFirstRow(_firstRow, caller) {
        refreshHeaders();
        activeCell.hide();
        selection.hide();

        firstRow = _firstRow;
        if (rowCount < firstRow + viewPortRowCount) {
            rowCount = firstRow + viewPortRowCount;
        }

        if (caller !== slider) {
            // TODO: remove caller.
            if (slider.max !== rowCount - viewPortRowCount) {
                // Note that rowCount - viewPortRowCount may be 0.
                slider.setMax(Math.max(viewPortRowCount, rowCount - viewPortRowCount));
            }
            slider.setValue(firstRow)
        }

        updateViewportRows(getSelection(
            new Rectangle({min: firstRow, sup: firstRow + viewPortRowCount}, {min: 0, sup: colCount})));
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

    function getSelection(selection) {
        let matrix = Array(selection.row.sup - selection.row.min);
        for (let i = 0, rowIndex = selection.row.min; rowIndex < selection.row.sup; i++, rowIndex++) {
            matrix[i] = Array(selection.col.sup - selection.col.min);
            if (rowIndex >= rowCount) continue;
            for (let j = 0, colIndex = selection.col.min; colIndex < selection.col.sup; colIndex++, j++) {
                matrix[i][j] = viewModel.getCell(rowIndex, colIndex);
            }
        }
        return matrix
    }

    /**
     * @param {string} sep
     * @returns {string}
     */
    function selectionToTSV(sep) {
        const rowMatrix = getSelection(selection);
        let tsvRows = Array(rowMatrix.length);
        for (const [i, row] of rowMatrix.entries()) {
            tsvRows[i] = row.map(function (value, j) {
                let schema = schemas[selection.col.min + j];
                if (value === undefined) {
                    return undefined;
                }
                value = schema.converter.toString(value);
                if (value.includes('\t') || value.includes('\n')) {
                    value = '"' + value + '"';
                }
                return value;
            }).join(sep);  // Note that a=[undefined, 3].join(',') is ',3', which is what we want.
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
                viewModel.setCell(rowIndex, colIndex, value);
            }
        }
    }

    /**
     * If paste target selection is multiple of source row matrix, then tile target with source,
     * otherwise just paste source
     * @@param {Array<Array<string>>} matrix
     */
    function paste(matrix) {
        if (!matrix[0].length) {
            alert('You have nothing to paste')
        }
        const sourceRows = matrix.length;
        const sourceColumns = matrix[0].length;
        const targetRows = selection.row.sup - selection.row.min;
        const targetColumns = selection.col.sup - selection.col.min;
        if (targetRows % sourceRows || targetColumns % sourceColumns) {
            pasteSingle(selection.row.min, selection.col.min, matrix);
            // TODO: Reshape selection
        } else {
            // Tile target with source.
            for (let i = 0; i < Math.trunc(targetRows / sourceRows); i++) {
                for (let j = 0; j < Math.trunc(targetColumns / sourceColumns); j++) {
                    pasteSingle(selection.row.min + i * sourceRows, selection.col.min + j * sourceColumns, matrix);
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

                elem.textContent = value;
                if (elem.tagName === 'A') {
                    elem.href = value;
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

    cellParent.appendChild(editor);

    /** @type {Selection} */
    let selection = new Selection(repaintRectangle, eventListeners);
    //selection.set(0, 0);

    firstRow = 0;
    refresh(viewModel.rowCount());
    // Revoke action by setFirstRow(). TODO: Refactor.
    activeCell.hide();
    selection.hide();

    class Range {
        constructor(rowIndex, columnIndex, rowCount, columnCount) {
            this.rowIndex = rowIndex;
            this.columnIndex = columnIndex;
            this.rowCount = rowCount;
            this.columnCount = columnCount;
        }

        select() {
            activeCell.move(this.rowIndex, this.columnIndex);
            selection.set(this.rowIndex, this.columnIndex);
            selection.expand(this.rowIndex + this.rowCount - 1, this.columnIndex + this.columnCount - 1);
        }
    }

    return {
        /**
         * @returns {Range}
         */
        getActiveCell() {
            return new Range(activeCell.row, activeCell.col, 1, 1);
        },
        /**
         * @returns {Range}
         */
        getSelection() {
            return new Range(selection.row.min, selection.col.min,
                selection.row.sup - selection.row.min, selection.col.sup - selection.col.min);
        },
        /**
         * @param {number} rowIndex
         * @param {number} columnIndex
         * @param {number} rowCount
         * @param {number} columnCount
         * @returns {Range}
         */
        getRange(rowIndex, columnIndex, rowCount, columnCount) {
            return new Range(rowIndex, columnIndex, rowCount, columnCount);
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
    const a = text.split(/(".*?"[^"])/s);
    const qs = [];
    for (let i=1; i<a.length; i+=2) {
        let s = a[i];
        a[i] = String.fromCharCode(0) + s[s.length-1];
        s = s.substr(1, s.length - 3);
        s = s.replace(/""/g, '"');
        qs.push(s);
    }

    text = a.join('');
    return [text.substr(0, text.length-1), qs]
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

