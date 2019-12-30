import {test, assert} from './grid-chen/utils.js'
import {IndexToPixelMapper} from "../grid-chen/selection.js";

test('cellIndexToPixelCoords', async function () {
    const mapper = new IndexToPixelMapper(new DOMRect(0, 0, NaN, NaN), 10, [10, 30, 60, 70, 90, 100]);
    assert.equal({clientY: 10/2, clientX: 10/2}, mapper.cellIndexToPixelCoords(0, 0));
    assert.equal({clientY: 10+10/2, clientX: 10+20+30/2}, mapper.cellIndexToPixelCoords(1, 2));
});

test('pixelCoordsToCellIndex', async function () {
    const mapper = new IndexToPixelMapper(new DOMRect(0, 0, NaN, NaN), 10, [10, 30, 60, 70, 90, 100]);
    assert.equal({columnIndex: 0, rowIndex: 0}, mapper.pixelCoordsToCellIndex(10/2, 10/2));
    assert.equal({columnIndex: 2, rowIndex: 1}, mapper.pixelCoordsToCellIndex(59, 15));
    assert.equal({columnIndex: 3, rowIndex: 1}, mapper.pixelCoordsToCellIndex(60, 15));
    assert.equal({columnIndex: 2, rowIndex: 1}, mapper.pixelCoordsToCellIndex(59, 15));
    assert.equal({columnIndex: 0, rowIndex: 1}, mapper.pixelCoordsToCellIndex(9, 15));
    assert.equal({columnIndex: 5, rowIndex: 1}, mapper.pixelCoordsToCellIndex(99, 15));
});
