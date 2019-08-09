/**
 * Author: Wolfgang Kühn 2019
 * https://github.com/decatur/GridChen/modules/DataViews.js
 */

import {
    FullDateConverter,
    FullDateStringConverter,
    DatePartialTimeConverter,
    DatePartialTimeStringConverter,
    DateTimeConverter,
    DateTimeStringConverter,
    NumberConverter,
    BooleanStringConverter,
    StringConverter
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
            schema.converter = new NumberConverter(fractionDigits);
        } else if (schema.type === 'string' && schema.format === 'full-date') {
            schema.converter = new FullDateStringConverter();
        } else if (schema.type === 'FullDate') {
            schema.converter = new FullDateConverter();
        } else if (schema.type === 'string' && schema.format === 'date-partial-time') {
            schema.converter = new DatePartialTimeStringConverter();
        } else if (schema.type === 'DatePartialTime') {
            schema.converter = new DatePartialTimeConverter(schema.frequency || 'T1M');
        } else if (schema.type === 'string' && schema.format === 'date-time') {
            schema.converter = new DateTimeStringConverter(schema.frequency || 'T1M');
        } else if (schema.type === 'Date') {
            schema.converter = new DateTimeConverter(schema.frequency || 'T1M');
        } else if (schema.type === 'boolean') {
            schema.converter = new BooleanStringConverter();
        } else {
            // string and others
            schema.converter = new StringConverter();
        }
    }
}

/**
 * @param {object} properties
 * @returns {[string, object][]}
 */
function sortedColumns(properties) {
    const entries = Object.entries(properties);
    entries.sort(function (e1, e2) {
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
    if (columnSchemas instanceof Error) {
        const err = new Error('createView() received undefined schema');
        console.error(err);
        return err
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
        return {
            title: schema.title,
            columnSchemas: schema.items.items,
            viewCreator: createRowMatrixView
        }
    }

    if (schema.items && schema.items.type === 'object') {
        const entries = sortedColumns(schema.items.properties);

        return {
            title: schema.title,
            columnSchemas: entries.map(function (e) {
                e[1].title = e[1].title || e[0];
                return e[1]
            }),
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
            viewCreator: createColumnObjectView
        };

        for (const entry of entries) {
            const property = entry[1];
            const colSchema = property.items;
            if (typeof colSchema !== 'object' || colSchema.type === 'object') {
                // TODO: Be much more strict!
                return invalidError
            }
            if (!colSchema.title) colSchema.title = property.title || entry[0];
            if (!colSchema.width) colSchema.width = property.width;

            colSchemas.columnSchemas.push(colSchema);
        }

        return colSchemas
    }

    if (schema.items && schema.items.constructor === Object) {
        return {
            title: schema.title,
            columnSchemas: [schema.items],
            viewCreator: createColumnVectorView
        }
    }

    return invalidError
}

class MatrixView {

    /**
     * @returns {number}
     */
    columnCount() {
        throw new Error('Abstract method');
    }

    /**
     * @returns {number}
     */
    rowCount() {
        throw new Error('Abstract method');
    }

    /**
     * @param {number} rowIndex
     * @param {number} colIndex
     * @returns {*}
     */
    getCell(rowIndex, colIndex) {
        throw new Error('Abstract method');
    }

    /**
     * @param {number} columnIndex
     * @returns {*[]}
     */
    getColumn(columnIndex) {
        return range(this.rowCount()).map(rowIndex => this.getCell(rowIndex, columnIndex));
    }

    /**
     * @param {number} columnIndex
     * @returns {*[]}
     */
    getRow(rowIndex) {
        return range(this.columnCount()).map(columnIndex => this.getCell(rowIndex, columnIndex));
    }
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} rows
 * @returns {GridChen.MatrixView | Error}
 */
export function createRowMatrixView(schema, rows) {
    let schemas = schema.columnSchemas;
    updateSchema(schemas);

    /**
     * @implements {GridChen.MatrixView}
     */
    class RowMatrixView extends MatrixView {
        constructor() {
            super();
            this.schema = schema;
            this.model = rows;
        }

        getModel() {
            return rows;
        }

        removeModel() {
            rows = undefined;
            return [{op: 'remove', path: '/'}];
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows ? rows.length : 0
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
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            rows.splice(rowIndex, 1);
            return [{op: 'remove', path: `/${rowIndex}`}];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            // TODO: Should not be called with rowIndex >= rowCount.
            if (!rows[rowIndex]) return undefined;
            return rows[rowIndex][colIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {object[]}
         */
        setCell(rowIndex, colIndex, value) {
            let patches = [];

            if (value == null) {
                delete rows[rowIndex][colIndex];
                patches.push({op: 'remove', path: `/${rowIndex}/${colIndex}`});
                return patches
            }

            if (!rows) {
                rows = [];
                patches.push({op: 'add', path: '/', value: []});
            }

            if (!rows[rowIndex]) {
                rows[rowIndex] = Array(schemas.length);
                patches.push({op: 'add', path: `/${rowIndex}`, value: Array(schemas.length)});
            }

            patches.push({op: 'replace', path: `/${rowIndex}/${colIndex}`, value: value});

            rows[rowIndex][colIndex] = value;
            return patches;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            rows.splice(rowIndex, 0, Array(schemas.length));
            return [{op: 'add', path: `/${rowIndex}`}];
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
    }

    return new RowMatrixView();
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<object>} rows
 * @returns {GridChen.MatrixView | Error}
 */
export function createRowObjectsView(schema, rows) {
    const schemas = schema.columnSchemas;
    const ids = schema.ids;
    updateSchema(schemas);

    /**
     * @implements {GridChen.MatrixView}
     */
    class RowObjectsView extends MatrixView {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return rows;
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows ? rows.length : 0
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            rows.splice(rowIndex, 1);
            return [{op: 'remove', path: `/${rowIndex}`}];
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
         * @returns {object[]}
         */
        setCell(rowIndex, colIndex, value) {
            let patches = [];

            if (!rows) {
                rows = [];
                patches.push({op: 'add', path: '/', value: []});
            }

            if (!rows[rowIndex]) {
                rows[rowIndex] = {};
                patches.push({op: 'add', path: `/${rowIndex}`, value: {}});
            }

            patches.push({op: 'replace', path: `/${rowIndex}/${ids[colIndex]}`, value: value});
            rows[rowIndex][ids[colIndex]] = value;
            return patches;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            rows.splice(rowIndex, 0, {});
            return [{op: 'add', path: `/${rowIndex}`}];
            ;
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

    function getRowCount() {
        if (!columns) return 0;
        return columns.reduce((length, column) => Math.max(length, column.length), 0);
    }

    /**
     * @extends {GridChen.MatrixView}
     */
    class ColumnMatrixView extends MatrixView {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return columns;
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            columns.forEach(function (column) {
                column.splice(rowIndex, 1);
            });
            return range(schemas.length).map(colIndex => ({op: 'remove', path: `/${colIndex}/${rowIndex}`}));
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            if (!columns[colIndex]) return undefined;
            return columns[colIndex][rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {object[]}
         */
        setCell(rowIndex, colIndex, value) {
            let patches = [];
            if (!columns) {
                columns = [];
                patches.push({op: 'add', path: '/', value: []});
            }

            if (!columns[colIndex]) {
                columns[colIndex] = [];
                patches.push({op: 'add', path: `/${colIndex}`, value: []});
            }

            patches.push({op: 'replace', path: `/${colIndex}/${rowIndex}`, value: value});

            columns[colIndex][rowIndex] = value;
            return patches;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            let patches = [];
            columns.forEach(function (column, colIndex) {
                column.splice(rowIndex, 0, undefined);
                patches.push({op: 'add', path: `/${colIndex}/${rowIndex}`});
            });
            return patches;
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
    }

    return new ColumnMatrixView();
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {object} columns
 */
export function createColumnObjectView(schema, columns) {
    let schemas = schema.columnSchemas;
    let ids = schema.ids;
    updateSchema(schemas);

    function getRowCount() {
        if (!columns) return 0;
        return Object.values(columns).reduce((length, column) => Math.max(length, column.length), 0);
    }

    /**
     * @extends {GridChen.MatrixView}
     */
    class ColumnObjectView extends MatrixView {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return columns;
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            Object.values(columns).forEach(function (column) {
                column.splice(rowIndex, 1);
            });
            return range(schemas.length).map(colIndex => ({op: 'remove', path: `/${ids[colIndex]}/${rowIndex}`}));
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            const key = ids[colIndex];
            if (!columns[key]) return undefined;
            return columns[key][rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {object[]}
         */
        setCell(rowIndex, colIndex, value) {
            const key = ids[colIndex];
            let patches = [];
            if (!columns) {
                columns = {};
                patches.push({op: 'add', path: '/', value: {}});
            }

            if (!columns[key]) {
                columns[key] = [];
                patches.push({op: 'add', path: `/${key}`, value: []});
            }

            patches.push({op: 'replace', path: `/${key}/${rowIndex}`, value: value});

            columns[key][rowIndex] = value;
            return patches;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            let patches = [];
            // TODO: Object.values and sort index?
            Object.values(columns).forEach(function (column, colIndex) {
                column.splice(rowIndex, 0, undefined);
                patches.push({op: 'add', path: `/${colIndex}/${rowIndex}`});
            });
            return patches;
        }

        /**
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            const key = ids[colIndex];
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
            const indexes = columns[key].map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => compare(a[0], b[0]) * sortDirection);

            columns.forEach(function (column, j) {
                const sortedColumn = Array();
                indexes.forEach(function (index, i) {
                    sortedColumn[i] = column[index[1]];
                });
                columns[ids[j]] = sortedColumn;
            });

            return getRowCount();
        }
    }

    return new ColumnObjectView();
}

/**
 * @param {GridChen.IGridSchema} schema
 * @param {Array<*>} column
 */
export function createColumnVectorView(schema, column) {
    let columnSchema = schema.columnSchemas[0];
    updateSchema(schema.columnSchemas);

    function getRowCount() {
        if (!column) return 0
        return column.length
    }

    /**
     * @extends {GridChen.MatrixView}
     */
    class ColumnVectorView extends MatrixView {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return column;
        }

        removeModel() {
            column = undefined;
            return [{op: 'remove', path: '/'}];
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return 1
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            column.splice(rowIndex, 1);
            return [{op: 'remove', path: `/${rowIndex}`}];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            return column[rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param value
         * @returns {object[]}
         */
        setCell(rowIndex, colIndex, value) {
            let patches = [];

            if (value == null) {
                delete column[rowIndex];
                patches.push({op: 'remove', path: `/${rowIndex}`});
                return patches
            }

            if (!column) {
                column = [];
                patches.push({op: 'add', path: '/', value: Array.from({length: 1+rowIndex})});
            }

            patches.push({op: 'replace', path: `/${rowIndex}`, value: value});

            column[rowIndex] = value;
            return patches;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            column.splice(rowIndex, 0, undefined);
            return [{op: 'add', path: `/${rowIndex}`}]
        }

        /**
         * @param {number} colIndex
         * @returns {number}
         */
        sort(colIndex) {
            console.assert(colIndex === 0)
            let [, sortDirection] = updateSortDirection([columnSchema], 0);
            const indexes = column.map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => compare(a[0], b[0]) * sortDirection);
            const sortedColumn = Array();
            indexes.forEach(function (index, i) {
                sortedColumn[i] = column[index[1]];
            });
            column = sortedColumn;
            return getRowCount();
        }
    }

    return new ColumnVectorView();
}
