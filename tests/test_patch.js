import {test, assert} from './utils.js'
import {applyJSONPatch} from "../grid-chen/utils.js";

function apply(o, op) {
    return applyJSONPatch(o, [op])
}

test('replace', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"]];
    const patched = apply(o, {"op": "replace", "path": "/2/1", "value": 1});
    assert.equal([["a", null, "b"], null, ["c", 1, "d"]], patched);
});

test('add', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"]];
    const patched = apply(o, {"op": "add", "path": "/2/1", "value": 1});
    assert.equal([["a", null, "b"], null, ["c", 1, null, "d"]], patched);
});

test('add as append', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"]];
    const patched = apply(o, {"op": "add", "path": "/2/3", "value": 1});
    assert.equal([["a", null, "b"], null, ["c", null, "d", 1]], patched);
});

test('add as append', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"]];
    const patched = apply(o, {"op": "add", "path": "/3", "value": 1});
    assert.equal([["a", null, "b"], null, ["c", null, "d"], 1], patched);
});

test('replace', () => {
    const o = [{c1: 1}, {c1: 2}];
    const patched = apply(o, {"op": "replace", "path": "/1/c1", "value": 3});
    assert.equal([{c1: 1}, {c1: 3}], patched);
});

test('replace', () => {
    const o = [{c1: 1}, {c1: 2}];
    const patched = apply(o, {"op": "replace", "path": "/1/c2", "value": 3});
    assert.equal([{c1: 1}, {c1: 2, c2: 3}], patched);
});

test('replace', () => {
    const o = {c1: 1};
    const patched = apply(o, {"op": "replace", "path": "/c2", "value": 3});
    assert.equal({c1: 1, c2: 3}, patched);
});

test('add', () => {
    const o = undefined;
    const patched = apply(o, {"op": "add", "path": "", "value": 3});
    assert.equal(3, patched);
});

test('remove', () => {
    const o = [{c1: 1}, {c1: 2}];
    const patched = apply(o, {"op": "remove", "path": "/1/c1"});
    assert.equal([{c1: 1}, {}], patched);
});

test('remove', () => {
    const o = [{c1: 1}, {c1: 2}];
    const patched = apply(o, {"op": "remove", "path": "/1"});
    assert.equal([{c1: 1}], patched);
});

test('replace', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"], ["x"]];
    const patched = apply(o, {"op": "replace", "path": "/3/0", "value": null});
    assert.equal([["a", null, "b"], null, ["c", null, "d"], [null]], patched);
});

test('remove', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"], ["x"]];
    const patched = apply(o, {"op": "remove", "path": "/3/0"});
    assert.equal([["a", null, "b"], null, ["c", null, "d"], []], patched);
});

test('remove', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"]];
    const patched = apply(o, {"op": "remove", "path": "/2/1"});
    assert.equal([["a", null, "b"], null, ["c", "d"]], patched);
});

test('remove', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"], ["x"]];
    const patched = apply(o, {"op": "remove", "path": "/3"});
    assert.equal([["a", null, "b"], null, ["c", null, "d"]], patched);
});

test('remove', () => {
    const o = [["a", null, "b"], null, ["c", null, "d"], ["x"]];
    const patched = apply(o, {"op": "remove", "path": ""});
    assert.equal(undefined, patched);
});








