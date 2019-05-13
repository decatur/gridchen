
/**
 * @param {Bantam.ISchema[]} schemas
 * @param {Rectangle} selection
 * @param data
 * @param {string} sep
 * @returns {string}
 */
function toXSV(schemas, selection, data, sep) {
    let tsvRows = Array(selection.row.sup - selection.row.min);
    for (let i = 0, rowIndex = selection.row.min; rowIndex < selection.row.sup; i++, rowIndex++) {
        tsvRows[i] = Array(selection.col.sup - selection.col.min);
        let row = data[rowIndex];
        if (row === undefined) row = Array();

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
 * @param {Bantam.ISchema[]} schemas
 * @param {Array<object>} data
  */
export function createSimpleControler(schemas, data) {
    let params;
    let sortInfo = {colIndex: undefined, direction: undefined};

    let dataSource = {
        // Gets called exactly once before viewPort is used.
        // Passes methods to be used to tell viewPort of data loads / changes.
        init: function (_params) {
            params = _params;
            params.setRowCount(data.length);
        },
        // Tell the viewport what the scroll position of the grid is, so it knows what rows it has to get
        setViewportRange: function (firstRow, lastRow) {
            // console.log('setViewportRange', firstRow, firstRow)
            let rowData = {};
            for (let i = firstRow; i < Math.min(lastRow, data.length); i++) {
                rowData[i] = data[i];
            }
            params.setRowData(rowData)
        },
        toClipboard: function (selection) {
            return toXSV(schemas, selection, data, '\t');

        },
        // Gets called once when viewPort is no longer used. If you need to do any cleanup, do it here.
        destroy: function () {
        }
    };

    let viewModel = {
        onRowDelete: function (rowIndex) {
            data.splice(rowIndex, 1);
            params.setRowCount(data.length)
        },
        onCellChange: function (rowIndex, colIndex, value) {
            if (data[rowIndex] === undefined) {
                data[rowIndex] = Array(schemas.length);
            }
            data[rowIndex][colIndex] = value;
            params.setRowCount(data.length);
        },
        onRowInsert: function (rowIndex) {
            data.splice(rowIndex + 1, 0, Array(schemas.length));
            params.setRowCount(data.length)
        },
        onClear: function () {
            data.length = 0;
            params.setRowCount(data.length)
        },
        onPaste: function (topRowIndex, topColIndex, matrix) {
            if (!matrix[0].length) {
                alert('You have nothing to paste')
            }

            let rowIndex = topRowIndex;
            let endRowIndex = rowIndex + matrix.length;

            for (let i = 0; rowIndex < endRowIndex; i++, rowIndex++) {
                let row = data[rowIndex];
                if (row === undefined) row = data[rowIndex] = Array();
                let colIndex = topColIndex;
                let endColIndex = colIndex + matrix[0].length;
                for (let j = 0; colIndex < endColIndex; colIndex++, j++) {
                    let value = matrix[i][j];
                    if (value !== undefined) value = schemas[colIndex].converter.fromString(value);
                    row[colIndex] = value;
                }
            }

            params.setRowCount(data.length);
        },
        onSort: function (colIndex) {
            if (sortInfo.colIndex !== colIndex) sortInfo = {colIndex, direction:1};
            const direction = sortInfo.direction;
            data.sort((a, b) => a[colIndex]<=b[colIndex]?-1*direction:1*direction);
            sortInfo = {colIndex, direction: -direction};
            params.setRowCount(data.length)
        },
    };

    return { viewModel, dataSource }
}
