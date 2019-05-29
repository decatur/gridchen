import {renderPlot} from "./plot.js"

function numericCompare(a, b) {
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    return a - b;
}

function updateSortDirection(schemas, colIndex) {
    let sortDirection = schemas[colIndex].sortDirection;
    schemas.forEach((schema) => delete schema.sortDirection);

    if (sortDirection === undefined) {
        sortDirection = 1;
    } else {
        sortDirection *= -1;
    }

    schemas[colIndex].sortDirection = sortDirection;
    return sortDirection;
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} rows
 */
export function createRowMatrixView(schema, rows) {
    let schemas = schema.columnSchemas;

    // Normalize missing rows (ragged rows are allowed).
    rows = rows.map(row => row===undefined?Array():row);

    class RowMatrixView {

        constructor() {
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows.length
        }

        /**
         * @param {number} firstRow
         * @param {number} lastRow
         */
        getRows(firstRow, lastRow) {
            let rowData = {};
            for (let i = firstRow; i < Math.min(lastRow, rows.length); i++) {
                rowData[i] = rows[i];
            }
            return rowData;
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        deleteRow(rowIndex) {
            rows.splice(rowIndex, 1);
            return rows.length;
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {number}
         */
        setCell(rowIndex, colIndex, value) {
            if (rows[rowIndex] === undefined) {
                rows[rowIndex] = Array(schemas.length);
            }
            rows[rowIndex][colIndex] = value;
            return rows.length;
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        insertRowBefore(rowIndex) {
            rows.splice(rowIndex + 1, 0, Array(schemas.length));
            return rows.length;
        }

        /**
         * @param {Rectangle} selection
         */

        /*delete(selection) {
            data.splice(selection.row.min, selection.row.sup - selection.row.min);
            return data.length;
        }

        onClear() {
            data.length = 0;
            return data.length;
        }*/

        /**
         * @param {Rectangle} selection
         * @param {string} sep
         * @returns {string}
         */
        copy(selection, sep) {
            const schemas = schema.columnSchemas;
            let tsvRows = Array(selection.row.sup - selection.row.min);
            for (let i = 0, rowIndex = selection.row.min; rowIndex < selection.row.sup; i++, rowIndex++) {
                tsvRows[i] = Array(selection.col.sup - selection.col.min);
                let row = rows[rowIndex];

                for (let j = 0, colIndex = selection.col.min; colIndex < selection.col.sup; colIndex++, j++) {
                    let schema = schemas[colIndex];
                    let value = row[colIndex];
                    if (value !== undefined) {
                        value = schema.converter.toString(value);
                    }
                    tsvRows[i][j] = value;
                }
                // Note that a=[undefined, 3].join(',') is ',3', which is what we want.
                tsvRows[i] = tsvRows[i].join(sep)
            }
            return tsvRows.join('\r\n')
        }

        /**
         * @param {number} topRowIndex
         * @param {number} topColIndex
         * @param matrix
         * @returns {number}
         */
        paste(topRowIndex, topColIndex, matrix) {
            if (!matrix[0].length) {
                alert('You have nothing to paste')
            }

            let rowIndex = topRowIndex;
            let endRowIndex = rowIndex + matrix.length;

            for (let i = 0; rowIndex < endRowIndex; i++, rowIndex++) {
                let row = rows[rowIndex];
                let colIndex = topColIndex;
                let endColIndex = colIndex + matrix[0].length;
                for (let j = 0; colIndex < endColIndex; colIndex++, j++) {
                    let value = matrix[i][j];
                    if (value !== undefined) value = schemas[colIndex].converter.fromString(value);
                    row[colIndex] = value;
                }
            }

            return rows.length;
        }

        /**
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            let sortDirection = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => numericCompare(row1[colIndex], row2[colIndex]) * sortDirection);
            return rows.length;
        }

        plot() {
            renderPlot(schema, rows);
        }
    }

    return new RowMatrixView();
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} columns
 */
export function createColumnMatrixView(schema, columns) {
    let schemas = schema.columnSchemas;

    // Normalize missing columns (ragged columns are allowed).
    columns = columns.map(column => column===undefined?Array():column);

    function getRowCount() {
        return columns.reduce((length, column) => Math.max(length, column.length), 0);
    }

    /**
     * @extends {GridChen.DataView}
     */
    class ColumnMatrixView {

        constructor() {
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @param {number} firstRow1
         * @param {number} lastRow
         */
        getRows(firstRow, lastRow) {
            let rowData = {};
            for (let i = firstRow; i < lastRow; i++) {
                rowData[i] = Array(columns.length);
            }

            columns.forEach(function(column, j) {
                 for (let i = firstRow; i < Math.min(lastRow, column.length); i++) {
                    rowData[i][j] = column[i];
                }
            });

            return rowData;
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        deleteRow(rowIndex) {
            columns.forEach(function(column, j) {
                column.splice(rowIndex, 1);
            });
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {number}
         */
        setCell(rowIndex, colIndex, value) {
            const rowCount = getRowCount();
            if (columns[colIndex] === undefined) {
                columns[colIndex] = Array(rowCount);
            }
            columns[colIndex][rowIndex] = value;
            return rowCount;
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        insertRowBefore(rowIndex) {
            columns.forEach(function(column) {
                column.splice(rowIndex + 1, 0, undefined);
            });
            return getRowCount();
        }

        /**
         * @param {GridChen.IRectangle} selection
         * @param {string} sep
         * @returns {string}
         */
        copy(selection, sep) {
            const schemas = schema.columnSchemas;
            let tsvRows = Array(selection.row.sup - selection.row.min);
            for (let i = 0, rowIndex = selection.row.min; rowIndex < selection.row.sup; i++, rowIndex++) {
                tsvRows[i] = Array(selection.col.sup - selection.col.min);
                for (let j = 0, colIndex = selection.col.min; colIndex < selection.col.sup; colIndex++, j++) {
                    let schema = schemas[colIndex];
                    let value = columns[colIndex][rowIndex];
                    if (value !== undefined) {
                        value = schema.converter.toString(value);
                    }
                    tsvRows[i][j] = value;
                }
                // Note that a=[undefined, 3].join(',') is ',3', which is what we want.
                tsvRows[i] = tsvRows[i].join(sep)
            }
            return tsvRows.join('\r\n')
        }

        /**
         * @param {number} topRowIndex
         * @param {number} topColIndex
         * @param matrix
         * @returns {number}
         */
        paste(topRowIndex, topColIndex, matrix) {
            if (!matrix[0].length) {
                alert('You have nothing to paste')
            }

            let rowIndex = topRowIndex;
            let endRowIndex = rowIndex + matrix.length;

            for (let i = 0; rowIndex < endRowIndex; i++, rowIndex++) {
                let colIndex = topColIndex;
                let endColIndex = colIndex + matrix[0].length;
                for (let j = 0; colIndex < endColIndex; colIndex++, j++) {
                    let value = matrix[i][j];
                    if (value !== undefined) value = schemas[colIndex].converter.fromString(value);
                    columns[colIndex][rowIndex] = value;
                }
            }

            return columns.length;
        }

        /**
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            let sortDirection = updateSortDirection(schemas, colIndex);
            const indexes = columns[colIndex].map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => numericCompare(a[0], b[0])*sortDirection);

            const sortedColumns = Array(columns.length);
            columns.forEach(function(column, j) {
                sortedColumns[j] = Array();
                indexes.forEach(function(index, i) {
                    sortedColumns[j][i] = column[index[1]];
                })
            });

            columns = sortedColumns;
            return getRowCount();
        }

        plot() {
            renderPlot(schema, columns);
        }
    }

    return new ColumnMatrixView();

}
