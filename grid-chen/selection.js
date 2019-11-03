/**
 * Author: Wolfgang Kühn 2019
 * Source located at https://github.com/decatur/grid-chen/grid-chen
 *
 * Module implementing Excel style multi area selection behaviour on a grid.
 */

import {Rect} from "./geometry.js";
import {logger} from "./utils.js";

/**
 * TODO: Resolve name collision with lib.dom.Range?
 * lib.dom.Range is not really prolific.
 * @implements {GridChen.Range}
 */
export class Range {
    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     * @param {number} rowCount
     * @param {number} columnCount
     */
    constructor(rowIndex, columnIndex, rowCount, columnCount) {
        this.rowIndex = rowIndex;
        this.columnIndex = columnIndex;
        this.rowCount = rowCount;
        this.columnCount = columnCount;
    }

    /**
     * @returns {Range}
     */
    clone() {
        return Object.assign(new Range(0, 0,0,0), this);
    }

    toString() {
        return `Range(${this.rowIndex}, ${this.columnIndex}, ${this.rowCount}, ${this.columnCount})`
    }

    /**
     * TODO: Merge Range and Rect.
     * Intersect this range with another range.
     * @param {Range} other
     * @returns {Range}
     */
    intersect(other) {
        const row = intersectInterval(
            /**@type{GridChen.Interval}*/{min: this.rowIndex, sup: this.rowIndex + this.rowCount},
            /**@type{GridChen.Interval}*/{min: other.rowIndex, sup: other.rowIndex + other.rowCount});
        const col = intersectInterval(
            /**@type{GridChen.Interval}*/{min: this.columnIndex, sup: this.columnIndex + this.columnCount},
            /**@type{GridChen.Interval}*/{min: other.columnIndex, sup: other.columnIndex + other.columnCount});
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

export class Selection extends Range {
    constructor(uiRefresher) {
        super(0, 0, 1, 1);
        this.uiRefresher = uiRefresher;
        this.lastEvt = undefined;
    }

    /**
     */
    show() {
        for (const r of this.areas) {
            this.uiRefresher(r, true);
        }

        this.grid.repaintActiveCell(this.active);
        this.grid.container.dispatchEvent(new Event('selectionChanged', {bubbles: true, cancelable:true, composed:true}));
    }

    hide() {
        for (const r of this.areas) {
            this.uiRefresher(r, false);
        }
    }

    setRange(rowIndex, columnIndex, rowCount, columnCount) {
        if (this.areas) {
            this.hide();
        }

        this.headerSelected = false;
        this.active = new Range(rowIndex, columnIndex, 1, 1);
        this.initial = this.active.clone();
        this.pilot = this.active.clone();
        this.areas = [new Range(rowIndex, columnIndex, rowCount, columnCount)];

        this.convexHull();
        this.show();
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

    startSelection(evt, cellParent, rowHeight, colCount, columnEnds, firstRow) {
        startSelection(evt, this, cellParent, rowHeight, colCount, columnEnds, firstRow)
    }

    move(rowIncrement, columnIncrement, doExpand) {
        const selection = this;
        const grid = selection.grid;
        const pilot = selection.pilot;

        selection.hide();

        const prevRowIndex = pilot.rowIndex;

        console.assert(pilot.rowCount * pilot.columnCount === 1);
        pilot.rowIndex += rowIncrement;
        pilot.columnIndex += columnIncrement;

        if (pilot.rowIndex < 0) {
            rowIncrement = -1;
            pilot.rowIndex = 0;
        }

        if (pilot.columnIndex === -1) {
            if (pilot.rowIndex > 0) {
                pilot.columnIndex = grid.colCount - 1;
                pilot.rowIndex--;
            } else {
                pilot.columnIndex = 0;
            }
        } else if (pilot.columnIndex === grid.colCount) {
            pilot.columnIndex = 0;
            pilot.rowIndex++;
        }

        if (doExpand) {
            const r = selection.areas[selection.areas.length - 1];
            expand(r, selection.initial, pilot.rowIndex, pilot.columnIndex);
        } else {
            selection.areas = [pilot.clone()];
            selection.initial = pilot.clone();
            selection.active = pilot.clone();
            selection.headerSelected = false;
        }

        selection.convexHull();
        if (rowIncrement) {
            grid.scrollIntoView(pilot.rowIndex, pilot.rowIndex - prevRowIndex);
        }

        selection.show();
    }
}

/**
 * @param evt
 * @param {Selection} selection
 */
export function keyDownHandler(evt, selection) {
    logger.log('selection.onkeydown ' + evt.code);

    const grid = selection.grid;
    const pilot = selection.pilot;

    function move(rowIncrement, columnIncrement, doExpand) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        selection.move(rowIncrement, columnIncrement, doExpand);
    }

    selection.headerSelected = false;

    if (evt.code === 'ArrowLeft' || (evt.code === "Tab" && evt.shiftKey)) {
        const doExpand = (evt.code === 'ArrowLeft' && evt.shiftKey);
        let columnIncrement;
        if ((evt.code === 'ArrowLeft' && evt.ctrlKey)) {
            columnIncrement = -pilot.columnIndex;
        } else {
            columnIncrement = -1;
        }
        move(0, columnIncrement, doExpand);
    } else if (evt.code === 'ArrowRight' || evt.code === 'Tab') {
        const doExpand = (evt.code === 'ArrowRight' && evt.shiftKey);
        let columnIncrement;
        if ((evt.code === 'ArrowRight' && evt.ctrlKey)) {
            columnIncrement = grid.colCount - 1 - pilot.columnIndex;
        } else {
            columnIncrement = 1;
        }
        move(0, columnIncrement, doExpand);
    } else if (evt.code === 'ArrowUp' || (evt.code === "Enter" && evt.shiftKey)) {
        const doExpand = (evt.code === 'ArrowUp' && evt.shiftKey);
        let rowIncrement;
        if ((evt.code === 'ArrowUp' && evt.ctrlKey)) {
            rowIncrement = -pilot.rowIndex;
        } else {
            rowIncrement = -1;
        }
        move(rowIncrement, 0, doExpand);
    } else if (evt.code === 'ArrowDown' || evt.code === 'Enter') {
        const doExpand = (evt.code === 'ArrowDown' && evt.shiftKey);
        let rowIncrement;
        if ((evt.code === 'ArrowDown' && evt.ctrlKey)) {
            rowIncrement = grid.rowCount - 1 - pilot.rowIndex;
        } else {
            rowIncrement = 1;
        }
        move(rowIncrement, 0, doExpand);
    } else if (evt.code === 'PageUp') {
        move(-grid.pageIncrement, 0, evt.shiftKey);
    } else if (evt.code === 'PageDown') {
        move(grid.pageIncrement, 0, evt.shiftKey);
    } else if (evt.code === 'Space' && evt.shiftKey) {
        // Expand top area horizontally
        evt.preventDefault();
        evt.stopImmediatePropagation();
        const topArea = selection.areas.pop();
        selection.setRange(topArea.rowIndex, 0, topArea.rowCount, grid.colCount);
    } else if (evt.code === 'Space' && evt.ctrlKey) {
        // Expand top area vertically
        evt.preventDefault();
        evt.stopImmediatePropagation();
        const topArea = selection.areas.pop();
        selection.setRange(0, selection.active.columnIndex, grid.rowCount, topArea.columnCount);
    }
    else if (evt.code === 'KeyA' && evt.ctrlKey) {
        // Like MS-Excel selects all non-empty cells, in our case the complete grid.
        // This is reverted on the next onblur event.
        evt.preventDefault();  // Do not select the inputs content.
        evt.stopImmediatePropagation();

        if (selection.lastEvt.code === 'KeyA' && selection.lastEvt.ctrlKey) {
            // Already all data cells selected.
            selection.headerSelected = true;
            selection.grid.container.dispatchEvent(new Event('selectionChanged', {bubbles: true, cancelable:true, composed:true}));
        } else {
            selection.setRange(0, 0, grid.rowCount, grid.colCount);
        }
    }

    selection.lastEvt = evt;
}

/**
 * @param {GridChen.Interval} i1
 * @param {GridChen.Interval} i2
 * @returns {GridChen.Interval}
 */
function intersectInterval(i1, i2) {
    const min = Math.max(i1.min, i2.min);
    const sup = Math.min(i1.sup, i2.sup);
    if (sup <= min) {
        return undefined;
    }
    return /**@type{GridChen.Interval}*/ {min, sup}
}

/**
 * @param range
 * @param initial
 * @param {number} rowIndex
 * @param {number} columnIndex
 */
function expand(range, initial, rowIndex, columnIndex) {
    const r = range;
    r.rowIndex = Math.min(initial.rowIndex, rowIndex);
    r.columnIndex = Math.min(initial.columnIndex, columnIndex);
    r.rowCount = 1 + Math.max(initial.rowIndex, rowIndex) - r.rowIndex;
    r.columnCount = 1 + Math.max(initial.columnIndex, columnIndex) - r.columnIndex;
}

/**
 *
 * @param evt
 * @param {Selection} selection
 * @param {HTMLDivElement} cellParent
 * @param {number} rowHeight
 * @param {number} colCount
 * @param {number[]} columnEnds
 * @param {number} firstRow
 */
function startSelection(evt, selection, cellParent, rowHeight, colCount, columnEnds, firstRow) {
    const rect = cellParent.getBoundingClientRect();

    function index(evt) {
        const y = evt.clientY - rect.y;
        const x = evt.clientX - rect.x;
        // log.log(x + ' ' + y);
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

    let current = new Range(rowIndex, colIndex, 1, 1);
    selection.initial = current.clone();
    selection.active = current.clone();
    selection.pilot = current.clone();
    selection.headerSelected = false;

    /** @type{GridChen.Range} */
    let initial = selection.initial;

    if (evt.shiftKey && !evt.ctrlKey) {
    } else if (evt.ctrlKey && !evt.shiftKey) {
        selection.uiRefresher(current, true);
    } else {
        selection.hide();
        selection.areas.length = 0;
        selection.uiRefresher(current, true);
    }

    function resetHandlers() {
        selection.uiRefresher(current, false);
        if (evt.shiftKey) {
            selection.areas.push(current);
            selection.convexHull();
            selection.show();
        } else if (evt.ctrlKey) {
            selection.hide();

            const newAreas = [];
            let doesIntersect = false;
            const pivot = new Rect(initial.columnIndex, initial.rowIndex, 1, 1);

            for (const area of selection.areas) {
                const r = new Rect(area.columnIndex, area.rowIndex, area.columnCount, area.rowCount);
                if (pivot.intersects(r)) {
                    doesIntersect = true;
                    const minus = r.subtract(pivot);
                    for (let part of minus) {
                        newAreas.push(new Range(part.top, part.left, part.height, part.width));
                    }
                } else {
                    newAreas.push(area);
                }
            }
            if (!doesIntersect) {
                selection.areas.push(current);
            } else {
                selection.areas = newAreas;
            }

            selection.convexHull();
            selection.show();
        } else {
            selection.areas.push(current);
            selection.convexHull();
            selection.show();
        }

        cellParent.onmousemove = cellParent.onmouseup = cellParent.onmouseleave = undefined;
    }

    cellParent.onmousemove = function (evt) {
        let {rowIndex, colIndex} = index(evt);
        logger.log(`onmousemove ${rowIndex} ${colIndex}`);

        //if (rowIndex - firstRow < cellMatrix.length) {
        expand(current, initial, rowIndex, colIndex);
        selection.uiRefresher(current, true);
        //}
    };

    cellParent.onmouseleave = function () {
        logger.log('onmouseleave');
        resetHandlers();
    };

    cellParent.onmouseup = function () {
        logger.log('onmouseup');
        resetHandlers();
        cellParent.focus(); // So that we receive keyboard events.
    }
}