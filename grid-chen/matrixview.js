/**
 * Author: Wolfgang Kühn 2019
 * Source https://github.com/decatur/grid-chen/grid-chen/matrixview.js
 */

// TODO: Rename to matrix-view.js

import * as c from "./converter.js";

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
 * @param {GridChen.ColumnSchema[]} schemas
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
            schema.converter = new c.NumberConverter(fractionDigits);
            if (schema.format === '%') {
                schema.converter.isPercent = true;
            }
        } else if (schema.type === 'string' && schema.format === 'full-date') {
            schema.converter = new c.FullDateStringConverter();
        } else if (schema.type === 'string' && schema.format === 'date-partial-time') {
            schema.converter = new c.DatePartialTimeStringConverter();
        } else if (schema.type === 'string' && schema.format === 'date-time') {
            schema.converter = new c.DateTimeStringConverter(schema.frequency || 'M');
        } else if (schema.type === 'object' && schema.format === 'full-date') {
            schema.converter = new c.FullDateConverter();
        } else if (schema.type === 'object' && schema.format === 'date-partial-time') {
            schema.converter = new c.DatePartialTimeConverter(schema.frequency || 'M');
        } else if (schema.type === 'object' && schema.format === 'date-time') {
            schema.converter = new c.DateTimeConverter(schema.frequency || 'M');
        } else if (schema.type === 'boolean') {
            schema.converter = new c.BooleanStringConverter();
        } else if (schema.type === 'string' && schema.format === 'uri') {
            schema.converter = new c.URIConverter();
        } else {
            // string and others
            schema.converter = new c.StringConverter();
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
        const o1 = e1[1]['columnIndex'];
        const o2 = e2[1]['columnIndex'];
        if (o1 !== undefined && o2 !== undefined) {
            return o1 - o2;
        }
        return 0;
    });
    return entries;
}


/**
 * @param {GridChen.JSONSchema} schema
 * @param {?} matrix
 * @returns {?}
 */
export function createView(schema, matrix) {
    const columnSchemas = createColumnSchemas(schema);
    if (columnSchemas instanceof Error) {
        const err = new Error('createView() received undefined schema');
        console.error(err);
        return err
    }

    columnSchemas.readOnly = (typeof schema.readOnly==='boolean')?schema.readOnly:false;
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
            if (typeof colSchema !== 'object') {
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
        const title = schema.title || schema.items.title;
        schema.items.title = title;
        return {
            title: title,
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
     * @param {number} rowIndex
     * @returns {*[]}
     */
    getRow(rowIndex) {
        return range(this.columnCount()).map(columnIndex => this.getCell(rowIndex, columnIndex));
    }
}

// # Notes about JSON Patch
//
// # Root
// Root path is '', not '/'.
//
// # Arrays
// Index based patching of arrays is weird, value based patching is not supported.
//
// # About index based patching
// In general it is not possible to set array values by index. For example
//     let a = Array(2);
//     0 in a === false;
//     a[0] = 1;
// cannot be expressed by JSON Patch operations. Patching a above by {op:'add', path:'/0', value:1}
// will result in an array of length 3.
// Array values can be inserted, replaced or removed. Indices which do not exits cannot be set.
//
// # Solution
// Work only with arrays where all indices are set. Missing values should be null or undefined.
// So instead of Array(2) use [null, null] or es6 Array.from({length:2}, ()=>null).
// To set a value at index k, first make sure that the target object is an array, for example
//     {op:'add', path:'', value:[]}
// Then
// Case k < array.length: This is a simple {op:'replace', path:'/k', value:value}.
// Case k >= array.length: Add k - array.length nulls followed by adding the value, or
//     for (const l=array.length; l < k; l++) {op:'add', path:'/-', value:null}
//     {op:'add', path:'/-', value:value}

/**
 * @param {number} length
 * @param {function?} mapfn
 * @returns {undefined[]}
 */
function createArray(length, mapfn) {
    // Note this is differs from Array(length), the latter not having any index set
    // (which we need for JSON Patch)
    mapfn = mapfn || (() => undefined);
    return Array.from({length: length}, mapfn)
}

function padArray(a, targetLength, path) {
    const patch = [];
    for (let k = a.length; k<targetLength; k++) {
        a[k] = null;
        patch.push({op: 'add', path: path, value: null});
    }
    return patch
}

/**
 * @param {{op:string, path:string}} op
 */
function reverseOp(op) {
    if (op.op === 'replace') {
        // {"op":"replace","path":"/0/1"}
        return {op:op.op, path:op.path, value:op.oldValue, oldValue:op.value}
    } else if (op.op === 'add') {
        // {"op":"add","path":"/-","value":null}
        // {"op":"add","path":"/1"}
        return {op:'remove', path:op.path}
    } else if (op.op === 'remove') {
        // {"op":"remove","path":"/1","oldValue":["2020-01-01",2]}
        return {op:'add', path:op.path, value:op.oldValue}
    }
    [{"op":"remove","path":"/1","oldValue":["2020-01-01",2]}]
    throw new Error(JSON.stringify(op))
}

/**
 * @param {{data:object}} holder
 * @param {{op:string, path:string}, value?:*} op
 */
function applyOp(holder, op) {
    const data = holder.data;
    if (op.op === 'replace') {
        // {"op":"replace","path":"/0/1"}
        const path = op.path.split('/');
        if (path.length === 3) {
            data[path[1]][path[2]] = op.value;
        } else if (path.length === 2) {
            data[path[1]] = op.value;
        } else {
            throw new Error(JSON.stringify(op))
        }
    } else if (op.op === 'add') {
        const path = op.path.split('/');
        if (path.length === 3) {
            /*if (data[path[1]] == null) {
                data[path[1]] = []
            }*/

            data[path[1]][path[2]] = op.value;
        } else if (path.length === 2) {
            data.splice(path[1], 0, op.value);
        } else if (path.length === 1) {
            data.splice(path[1], 0, op.value);
        } else {
            throw new Error(JSON.stringify(op))
        }
    } else if (op.op === 'remove') {
        const path = op.path.split('/');
        if (path[1] === '-') path[1] = data.length-1;

        if (path.length === 3) {
            if (path[2] === '-') path[2] = data[path[1]].length-1;
            if (Array.isArray(data[path[1]])) {
                data[path[1]].splice(path[2], 1);
            } else {
                delete data[path[1]][path[2]];
            }
        } else if (path.length === 2) {
            if (Array.isArray(data)) {
                data.splice(path[1], 1);
            } else {
                delete data[path[1]];
            }
        } else {
            // {"op":"remove","path":""}
            delete holder.data;
        }
    } else {
        throw new Error(JSON.stringify(op))
    }
}

/**
 * @param {object} holder
 * @param {object[]} patch
 */
function redo(holder, patch) {
    console.log(JSON.stringify(patch))
    for (let op of patch) {
        applyOp(holder, op);
    }
}

/**
 * @param {object} holder
 * @param {object[]} patch
 * @returns {object[]}
 */
function undo(holder, patch) {
    const reversedPatch = [];
    console.log(JSON.stringify(patch))
    for (let op of patch) {
        reversedPatch.unshift(reverseOp(op))
    }
    redo(holder, reversedPatch);
    return reversedPatch
}

/**
 * @param {GridChen.GridSchema} schema
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
        schema;
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return rows;
        }

        removeModel() {
            rows = undefined;
            return [{op: 'remove', path: ''}];
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
         * @param {GridChen.Interval} rowsRange
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
            const oldValue = rows[rowIndex];
            rows.splice(rowIndex, 1);
            return [{op: 'remove', path: `/${rowIndex}`, oldValue}];
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
            let patch = [];

            if (value == null) {
                if (!rows[rowIndex]) {
                    return patch
                }
                const oldValue = rows[rowIndex][colIndex];
                delete rows[rowIndex][colIndex];
                patch.push({op: 'replace', path: `/${rowIndex}/${colIndex}`, value: undefined, oldValue });
                return patch
            }

            if (!rows) {
                rows = createArray(1 + rowIndex);
                patch.push({op: 'add', path: '', value: createArray(1 + rowIndex)});
            }

            patch.push(...padArray(rows, 1 + rowIndex, '/-'));

            if (!rows[rowIndex]) {
                rows[rowIndex] = createArray(1+colIndex);
                patch.push({op: 'replace', path: `/${rowIndex}`, value: createArray(1+colIndex)});
            } else if (rows[rowIndex].length < schemas.length) {
                patch.push(...padArray(rows[rowIndex], schemas.length, `/${rowIndex}/-`));
            }

            const oldValue = rows[rowIndex][colIndex];
            if (value === oldValue) {
                // TODO: assert that patch is empty?
                return patch
            }
            patch.push({op: 'replace', path: `/${rowIndex}/${colIndex}`, value: value, oldValue: oldValue});

            rows[rowIndex][colIndex] = value;
            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            rows.splice(rowIndex, 0, undefined);
            return [{op: 'add', path: `/${rowIndex}`, value: undefined}];
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => compare(row1[colIndex], row2[colIndex]) * sortDirection);
        }

        undo(patch) {
            const holder = {data:rows};
            const reversePatch = undo(holder, patch);
            rows = holder.data;
            return reversePatch;
        }

        redo(patch) {
            const holder = {data:rows};
            redo(holder, patch);
            rows = holder.data;
        }
    }

    return new RowMatrixView();
}

/**
 * @param {GridChen.GridSchema} schema
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
        schema;
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return rows;
        }

        /**
         * @returns {object[]}
         */
        removeModel() {
            rows = undefined;
            return [{op: 'remove', path: ''}];
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows ? rows.length : 0
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
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
            let patch = [];

            if (!rows) {
                rows = createArray(1 + rowIndex);
                patch.push({op: 'add', path: '', value: createArray(1 + rowIndex)});
            }

            patch.push(...padArray(rows, 1 + rowIndex, '/-'));

            if (!rows[rowIndex]) {
                rows[rowIndex] = {};
                // TODO: Make this an add and previous padArray(rows, rowIndex, '/-')
                patch.push({op: 'replace', path: `/${rowIndex}`, value: {}});
            }

            const key = ids[colIndex];
            const oldValue = rows[rowIndex][key];
            if (value == null && oldValue == null) {
                // No Op
            } else if (value == null) {
                patch.push({op: 'remove', path: `/${rowIndex}/${key}`, oldValue});
                delete rows[rowIndex][key];
            } else if (oldValue == null) {
                patch.push({op: 'add', path: `/${rowIndex}/${key}`, value});
                rows[rowIndex][key] = value;
            } else {
                patch.push({op: 'replace', path: `/${rowIndex}/${key}`, value: value, oldValue: oldValue});
                rows[rowIndex][key] = value;
            }

            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            rows.splice(rowIndex, 0, undefined);
            return [{op: 'add', path: `/${rowIndex}`, value: undefined}];
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => compare(row1[ids[colIndex]], row2[ids[colIndex]]) * sortDirection);
        }

        undo(patch) {
            const holder = {data: rows};
            const reversePatch = undo(holder, patch);
            rows = holder.data;
            return reversePatch;
        }
    }

    return new RowObjectsView();
}

/**
 * @param {GridChen.GridSchema} schema
 * @param {Array<object>} columns
 */
export function createColumnMatrixView(schema, columns) {
    let schemas = schema.columnSchemas;
    updateSchema(schemas);

    function getRowCount() {
        if (!columns) return 0;
        return columns.reduce((length, column) => Math.max(length, column?column.length:0), 0);
    }

    /**
     * @extends {GridChen.MatrixView}
     */
    class ColumnMatrixView extends MatrixView {
        schema;
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return columns;
        }

        /**
         * @returns {object[]}
         */
        removeModel() {
            columns = undefined;
            return [{op: 'remove', path: ''}];
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            const patch = [];
            columns.forEach(function (column, colIndex) {
                if (column) {
                    column.splice(rowIndex, 1);
                    patch.push({op: 'remove', path: `/${colIndex}/${rowIndex}`})
                }
            });
            return patch;
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
            let patch = [];
            if (!columns) {
                columns = createArray(schemas.length);
                patch.push({op: 'add', path: '', value: createArray(schemas.length)});
            }

            let column = columns[colIndex];
            if (!column) {
                column = columns[colIndex] = [];
                patch.push({op: 'replace', path: `/${colIndex}`, value: []});
            }

            if (rowIndex >= column.length) {
                patch.push(...padArray(column, rowIndex+1, `/${colIndex}/-`));
            }

            const oldValue = columns[colIndex][rowIndex];
            // Must not use remove operation here!
            columns[colIndex][rowIndex] = value;
            patch.push({op: 'replace', path: `/${colIndex}/${rowIndex}`, value: value, oldValue});

            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            let patch = [];
            columns.forEach(function (column, colIndex) {
                if (column) {
                    column.splice(rowIndex, 0, undefined);
                    patch.push({op: 'add', path: `/${colIndex}/${rowIndex}`, value: undefined});
                }
            });
            return patch;
        }

        /**
         * @param {number} colIndex
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
        }

        undo(patch) {
            const holder = {data: columns};
            const reversePatch = undo(holder, patch);
            columns = holder.data;
            return reversePatch;
        }
    }

    return new ColumnMatrixView();
}

/**
 * @param {GridChen.GridSchema} schema
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
        schema;
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return columns;
        }

        /**
         * @returns {object[]}
         */
        removeModel() {
            columns = undefined;
            return [{op: 'remove', path: ''}];
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        deleteRow(rowIndex) {
            const patch = [];
            Object.keys(columns).forEach(function (key) {
                // TODO: Handle column == null
                const column = columns[key];
                column.splice(rowIndex, 1);
                patch.push({op: 'remove', path: `/${key}/${rowIndex}`})
            });
            return patch;
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
            let patch = [];
            const key = ids[colIndex];

            if (!columns) {
                const createEmptyObject = function() {
                    const o = {};
                    o[key] = [];
                    return o;
                };
                columns = createEmptyObject();
                patch.push({op: 'add', path: '', value: createEmptyObject()});
            }

            let column = columns[key];
            if (!column) {
                column = columns[key] = [];
                patch.push({op: 'add', path: `/${key}`, value: []});
            }

            if (rowIndex >= column.length) {
                patch.push(...padArray(column, rowIndex+1, `/${key}/-`));
            }

            const oldValue = column[rowIndex];
            column[rowIndex] = value;
            // Must not use remove operation here!
            patch.push({op: 'replace', path: `/${key}/${rowIndex}`, value: value, oldValue});

            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            let patch = [];
            // TODO: Object.values and sort index?
            ids.forEach(function (key) {
                const column = columns[key];
                if (!column) return
                column.splice(rowIndex, 0, undefined);
                patch.push({op: 'add', path: `/${key}/${rowIndex}`, value: undefined});
            });
            return patch;
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            const key = ids[colIndex];
            let [, sortDirection] = updateSortDirection(schemas, colIndex);
            const indexes = columns[key].map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => compare(a[0], b[0]) * sortDirection);

            ids.forEach(function (key) {
                const sortedColumn = Array();
                const column = columns[key];
                if (!column) return;
                indexes.forEach(function (index, i) {
                    sortedColumn[i] = column[index[1]];
                });
                columns[key] = sortedColumn;
            });
        }

        undo(patch) {
            const holder = {data: columns};
            const reversePatch = undo(holder, patch);
            columns = holder.data;
            return reversePatch;
        }
    }

    return new ColumnObjectView();
}

/**
 * @param {GridChen.GridSchema} schema
 * @param {Array<*>} column
 */
export function createColumnVectorView(schema, column) {
    let columnSchema = schema.columnSchemas[0];
    updateSchema(schema.columnSchemas);

    function getRowCount() {
        if (!column) return 0;
        return column.length
    }

    /**
     * @extends {GridChen.MatrixView}
     */
    class ColumnVectorView extends MatrixView {
        schema;
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return column;
        }

        /**
         * @returns {object[]}
         */
        removeModel() {
            column = undefined;
            return [{op: 'remove', path: ''}];
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
            if (colIndex !== 0) {
                throw new RangeError();
            }
            let patch = [];

            if (!column) {
                column = createArray(1 + rowIndex);
                patch.push({op: 'add', path: '', value: createArray(1 + rowIndex)});
            } else if (rowIndex >= column.length) {
                patch.push(...padArray(column, rowIndex+1, `/-`));
            }

            const oldValue = column[rowIndex];
            if (value == null) {
                delete column[rowIndex];
                patch.push({op: 'replace', path: `/${rowIndex}`, value: undefined, oldValue});
                return patch
            }

            patch.push({op: 'replace', path: `/${rowIndex}`, value: value, oldValue});

            column[rowIndex] = value;
            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {object[]}
         */
        splice(rowIndex) {
            column.splice(rowIndex, 0, undefined);
            return [{op: 'add', path: `/${rowIndex}`, value: undefined}]
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            console.assert(colIndex === 0);
            let [, sortDirection] = updateSortDirection([columnSchema], 0);
            column.sort((a, b) => compare(a, b) * sortDirection);
        }

        undo(patch) {
            const holder = {data: column};
            const reversePatch = undo(holder, patch);
            column = holder.data;
            return reversePatch;
        }
    }

    return new ColumnVectorView();
}
