/**
 * Author: Wolfgang Kühn 2019
 * https://github.com/decatur/GridChen/modules/DataViews.js
 */

import {
    DateStringConverter,
    DateTimeLocalStringConverter,
    DateTimeStringConverter,
    NumberStringConverter,
    BooleanStringConverter,
    StringStringConverter
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
    let sortSchema = schemas[colIndex];
    let sortDirection = sortSchema.sortDirection;
    for (const schema of schemas) {
        delete schema.sortDirection
    }

    if (sortDirection === undefined) {
        sortDirection = 1;
    } else {
        sortDirection *= -1;
    }

    sortSchema.sortDirection = sortDirection;
    return [sortSchema.type, sortDirection];
}

/**
 * @param {GridChen.IColumnSchema[]} schemas
 */
function updateSchema(schemas) {
    for (const schema of schemas) {
        schema.width = Number(schema.width || (schema.title.length * 12) || 100);
        schema.type = schema.type || 'string';

        if (numeric.has(schema.type)) {
            let fractionDigits = 2;
            if (schema.fractionDigits !== undefined) {
                fractionDigits = schema.fractionDigits;
            } else if (schema.type === 'integer') {
                fractionDigits = 0;
            }
            schema.converter = new NumberStringConverter(fractionDigits);
        } else if (schema.format === 'datetime') {
            schema.converter = new DateTimeStringConverter(schema.frequency || 'T1M');
        } else if (schema.format === 'datetimelocal') {
            schema.converter = new DateTimeLocalStringConverter(schema.frequency || 'T1M');
        } else if (schema.format === 'date') {
            schema.converter = new DateStringConverter();
        } else if (schema.type === 'boolean') {
            schema.converter = new BooleanStringConverter();
        } else {
            // string and others
            schema.converter = new StringStringConverter();
        }
    }
}

/**
 * @param {object} properties
 * @returns {[string, object][]}
 */
function sortedColumns(properties) {
    const entries = Object.entries(properties);
    entries.sort(function(e1, e2) {
        const o1 = e1[1]['columnOrder'];
        const o2 = e2[1]['columnOrder'];
        if (o1 !== undefined && o2 !== undefined) {
            return o1 - o2;
        }
        return 0;
    });
    return entries;
}


/**
 * @param {GridChen.JSONSchema} schema
 * @param {Array<object>} matrix
 * @returns {?}
 */
export function createView(schema, matrix) {
    const columnSchemas = createColumnSchemas(schema);
    if (schema instanceof Error) {
        return new Error('createView() received undefined schema')
    }
    return columnSchemas.viewCreator(columnSchemas, matrix);
}

/**
 * @param {GridChen.JSONSchema} schema
 * @returns {object | Error}
 */
export function createColumnSchemas(schema) {
    if (!schema) {
        return new Error('selectViewCreator() received undefined schema')
    }

    const invalidError = new Error('Invalid schema: ' + schema.title);

    if (schema.items && Array.isArray(schema.items.items)) {
        return {title: schema.title, columnSchemas: schema.items.items, viewCreator: createRowMatrixView}
    }

    if (schema.items && schema.items.type === 'object') {
        const entries = sortedColumns(schema.items.properties);

        return {
            title: schema.title,
            columnSchemas: entries.map(e => e[1]),
            ids: entries.map(e => e[0]),
            viewCreator: createRowObjectsView
        }
    }

    if (Array.isArray(schema.items)) {
        return {
            title: schema.title,
            columnSchemas: schema.items.map(item => item.items),
            viewCreator: createColumnMatrixView
        }
    }

    if (typeof schema.properties === 'object') {
        // Object of columns.

        const entries = sortedColumns(schema.properties);
        const colSchemas = {
            title: schema.title,

            columnSchemas: [],
            ids: entries.map(e => e[0]),
            viewCreator: function(schema, colObject) {
                const columns = [];
                for (let id of colSchemas.ids) {
                    let column = colObject[id];
                    if (!column) {
                        column = [];
                        colObject[id] = column;
                    }
                    columns.push(column);
                }
                return createColumnMatrixView(schema, columns);
            }
        };

        for (const entry of entries) {
            const property = entry[1];
            const colSchema = property.items;
            if (typeof colSchema !== 'object' || colSchema.type === 'object') {
                // TODO: Be much more strict!
                return invalidError
            }
            if (!colSchema.title) colSchema.title = property.title;
            if (!colSchema.width) colSchema.width = property.width;

            colSchemas.columnSchemas.push(colSchema);
        }

        // Normalize missing columnCount (ragged columnCount are allowed).
        // TODO: Must use matrix!

        return colSchemas
    }

    return invalidError
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} rows
 * @returns {GridChen.DataView | Error}
 */
export function createRowMatrixView(schema, rows) {
    let schemas = schema.columnSchemas;
    updateSchema(schemas);

    if (!rows) {
        return new Error('createView() received undefined data with schema title ' + schema.title);
    }

    // Normalize missing rowCount (ragged rowCount are allowed).
    /*rowCount.forEach(function (row, i) {
        if (row === undefined) rowCount[i] = Array(schemas.length);
    });*/

    /**
     * @implements {GridChen.DataView}
     */
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
         * @returns {*}
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
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
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
 * @returns {GridChen.DataView | Error}
 */
export function createRowObjectsView(schema, rows) {
    const schemas = schema.columnSchemas;
    const ids = schema.ids;
    updateSchema(schemas);

    if (!rows) {
        return new Error('createView() received undefined data with schema title ' + schema.title);
    }

    // Normalize missing rowCount (ragged rowCount are allowed).
    /*rowCount.forEach(function (row, i) {
        if (row === undefined) rowCount[i] = {};
    });*/

    /**
     * @implements {GridChen.DataView}
     */
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
         * @returns {*}
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
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
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

    if (!columns) {
        return new Error('createView() received undefined data with schema title ' + schema.title);
    }

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
         * @returns {*}
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
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
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
