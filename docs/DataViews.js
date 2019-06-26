import {
    DateStringConverter,
    DateTimeLocalStringConverter,
    DateTimeStringConverter,
    NumberStringConverter
} from "./converter.js";


const numeric = new Set(['number', 'integer']);

function range(count) {
    return Array.from({length: count}, (_, i) => i);
}

/**
 * Compare function for all supported data types, i.e. string, numeric, date types, boolean.
 * undefined and NaN always compare as bigger.
 * @param a
 * @param b
 * @returns {number}
 */
function compare(a, b) {
    // Note that we have to handle undefined here because this is NOT the compareFct of Array.sort().
    if (a < b) return -1;
    if (a > b) return 1;
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    if (isNaN(a) && isNaN(b)) return 0;
    if (isNaN(a)) return 1;  // isNaN also works for invalid dates.
    if (isNaN(b)) return -1;
    return 0;
}

function updateSortDirection(schemas, colIndex) {
    let schema = schemas[colIndex];
    let sortDirection = schema.sortDirection;
    schemas.forEach((schema) => delete schema.sortDirection);

    if (sortDirection === undefined) {
        sortDirection = 1;
    } else {
        sortDirection *= -1;
    }

    schema.sortDirection = sortDirection;
    return [schema.type, sortDirection];
}

/**
 * @param {GridChen.IColumnSchema[]} schemas
 */
function updateSchema(schemas) {
    schemas.forEach(function (schema) {
        schema.width = Number(schema.width);
        if (numeric.has(schema.type)) {
            schema.converter = new NumberStringConverter(schema.fractionDigits === undefined ? 2 : schema.fractionDigits);
        } else if (schema.type === 'datetime') {
            schema.converter = new DateTimeStringConverter(schema.frequency || 'T1M');
        } else if (schema.type === 'datetimelocal') {
            schema.converter = new DateTimeLocalStringConverter(schema.frequency || 'T1M');
        } else if (schema.type === 'date') {
            schema.converter = new DateStringConverter();
        } else if (schema.type === 'boolean') {
            schema.converter = {
                toString: (value) => String(value),
                fromString: (value) => Boolean(value),
                toEditable: (value) => String(value)
            };
        } else {
            // string and others
            schema.converter = {
                toString: (value) => String(value),
                toEditable: (value) => String(value),
                fromString: (value) => value
            };
        }
    });
}

/**
 * @param {GridChen.JSONSchema} schema
 * @param {Array<Array<object>>} matrix
 */
export function createView(schema, matrix) {
    try {
        if (Array.isArray(schema.items.items)) {
            const colSchema = {title: schema.title, columnSchemas: schema.items.items};
            return createRowMatrixView(colSchema, matrix);
        }
    } catch (e) {
        window.console.error(e);
    }

    try {
        if (schema.items.type === 'object') {
            const colSchema = {
                title: schema.title,
                columnSchemas: Object.values(schema.items.properties),
                ids: Object.keys(schema.items.properties)
            };
            return createRowObjectsView(colSchema, matrix);
        }
    } catch (e) {
        window.console.error(e);
    }

    try {
        if (Array.isArray(schema.items)) {
            const colSchema = {title: schema.title, columnSchemas: schema.items.map(item => item.items)};
            return createColumnMatrixView(colSchema, matrix);
        }
    } catch (e) {
        window.console.error(e);
    }

    try {
        if (schema.type === 'object') {
            const colSchema = {title: schema.title, columnSchemas: Object.values(schema.properties).map(item => item.items), ids:Object.keys(schema.properties)};
            // Normalize missing columnCount (ragged columnCount are allowed).
            const columns = colSchema.ids.map(id => matrix[id] || Array());
            return createColumnMatrixView(colSchema, columns);
        }
    } catch (e) {
        window.console.error(e);
    }

    return new Error('Invalid schema: ' + schema.title);
}


/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} rows
 * @returns {GridChen.DataView}
 */
export function createRowMatrixView(schema, rows) {
    let schemas = schema.columnSchemas;
    updateSchema(schemas);

    // Normalize missing rowCount (ragged rowCount are allowed).
    /*rowCount.forEach(function (row, i) {
        if (row === undefined) rowCount[i] = Array(schemas.length);
    });*/

    class RowMatrixView {
        constructor() {
            this.schema = schema;
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows.length
        }

        /**
         * @param {IInterval} rowsRange
         * @param {number} colIndex
         * @returns {?[]}
         */
        getColumnSlice(rowsRange, colIndex) {
            return range(rowsRange.sup - rowsRange.min).map(i => rowsRange[rowsRange.min + i][colIndex]);
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
         * @returns {object}
         */
        getCell(rowIndex, colIndex) {
            if (!rows[rowIndex]) return undefined;
            return rows[rowIndex][colIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {number}
         */
        setCell(rowIndex, colIndex, value) {
            if (!rows[rowIndex]) rows[rowIndex] = Array(schemas.length);
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
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            let [type, sortDirection] = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => compare(row1[colIndex], row2[colIndex]) * sortDirection);
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
 * @param {Array<object>} rows
 * @returns {GridChen.DataView}
 */
export function createRowObjectsView(schema, rows) {
    const schemas = schema.columnSchemas;
    const ids = schema.ids;
    updateSchema(schemas);

    // Normalize missing rowCount (ragged rowCount are allowed).
    /*rowCount.forEach(function (row, i) {
        if (row === undefined) rowCount[i] = {};
    });*/

    class RowObjectsView {
        constructor() {
            this.schema = schema;
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows.length
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
         * @returns {object}
         */
        getCell(rowIndex, colIndex) {
            if (!rows[rowIndex]) return undefined;
            return rows[rowIndex][ids[colIndex]];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {number}
         */
        setCell(rowIndex, colIndex, value) {
            if (!rows[rowIndex]) rows[rowIndex] = {};
            rows[rowIndex][ids[colIndex]] = value;
            return rows.length;
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        insertRowBefore(rowIndex) {
            rows.splice(rowIndex + 1, 0, {});
            return rows.length;
        }

        /**
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            let [type, sortDirection] = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => compare(row1[ids[colIndex]], row2[ids[colIndex]]) * sortDirection);
            return rows.length;
        }

        plot() {
            renderPlot(schema, rows);
        }
    }

    return new RowObjectsView();
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} columns
 */
export function createColumnMatrixView(schema, columns) {
    let schemas = schema.columnSchemas;
    updateSchema(schemas);

    // Normalize missing columnCount (ragged columnCount are allowed).
    /*columnCount.forEach(function (column, j) {
        if (column === undefined) columnCount[j] = Array();
    });*/

    function getRowCount() {
        return columns.reduce((length, column) => Math.max(length, column.length), 0);
    }

    /**
     * @extends {GridChen.DataView}
     */
    class ColumnMatrixView {
        constructor() {
            this.schema = schema;
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        deleteRow(rowIndex) {
            columns.forEach(function (column) {
                column.splice(rowIndex, 1);
            });
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {object}
         */
        getCell(rowIndex, colIndex) {
            return columns[colIndex][rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {number}
         */
        setCell(rowIndex, colIndex, value) {
            columns[colIndex][rowIndex] = value;
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @returns {number}
         */
        insertRowBefore(rowIndex) {
            columns.forEach(function (column) {
                column.splice(rowIndex + 1, 0, undefined);
            });
            return getRowCount();
        }

        /**
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            let [type, sortDirection] = updateSortDirection(schemas, colIndex);
            const indexes = columns[colIndex].map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => compare(a[0], b[0]) * sortDirection);

            columns.forEach(function (column, j) {
                const sortedColumn = Array();
                indexes.forEach(function (index, i) {
                    sortedColumn[i] = column[index[1]];
                });
                columns[j] = sortedColumn;
            });

            return getRowCount();
        }

        plot() {
            renderPlot(schema, columns);
        }
    }

    return new ColumnMatrixView();
}

