/**
 * Author: Wolfgang Kühn 2019-2021
 * Source located at https://github.com/decatur/gridchen
 *
 * Module implementing Excel style multi area selection behaviour on a grid.
 */

//@ts-check

import {logger, wrap} from "./utils.js";

/**
 * A rectangular area.
 * TODO: Resolve name collision with lib.dom.Range?
 * lib.dom.Range is not really prolific.
 * @implements {GridChenNS.Range}
 */
export class Range {
    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     * @param {number} rowCount
     * @param {number} columnCount
     */
    constructor(rowIndex, columnIndex, rowCount, columnCount) {
        this.setBounds(rowIndex, columnIndex, rowCount, columnCount);
    }

    /**
     * @param {number} rowIndex
     * @param {number} columnIndex
     * @param {number} rowCount
     * @param {number} columnCount
     */
    setBounds(rowIndex, columnIndex, rowCount, columnCount) {
        this.rowIndex = rowIndex;
        this.columnIndex = columnIndex;
        this.rowCount = rowCount;
        this.columnCount = columnCount;
    }

    /**
     * returns true if this range is empty.
     * @returns {boolean}
     */
    isEmpty() {
        return this.rowCount <= 0 || this.columnCount <= 0
    }

    /**
     * @returns {Range}
     */
    clone() {
        return Object.assign(new Range(0, 0, 0, 0), this);
    }

    toString() {
        return `Range(${this.rowIndex}, ${this.columnIndex}, ${this.rowCount}, ${this.columnCount})`
    }

    right() {
        return this.columnIndex + this.columnCount
    }

    bottom() {
        return this.rowIndex + this.rowCount
    }

    /**
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
            // TODO: Return empty range.
            return undefined
        }
        return new Range(row.min, col.min, row.sup - row.min, col.sup - col.min)
    }

    /**
     * Test if this range intersects with another range.
     * @param {Range} other
     * @returns {boolean}
     */
    intersects(other) {
        return this.intersect(other) !== undefined
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

    /**
     * Subtract other range from this. Returns array of ranges whose union is this-other.
     * Reimplementation of https://gist.github.com/Noitidart/90ea1ebd30156df9ef530c6a9a1b6ea7
     * @param {Range} other
     * @returns {Range[]}
     */
    subtract(other) {
        other = other.intersect(this);
        if (other === undefined) {
            return [this.clone()];
        }

        // Partition into four rectangles left, top, bottom and right strip.
        // Example: hole in the middle
        // this - other
        // ###   ...   ###   ltr
        // ### - .#. = #.# = l.r = [l, t, b, r]
        // ###   ...   ###   lbr

        let result = [];
        const l = new Range(this.rowIndex, this.columnIndex, this.rowCount, other.columnIndex - this.columnIndex);
        if (!l.isEmpty()) {
            result.push(l)
        }
        const t = new Range(this.rowIndex, other.columnIndex, other.rowIndex - this.rowIndex, other.columnCount);
        if (!t.isEmpty()) {
            result.push(t.clone())
        }
        const b = new Range(other.rowIndex + other.rowCount, other.columnIndex, this.rowCount - t.rowCount - other.rowCount, other.columnCount);
        if (!b.isEmpty()) {
            result.push(b.clone())
        }
        const r = new Range(this.rowIndex, other.columnIndex + other.columnCount, this.rowCount, this.columnCount - l.columnCount - other.columnCount);
        if (!r.isEmpty()) {
            result.push(r.clone())
        }

        return result
    }
}

/**
 * Updates the target range with the convex hull of all areas.
 * @param {Range[]} areas
 * @param {Range} target
 * @returns Range
 */
function convexHull(target, areas) {
    target.rowIndex = Math.min(...areas.map(r => r.rowIndex));
    target.rowCount = Math.max(...areas.map(r => r.rowIndex + r.rowCount)) - target.rowIndex;
    target.columnIndex = Math.min(...areas.map(r => r.columnIndex));
    target.columnCount = Math.max(...areas.map(r => r.columnIndex + r.columnCount)) - target.columnIndex;
    return target
}

/**
 * @param {*} uiRefresher
 * @param {GridChenNS.GridSelectionAbstraction} grid
 * @returns {GridChenNS.Selection}
 */
export function createSelection(uiRefresher, grid) {

    /** @implements{GridChenNS.Selection} */
    class Selection extends Range {
        /**@type{Range}*/
        active;
        /**@type{Range}*/
        pilot;
        /**@type{Range}*/
        initial;
        /**@type{Range[]}*/
        areas;
        uiRefresher;
        lastEvt;
        headerSelected;

        constructor() {
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

            grid.repaintActiveCell(this.active);
            grid.container.dispatchEvent(new Event('selectionChanged', {
                bubbles: true,
                cancelable: true,
                composed: true
            }));
        }

        hide() {
            for (const r of this.areas) {
                uiRefresher(r, false);
            }
        }

        setRange(rowIndex, columnIndex, rowCount, columnCount) {
            if (this.areas) {
                this.hide();
            }

            this.headerSelected = false;
            this.setBounds(rowIndex, columnIndex, rowCount, columnCount);
            this.active = new Range(rowIndex, columnIndex, 1, 1);
            this.initial = this.active.clone();
            this.pilot = this.active.clone();
            this.areas = [this.clone()];
            this.show();
        }

        /**
         * Synchronizes the convex hull of all areas.
         */
        convexHull() {
            convexHull(this, this.areas);
        }

        /**
         * @param evt
         * @param cellParent
         * @param {IndexToPixelMapper} indexMapper
         */
        startSelection(evt, cellParent, indexMapper) {
            _startSelection(evt, this, cellParent, indexMapper);
        }

        move(rowIncrement, columnIncrement, doExpand) {
            const selection = this;
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
                convexHull(selection, [selection.initial, pilot]);
                selection.areas = [selection.clone()];
            } else {
                selection.setBounds(pilot.rowIndex, pilot.columnIndex, 1, 1);
                selection.areas = [pilot.clone()];
                selection.initial = pilot.clone();
                selection.active = pilot.clone();
                selection.headerSelected = false;
            }

            if (rowIncrement) {
                grid.scrollIntoView(pilot.rowIndex, pilot.rowIndex - prevRowIndex);
            }

            selection.show();
        }

        /**
         * @param {KeyboardEvent} evt
         */
        keyDownHandler(evt) {
            logger.log('selection.onkeydown ' + evt.code);
            const selection = this;
            const pilot = selection.pilot;

            function move(rowIncrement, columnIncrement, doExpand) {
                evt.preventDefault();
                evt.stopImmediatePropagation();
                selection.move(rowIncrement, columnIncrement, doExpand);
            }

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
            } else if (evt.code === 'ArrowUp' || (['Enter', 'NumpadEnter'].includes(evt.code) && evt.shiftKey)) {
                const doExpand = (evt.code === 'ArrowUp' && evt.shiftKey);
                let rowIncrement;
                if ((evt.code === 'ArrowUp' && evt.ctrlKey)) {
                    rowIncrement = -pilot.rowIndex;
                } else {
                    rowIncrement = -1;
                }
                move(rowIncrement, 0, doExpand);
            } else if (evt.code === 'ArrowDown' || ['Enter', 'NumpadEnter'].includes(evt.code)) {
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
            } else if (evt.code === 'KeyA' && evt.ctrlKey) {
                // Like MS-Excel selects all non-empty cells, in our case the complete grid.
                // This is reverted on the next onblur event.
                evt.preventDefault();  // Do not select the inputs content.
                evt.stopImmediatePropagation();

                if (selection.lastEvt.code === 'KeyA' && selection.lastEvt.ctrlKey) {
                    // Already all data cells selected.
                    selection.headerSelected = true;
                    grid.container.dispatchEvent(new Event('selectionChanged', {
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    }));
                } else {
                    selection.setRange(0, 0, grid.rowCount, grid.colCount);
                }
            }

            selection.lastEvt = evt;
        }
    }

    return new Selection()
}


/**
 * @param {GridChenNS.Interval} i1
 * @param {GridChenNS.Interval} i2
 * @returns {GridChenNS.Interval}
 */
function intersectInterval(i1, i2) {
    const min = Math.max(i1.min, i2.min);
    const sup = Math.min(i1.sup, i2.sup);
    if (sup <= min) {
        return undefined;
    }
    return {min, sup}
}

/**
 *
 * @param {MouseEvent} evt
 * @param {Selection} selection
 * @param {HTMLDivElement} cellParent
 * @param {IndexToPixelMapper} indexMapper
 */
function _startSelection(evt, selection, cellParent, indexMapper) {
    let {rowIndex, columnIndex} = indexMapper.pixelCoordsToCellIndex(evt.clientX, evt.clientY);

    let current = new Range(rowIndex, columnIndex, 1, 1);
    const initial = current.clone();
    const pilot = current.clone();
    selection.headerSelected = false;

    if (evt.shiftKey && !evt.ctrlKey) {
        console.log('Expand Selection');
        selection.hide();
        selection.areas = [selection];
        selection.convexHull();
        selection.uiRefresher(current, true);
    } else if (evt.ctrlKey && !evt.shiftKey) {
        selection.uiRefresher(current, true);
    } else {
        selection.hide();
        selection.setRange(current.rowIndex, current.columnIndex, current.rowCount, current.columnCount);
    }

    function resetHandlers() {
        selection.uiRefresher(current, false);
        if (evt.shiftKey) {
            selection.areas.push(current);
            selection.convexHull();
            selection.areas = [selection];
            selection.show();
        } else if (evt.ctrlKey) {
            selection.hide();
            selection.uiRefresher(current, false);

            const newAreas = [];
            let doesIntersect = false;

            for (const area of selection.areas) {
                if (initial.intersects(area)) {
                    doesIntersect = true;
                    const hull = new Range(0, 0, 0, 0);
                    convexHull(hull, [initial, pilot]);
                    newAreas.push(...area.subtract(hull));
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
            selection.areas = [current];
            selection.convexHull();
            selection.show();
        }

        cellParent.onmousemove = cellParent.onmouseup = cellParent.onmouseleave = undefined;
    }

    /**
     * @param {MouseEvent} evt
     */
    function onmousemove(evt) {
        selection.uiRefresher(current, false);
        let {rowIndex, columnIndex} = indexMapper.pixelCoordsToCellIndex(evt.clientX, evt.clientY);
        logger.log(`onmousemove ${rowIndex} ${columnIndex}`);
        pilot.setBounds(rowIndex, columnIndex, 1, 1);
        convexHull(current, [initial, pilot]);
        logger.log(current);
        selection.uiRefresher(current, true);
    }

    cellParent.onmousemove = wrap(cellParent, onmousemove);

    cellParent.onmouseleave = wrap(cellParent, function () {
        logger.log('onmouseleave');
        resetHandlers();
    });

    cellParent.onmouseup = wrap(cellParent, function () {
        logger.log('onmouseup');
        resetHandlers();
        cellParent.focus(); // So that we receive keyboard events.
    });
}


export class IndexToPixelMapper {

    /**
     *
     * @param {HTMLElement} element
     * @param {number} rowHeight
     * @param {number[]} columnEnds
     */
    constructor(element, rowHeight, columnEnds) {
        this.element = element;
        this.rowHeight = rowHeight;
        this.columnEnds = columnEnds;
        this.firstRow = 0;
        this._columnIndexGuess = 0;
    }

    /**
     * Returns the indexed cells center coordinates in pixels.
     * @param {number} rowIndex
     * @param {number} columnIndex
     * @returns {{clientY: number, clientX: number}}
     */
    cellIndexToPixelCoords(rowIndex, columnIndex) {
        const rect = this.element.getBoundingClientRect();
        let y = this.rowHeight * (rowIndex - this.firstRow + 0.5);
        let clientY = y + rect.y;
        let x = ((columnIndex === 0 ? 0 : this.columnEnds[columnIndex - 1]) + this.columnEnds[columnIndex]) / 2;
        let clientX = x + rect.x;
        return {clientX, clientY}
    }

    /**
     * Returns the index of the cell which contains the specified pixel coordinates.
     * One-sides inverse to cellIndexToPixelCoords.
     *      pixelCoordsToCellIndex°cellIndexToPixelCoords = I
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{columnIndex: number, rowIndex: number}}
     */
    pixelCoordsToCellIndex(clientX, clientY) {
        const rect = this.element.getBoundingClientRect();
        const y = clientY - rect.y;
        const x = clientX - rect.x;
        const rowIndex = this.firstRow + Math.trunc(y / this.rowHeight);

        let columnIndex = this._columnIndexGuess;
        if (this.columnEnds[columnIndex] > x && (columnIndex === 0 || this.columnEnds[columnIndex-1]<=x)) {
            // our guess is correct
        } else if (this.columnEnds[columnIndex] <= x) {
            // Our guess is too small, so increment until we find desired index.
            const colCount = this.columnEnds.length;
            for (;columnIndex < colCount; columnIndex++) {
                if (this.columnEnds[columnIndex] > x) {
                    break;
                }
            }
            this._columnIndexGuess = columnIndex;
        } else {
            // Our guess is too big, so decrement until we find desired index.
            for (; columnIndex > 0; columnIndex--) {
                if (this.columnEnds[columnIndex-1] <= x) {
                    break;
                }
            }
            this._columnIndexGuess = columnIndex;
        }
        return {rowIndex, columnIndex}
    }
}