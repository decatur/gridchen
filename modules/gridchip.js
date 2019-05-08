/**
 * Author: Wolfgang Kühn 2019
 *
 * See README.md
 */

import {createSimpleControler} from "./matrix_view.js"
import {deFormat, formatNumber, parseNumber, parseDate} from "./chronos.js"

let logCounter = 0;
const console = {
    assert: window.console.assert,
    log: function (arg) {
        window.console.log(logCounter++ + ': ' + arg);
    }
};

export class Rectangle {
    /**
     * @param {Bantam.IInterval} row
     * @param {Bantam.IInterval} col
     */
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    /**
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
 * @param {Bantam.IInterval} i1
 * @param {Bantam.IInterval} i2
 * @returns {Bantam.IInterval}
 */
function intersectInterval(i1, i2) {
    const min = Math.max(i1.min, i2.min);
    const sup = Math.min(i1.sup, i2.sup);
    if (sup <= min) {
        return undefined;
    }
    return {min, sup};
}

class BantamGrid extends HTMLElement {
    constructor() {
        super();
    }

    /**
     * @param {Array<Bantam.ISchema>} schemas
     * @param {Array<Array<number | string | Date | boolean>>} matrix
     */
    resetFromMatrix(schemas, matrix) {
        const {dataSource, viewModel} = createSimpleControler(schemas, matrix);
        this._patches = [];
        if (this.shadowRoot) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        } else {
            // First initialize creates shadow dom.
            this.attachShadow({mode: 'open'});
        }
        let totalHeight = parseInt(this.style.height);
        const container = document.createElement('div');
        container.style.height = totalHeight + 'px';
        this.shadowRoot.appendChild(container);
        Grid(container, schemas, dataSource, viewModel, this._patches);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @returns {Array<string>}
     */
    getPatches() {
        return this._patches;
    }
}

customElements.define('bantam-grid', BantamGrid);

const minFreq = 1000 * 60;

class Slider {

    /**
     * @param {HTMLElement} container
     * @param {string} left
     * @param handler
     */
    constructor(container, left, handler) {
        this.handler = handler;
        this.element = document.createElement('input');
        this.element.type = "range";
        const style = this.element.style;
        style['-webkit-appearance'] = 'slider-vertical';
        style.position = 'absolute';
        style.display = 'inline-block';
        //this.element.style.marginLeft = '10px'
        style.height = container.style.height;
        style.left = left;
        style.width = '20px';
        this.element.min = 0;

        container.parentElement.appendChild(this.element);
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
        this.element.max = max;
    }

    /**
     * @param {number} value
     */
    setValue(value) {
        this.element.value = this.element.max - value;
    }
}

class Selection extends Rectangle {
    constructor(repainter) {
        super(undefined, undefined);
        /** @type {Bantam.IPosition} */
        this.initial = undefined;
        this.repainter = repainter
    }

    unselect() {
        console.log('unselect');
        this.repaint();
    }

    /**
     * TODO: Remove this method.
     * @param {string?} color
     */
    repaint(color) {
        this.repainter(color, this);
    }

    expand(rowIndex, colIndex) {
        console.log('expand');
        if (this.initial) {
            this.repaint();
        } else {
            this.initial = {rowIndex: rowIndex, colIndex: colIndex};
        }

        this.row = {
            min: Math.min(this.initial.rowIndex, rowIndex),
            sup: 1 + Math.max(this.initial.rowIndex, rowIndex)
        };

        this.col = {
            min: Math.min(this.initial.colIndex, colIndex),
            sup: 1 + Math.max(this.initial.colIndex, colIndex)
        };

        this.repaint('LightBlue');
    }
}


const cellBorderWidth = 1;
const cellPadding = 3;


/**
 * @param {HTMLElement} container
 * @param {Bantam.ISchema[]} schemas
 * @param dataSource
 * @param viewModel
 */
function Grid(container, schemas, dataSource, viewModel, patches) {
    let totalHeight = parseInt(container.style.height);

    let styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .GRID input {
            background-color: transparent; border: {cellBorderWidth}px solid black; padding: {cellPadding}px;
        }
        .GRID .number_column { text-align: right; }
    `;
    container.appendChild(styleSheet);

    const rowHeight = 22;
    const innerHeight = (rowHeight - 2 * cellPadding - cellBorderWidth) + 'px';

    const headerRow = document.createElement('div');
    let style = headerRow.style;
    style.position = 'relative';
    style.left = '20px';
    style.width = '100%';
    style.height = rowHeight + 'px';
    style.textAlign = 'center';
    style.fontWeight = 'bold';
    // headerRow.style.border = '1px solid black';
    container.appendChild(headerRow);

    let total = 0;
    const columnEnds = [];
    schemas.forEach(function (schema, index) {
        const header = document.createElement('span');
        const style = header.style;
        style.position = 'absolute';
        style.left = total + 'px';
        style.width = schema.width + 'px';
        style.height = innerHeight;
        style.padding = cellPadding + 'px';
        style.border = '1px solid black';
        header.textContent = schema.title;
        if (schema.sort === 1) {
            header.textContent += ' ↑';
        } else if (schema.sort === -1) {
            header.textContent += ' ↓'
        }
        header.onclick = function (ev) {
            // header.textContent = schema.title + ' ' + (header.textContent.substr(-1)==='↑'?'↓':'↑');
            viewModel.onSort(index);
        };
        headerRow.appendChild(header);
        total += schema.width + 2 * cellBorderWidth + 2 * cellPadding;
        columnEnds[index] = total;
        if (schema.type === 'number') {
            const fractionDigits = schema.fractionDigits || 0;
            const nf = Intl.NumberFormat([], {
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits
            });
            schema.format = (value) => formatNumber(value, nf);
        }
    });

    let totalWidth = columnEnds[columnEnds.length - 1] + 20 + 20;
    container.style.width = totalWidth + 'px';

    const body = document.createElement('div');
    body.style.position = 'relative';
    body.style.width = '100%';
    body.style.height = (totalHeight - 20) + 'px';
    container.appendChild(body);

    let insertRowButton = document.createElement('button');
    insertRowButton.type = 'button';
    insertRowButton.style.position = 'absolute';
    insertRowButton.style.display = 'none';
    insertRowButton.style.padding = '0';
    insertRowButton.title = "Insert Row Above";
    insertRowButton.textContent = '+';
    insertRowButton.onclick = function () {
        viewModel.onRowInsert(activeCell.row - 1)
        //inputList[previousFocus.row][0].select()
    };
    body.appendChild(insertRowButton);

    let deleteRowButton = document.createElement('button');
    deleteRowButton.type = 'button';
    deleteRowButton.style.position = 'absolute';
    deleteRowButton.style.display = 'none';
    deleteRowButton.style.padding = '0';
    deleteRowButton.type = 'button';
    deleteRowButton.title = "Delete Row";
    deleteRowButton.textContent = '-';
    deleteRowButton.onclick = function () {
        viewModel.onRowDelete(activeCell.row)
        // inputList[previousFocus.row][0].select()
    };
    body.appendChild(deleteRowButton);

    // TODO: Why is sometimes clientHeight not set?
    let viewPortHeight = totalHeight - 20;
    let cellParent = /** @type {HTMLElement} */ document.createElement('div');
    cellParent.className = "GRID";
    cellParent.style.position = 'absolute';  // Must be absolute otherwise contentEditable=true produces strange behaviour
    cellParent.style.display = 'inline-block';
    cellParent.style.width = columnEnds[columnEnds.length - 1] + 'px';
    cellParent.style.height = viewPortHeight + 'px';
    cellParent.style.marginLeft = '20px';
    cellParent.tabIndex = 0;

    const input = /** @type{HTMLInputElement} */ document.createElement('input');
    input.style.position = 'absolute';
    input.style.display = 'none';
    input.style.height = innerHeight + 'px';
    input.style.padding = cellPadding + 'px';
    /** @type {{span?:{HTMLSpanElement}, input:{HTMLInputElement}, row:number, col:number, mode:string}} */
    let activeCell = {input: input, row: 0, col: 0, mode: 'active'};

    /**
     *
     * @param {string?} backgroundColor
     * @param {Rectangle} rectangle
     */
    function repainter(backgroundColor, rectangle) {
        let r = rectangle.shift(-firstRow, 0);
        let rr = r.intersect(new Rectangle({min: 0, sup: viewPortRowCount}, {min: 0, sup: colCount}));
        if (!rr) return;
        for (let row = rr.row.min; row < rr.row.sup; row++) {
            for (let col = rr.col.min; col < rr.col.sup; col++) {
                const style = spanMatrix[row][col].style;
                if (backgroundColor === undefined) {
                    style.removeProperty('background-color');
                } else {
                    style.backgroundColor = backgroundColor;
                }
            }
        }
    }

    cellParent.onmousedown = function (evt) {
        console.log('onmousedown');
        const rect = cellParent.getBoundingClientRect();

        function index(evt) {
            const y = evt.clientY - rect.y;
            const x = evt.clientX - rect.x;
            console.log(x + ' ' + y);
            const grid_y = Math.trunc(y / rowHeight);
            let grid_x = 0;
            for (grid_x; grid_x < colCount; grid_x++) {
                if (columnEnds[grid_x] > x) {
                    break;
                }
            }
            return {rowIndex: grid_y + firstRow, colIndex: grid_x}
        }

        if (evt.shiftKey && selection) {
            //let {colIndex, rowIndex} = index(evt);
            //selection.currentRow(rowIndex, colIndex);
        }
        //selection = Selection();
        let {rowIndex, colIndex} = index(evt);
        activateCell(evt, rowIndex - activeCell.row, colIndex - activeCell.col);

        function resetHandlers() {
            cellParent.onmousemove = cellParent.onmouseup = cellParent.onmouseleave = undefined;
        }

        cellParent.onmousemove = function (evt) {
            let {rowIndex, colIndex} = index(evt);
            console.log(`onmousemove ${rowIndex} ${colIndex}`);

            if (rowIndex - firstRow < spanMatrix.length) {
                if (!selection) selection = new Selection(repainter);
                selection.expand(rowIndex, colIndex);
            }
        };

        cellParent.onmouseleave = function (evt) {
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
        let evt = /** @type {WheelEvent} */ _evt;
        console.log(evt);
        // TODO: This is not MSE behaviour. MSE only scrolls and does not move the active cell.
        // TODO: Use evt.deltaMode
        setFirstRow(firstRow + 3 * Math.sign(-evt.wheelDeltaY), 0);
    };

    cellParent.onkeydown = function (evt) {
        console.log(evt);
        if (activeCell.mode === 'edit') return;
        // Note 1: All handlers call both preventDefault() and stopPropagation().
        //         The reason is documented in the handler code.
        // Note 2: For responsiveness, make sure this code is executed fast.

        if (evt.code === 'ArrowLeft' || (evt.code === "Tab" && evt.shiftKey)) {
            activateCell(evt, 0, -1);
        } else if (evt.code === 'ArrowRight' || evt.code === 'Tab') {
            activateCell(evt, 0, 1);
        } else if (evt.code === "ArrowUp" || (evt.code === "Enter" && evt.shiftKey)) {
            activateCell(evt, -1, 0);
        } else if (evt.code === 'ArrowDown' || evt.code === 'Enter') {
            activateCell(evt, 1, 0);
        } else if (evt.code === 'PageUp') {
            activateCell(evt, -pageIncrement, 0);
        } else if (evt.code === 'PageDown') {
            activateCell(evt, pageIncrement, 0);
        } else if (evt.code === 'KeyA' && evt.ctrlKey) {
            // Like MS-Excel selects all non-empty cells, in our case the complete grid.
            // This is reverted on the next onblur event.
            evt.preventDefault();  // Do not select the inputs content.
            evt.stopPropagation();
            if (selection) selection.unselect();
            selection = new Selection(repainter);
            selection.expand(0, 0);
            selection.expand(rowCount - 1, colCount - 1);
        } else if (evt.code === 'KeyC' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent text is copied from container.
            navigator.clipboard.writeText(dataSource.toClipboard(selection))
                .then(() => {
                    console.log('Text copied to clipboard');
                })
                .catch(err => {
                    // This can happen if the user denies clipboard permissions:
                    console.error('Could not copy text: ', err);
                });
        } else if (evt.code === 'KeyV' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent that text is pasted into editable container.
            navigator.clipboard.readText()
                .then(text => {
                    console.log('Pasted content: ', text);
                    let matrix = tsvToMatrix(text);
                    if (matrix) {
                        viewModel.onPaste(activeCell.row, activeCell.col, matrix);
                    }
                })
                .catch(err => {
                    console.error('Failed to read clipboard contents: ', err);
                })
        } else if (evt.code === 'Escape') {
            // Leave edit mode.
            evt.preventDefault();
            evt.stopPropagation();
            activeCell.mode = 'active';
        } else if (evt.code === 'Delete') {
            evt.preventDefault();
            evt.stopPropagation();
            if (selection) {
                let emptyRow = Array(selection.col.sup - selection.col.min);
                emptyRow.fill('');
                let emptyMatrix = Array(selection.row.sup - selection.row.min);
                emptyMatrix.fill(emptyRow);
                viewModel.onPaste(selection.row.min, selection.col.min, emptyMatrix);
            } else {
                viewModel.onPaste(activeCell.row, activeCell.col, [['']]);
            }
        } else if (evt.keyCode >= 32) {
            // focus on input element, which will then receive this keyboard event.
            const style = activeCell.input.style;
            const spanStyle = activeCell.span.style;
            style.top = spanStyle.top;
            style.left = spanStyle.left;
            style.width = spanStyle.width;
            spanStyle.display = 'none';
            style.display = 'inline-block';
            activeCell.input.focus();
            activeCell.mode = 'input';
        }
    };

    function activateCell(evt, rowOffset, colOffset) {
        evt.preventDefault();  // Prevents moving the caret on the target input field
        evt.stopPropagation();

        if (activeCell.mode === 'input' || activeCell.mode === 'edit') {
            activeCell.input.blur();
        }

        if (activeCell.span) activeCell.span.style.border = '1px solid black';

        // Note that HTMLSpanElement is not focusable.
        let rowIndex = Math.min(rowCount - 1, Math.max(0, activeCell.row + rowOffset));
        rowIndex = activeCell.row + rowOffset;
        let colIndex = Math.min(colCount - 1, Math.max(0, activeCell.col + colOffset));

        if (evt.shiftKey && !(evt.code === 'Tab' || evt.code === 'Enter')) {
            if (!selection) {
                selection = new Selection(repainter);
                selection.expand(activeCell.row, activeCell.col);
            }
            selection.expand(rowIndex, colIndex);
        } else {
            if (selection) selection = selection.unselect();
        }

        console.log(`activateCell rowIndex ${rowIndex} colIndex ${colIndex}`);
        activeCell.input.blur();

        if (rowIndex - firstRow < 0 || rowIndex - firstRow >= viewPortRowCount) {
            // Trigger scrolling. Note that for all scrolls we do not need nor want to change the active cell.
            // Meaning that rowIndex - firstRow is invariant before and after the scroll.
            if (firstRow === 0 && rowOffset < 0) {
                if (rowIndex - firstRow >= 0) {
                    activeCell.span = spanMatrix[rowIndex - firstRow][colIndex];
                } else if (rowOffset === -1) {
                    rowIndex = 0;
                } else {
                    rowIndex = activeCell.row;
                }
            } else if (firstRow + rowOffset < 0) {
                setFirstRow(0);
                activeCell.span = spanMatrix[rowIndex - firstRow][colIndex];
            } else {
                setFirstRow(firstRow + rowOffset);
            }
        } else {
            activeCell.span = spanMatrix[rowIndex - firstRow][colIndex];
        }

        activeCell.col = colIndex;
        activeCell.row = rowIndex;
        // TODO: activeCell may be undefined.
        const offsetTop = activeCell.span.offsetTop;

        activeCell.span.style.border = '2px solid black';
        deleteRowButton.style.top = offsetTop + 'px';
        deleteRowButton.style.display = 'inline-block';
        insertRowButton.style.top = (offsetTop - 20) + 'px';
        insertRowButton.style.display = 'inline-block';
    }

    /** @type {Selection} */
    let selection = undefined;

    body.appendChild(cellParent);

    let colCount = schemas.length;

    let firstRow = 0;
    /** @type{number} */
    let rowCount = undefined;

    input.onblur = function () {
        console.log('onblur');
        // activeCell.span.style.removeProperty('border');
        if (activeCell.mode === 'input' || activeCell.mode === 'edit') {
            const rowIndex = activeCell.row;
            const colIndex = activeCell.col;
            activeCell.mode = 'active';
            activeCell.input.style.display = 'none';
            activeCell.span.style.display = 'inline-block';
            cellParent.focus();
            let value = activeCell.input.value;
            activeCell.input.value = '';
            activeCell.span.textContent = value;
            const type = schemas[colIndex].type;
            if (type === 'number') {
                value = parseNumber(value)
            } else if (type === 'date') {
                value = parseDate(value)
            }
            viewModel.onCellChange(rowIndex, colIndex, value);
        }
    };

    input.onkeydown = function (evt) {
        console.log(evt);
        if (evt.code === 'Enter') {
            evt.preventDefault();
            evt.stopPropagation();
            input.blur();
            activateCell(evt, 1, 0);
        } else if (evt.code === 'Tab') {
            evt.preventDefault();
            evt.stopPropagation();
            input.blur();
            activateCell(evt, 0, 1);
        }
    };


    let viewPortRowCount = Math.floor(viewPortHeight / rowHeight);
    let spanMatrix = Array(viewPortRowCount);
    let pageIncrement = Math.max(1, viewPortRowCount);

    // // TODO: This is not MSE behaviour. MSE only scrolls and does not move the active cell.
    let slider = new Slider(cellParent, (totalWidth - 20) + 'px', (n) => setFirstRow(n, this));


    function setFirstRow(_firstRow, caller) {
        if (selection) {
            selection.repaint();
        }

        firstRow = _firstRow;
        if (firstRow + viewPortRowCount > rowCount) {
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

        dataSource.setViewportRange(firstRow, firstRow + viewPortRowCount);
        if (selection) {
            selection.repaint('LightBlue');
        }
    }

    function createCell(vpRowIndex, colIndex) {
        let type = schemas[colIndex].type;
        let span = document.createElement('span');
        let style = span.style;
        spanMatrix[vpRowIndex][colIndex] = span;
        style.position = 'absolute';
        style.top = (vpRowIndex * rowHeight) + 'px';
        style.left = (colIndex ? columnEnds[colIndex - 1] : 0) + 'px';
        style.width = schemas[colIndex].width + 'px';
        style.height = innerHeight;
        style.overflow = 'hidden';
        style.border = '1px solid black';
        style.padding = cellPadding + 'px';

        if (type === 'number') {
            span.className = 'number_column'
        }

        /* Needed to capture shiftKey! */
        span.onclick = function (_evt) {
            console.log('onclick');
            // cellParent.focus(); // So that we receive keyboard events.
            const evt = /** @type {MouseEvent} */ _evt;
            if (evt.shiftKey) {
                // TODO: Do we need this (it is already in onmouseup)?
                if (!selection) selection = new Selection(repainter);
                selection.expand(activeCell.row, activeCell.col);
                selection.expand(firstRow + vpRowIndex, colIndex);
                // We do not want DOM text node selection, its confusing.
                document.getSelection().empty();
                // Do not change the active cell.
            } else {
                if (selection) {
                    selection = selection.unselect();
                }
                activateCell(evt, firstRow + vpRowIndex - activeCell.row, colIndex - activeCell.col);
            }
            activeCell.mode = 'active';
        };

        /* Needed to capture shiftKey! */
        span.ondblclick = function (_evt) {
            console.log('ondblclick');
            const evt = /** @type {MouseEvent} */ _evt;
            activateCell(evt, firstRow + vpRowIndex - activeCell.row, colIndex - activeCell.col);
            const style = activeCell.input.style;
            const spanStyle = activeCell.span.style;
            style.top = spanStyle.top;
            style.left = spanStyle.left;
            style.width = spanStyle.width;
            spanStyle.display = 'none';
            style.display = 'inline-block';
            activeCell.input.focus();
            activeCell.mode = 'edit';
            activeCell.input.value = activeCell.span.textContent;
        };

        cellParent.appendChild(span);

        return span
    }

    let params = {
        setRowCount: function (_rowCount) {
            rowCount = _rowCount;
            console.log('rowCount: ' + rowCount);
            setFirstRow(firstRow)
        },
        setRowData: function (matrix) {
            // console.log('setRowData', rowData)
            for (let index = 0; index < spanMatrix.length; index++) {
                let inputRow = spanMatrix[index];
                let row = matrix[firstRow + index];
                for (let colIndex = 0; colIndex < colCount; colIndex++) {
                    let type = schemas[colIndex].type;
                    let input = inputRow[colIndex];
                    let value = (row ? row[colIndex] : undefined);
                    if (value === undefined) {
                        value = ''
                    } else if (type === 'number') {
                        value = schemas[colIndex].format(value);
                    } else if (type === 'date') {
                        // TODO: Choose appropriate frequency
                        value = deFormat(value, minFreq)
                    }
                    input.textContent = value;
                }
            }
        }
    };

    for (let rowIndex = 0; rowIndex < spanMatrix.length; rowIndex++) {
        spanMatrix[rowIndex] = Array(colCount);
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            let input = createCell(rowIndex, colIndex);
            //input.defaultValue = '';
            //input.value = '';
            input.setAttribute('value', '');
        }
    }

    cellParent.appendChild(input);

    dataSource.init(params);
}

/**
 * Transforms a tsv-formatted text to a matrix of strings.
 * @param {string} text
 * @returns {string[][]}
 */
export function tsvToMatrix(text) {
    let lines = text.split(/\r?\n/);
    if (lines[lines.length - 1] === '') {
        lines.pop();
    }

    if (!lines.length) {
        alert('Nothing to paste.');
        return
    }

    let matrix = Array(lines.length);
    let minRowLength = Number.POSITIVE_INFINITY;
    let maxRowLength = Number.NEGATIVE_INFINITY;
    lines.forEach(function (line, i) {
        let row = line.split('\t');
        minRowLength = Math.min(minRowLength, row.length);
        maxRowLength = Math.max(maxRowLength, row.length);
        matrix[i] = row
    });

    if (minRowLength !== maxRowLength) {
        // TODO: Why? Just fill with empty values.
        alert('Pasted text must be rectangular.');
        return null;
    }

    return matrix;
}