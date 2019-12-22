import {test, assert} from './grid-chen/utils.js'
import {Range} from "../grid-chen/selection.js";

test('self intersection', async function () {
    const r1 = new Range(0, 0, 1, 1);
    const r2 = new Range(0, 0, 1, 1);
    const intersection = r1.intersect(r2);
    assert.equal(r1.toString(), intersection.toString());
    assert.equal(true, r1.intersects(r2));
});

test('empty intersection', async function () {
    const r1 = new Range(0, 0, 1, 1);
    const r2 = new Range(1, 1, 1, 1);
    const intersection = r1.intersect(r2);
    assert.equal(undefined, intersection);
    assert.equal(false, r1.intersects(r2));
});

test('non-empty intersection', async function () {
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(1, 1, 1, 1);
    const intersection = r1.intersect(r2);
    assert.equal(r2.toString(), intersection.toString());
});

/**
 *
 * @param {Range} r1
 */
function subtractUnitHole(r1) {
    // r1  - r2
    // ###   ...   ###   ltr
    // ### - .#. = #.# = l.r = [l, t, b, r]
    // ###   ...   ###   lbr
    const y = r1.rowIndex;
    const x = r1.columnIndex;
    const r2 = new Range(y + 1, x + 1, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(y, x , 3, 1);
    const t = new Range(y , x + 1, 1, 1);
    const b = new Range(y + 2, x + 1, 1, 1);
    const r = new Range(y , x + 2, 3, 1);
    assert.equal([l, t, b, r], parts);
}

test('subtract hole in the middle of 3x3 at (0,0)', async function () {
    subtractUnitHole(new Range(0, 0, 3, 3));
});

test('subtract hole in the middle of 3x3 with offset (1,1)', async function () {
    subtractUnitHole(new Range(1, 1, 3, 3));
});

test('subtract north-west', async function () {
    // r1  - r2
    // ###   #..   .##   .rr
    // ### - ... = ### = lrr = [l, r]
    // ###   ...   ###   lrr
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(0, 0, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(1, 0, 2, 1);
    const r = new Range(0, 1, 3, 2);
    assert.equal([l, r], parts);
});

test('substract north-east', async function () {
    // r1  - r2
    // ###   ..#   ##.   ll.
    // ### - ... = ### = llr = [l, r]
    // ###   ...   ###   llr
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(0, 2, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(0, 0, 3, 2);
    const r = new Range(1, 2, 2, 1);
    assert.equal([l, r], parts);
});

test('substract south-west', async function () {
    // r1  - r2
    // ### = ...   ###   lrr
    // ### = ... = ### = lrr = [l, r]
    // ###   #..   .##   .rr
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(2, 0, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(0, 0, 2, 1);
    const r = new Range(0, 1, 3, 2);
    assert.equal([l, r], parts);
});

test('substract south-east', async function () {
    // r1  - r2
    // ###   ...   ###   llr
    // ### - ... = ### = llr = [l, r]
    // ###   ..#   ##.   ll.
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(2, 2, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(0, 0, 3, 2);
    const r = new Range(0, 2, 2, 1);
    assert.equal([l, r], parts);
});

test('substract north', async function () {
    // r1  - r2
    // ###   .#.   #.#   l.r
    // ### - ... = ### = lbr = [l, b, r]
    // ###   ...   ###   lbr
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(0, 1, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(0, 0, 3, 1);
    const b = new Range(1, 1, 2, 1);
    const r = new Range(0, 2, 3, 1);
    assert.equal([l, b, r], parts);
});

test('substract east', async function () {
    // r1  - r2
    // ###   ...   ###   llt
    // ### - ..# = ##. = ll. = [l, t, b]
    // ###   ...   ###   llb
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(1, 2, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(0, 0, 3, 2);
    const t = new Range(0, 2, 1, 1);
    const b = new Range(2, 2, 1, 1);
    assert.equal([l, t, b], parts);
});

test('substract south', async function () {
    // r1  - r2
    // ###   ...   ###   ltr
    // ### - ... = ### = ltr = [l, t, r]
    // ###   .#.   #.#   l.r
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(2, 1, 1, 1);
    const parts = r1.subtract(r2);
    const l = new Range(0, 0, 3, 1);
    const t = new Range(0, 1, 2, 1);
    const r = new Range(0, 2, 3, 1);
    assert.equal([l, t, r], parts);
});

test('substract west', async function () {
    // r1  - r2
    // ###   ...   ###   trr
    // ### - #.. = .## = .rr = [t, b ,r]
    // ###   ...   ###   brr
    const r1 = new Range(0, 0, 3, 3);
    const r2 = new Range(1, 0, 1, 1);
    const parts = r1.subtract(r2);
    const t = new Range(0, 0, 1, 1);
    const b = new Range(2, 0, 1, 1);
    const r = new Range(0, 1, 3, 2);
    assert.equal([t, b, r], parts);
});



