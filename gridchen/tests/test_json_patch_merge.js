import {test, assert} from '../testing/utils.js'
import {dispense} from "../json_patch_merge.js";


test('replace A + replace B -> replace B', () => {
    const patch = [
        {"op": "replace", "path": "/a/b", "value": "A"},
        {"op": "replace", "path": "/a/b", "value": "B"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([{"op": "replace", "path": "/a/b", "value": "B"}], mergedPatch);
});

test('replace A + remove -> remove', () => {
    const patch = [
        {"op": "replace", "path": "/a/b", "value": "A"},
        {"op": "remove", "path": "/a/b"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([{"op": "remove", "path": "/a/b"}], mergedPatch);
});

test('add A + replace B -> add B', () => {
    let patch = [
        {"op": "add", "path": "/a/b", "value": "A"},
        {"op": "replace", "path": "/a/b", "value": "B"}
    ];
    let mergedPatch = dispense(patch);
    assert.equal([{"op": "add", "path": "/a/b", "value": "B"}], mergedPatch);

    patch = [
        {"op": "add", "path": "/a/b", "value": "A"},
        {"op": "replace", "path": "/a", "value": "B"}
    ];
    mergedPatch = dispense(patch);
    assert.equal([{"op": "replace", "path": "/a", "value": "B"}], mergedPatch);
});

test('add A + remove -> NoOp', () => {
    const patch = [
        {"op": "add", "path": "/a/b", "value": "A"},
        {"op": "remove", "path": "/a/b"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([], mergedPatch);
});

test('(indexed) replace A + replace B -> replace B', () => {
    const patch = [
        {"op": "replace", "path": "/a/1", "value": "A"},
        {"op": "replace", "path": "/a/1", "value": "B"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([{"op": "replace", "path": "/a/1", "value": "B"}], mergedPatch);
});

test('(indexed) replace A + remove -> remove', () => {
    let patch = [
        {"op": "replace", "path": "/a/1", "value": "A"},
        {"op": "remove", "path": "/a/1"}
    ];
    let mergedPatch = dispense(patch);
    assert.equal([{"op": "remove", "path": "/a/1"}], mergedPatch);

    patch = [
        {"op": "replace", "path": "/a/1", "value": "A"},
        {"op": "add", "path": "/a/2", "value": "B"},
        {"op": "remove", "path": "/a/1"}
    ];
    mergedPatch = dispense(patch);
    assert.equal([
        {"op": "add", "path": "/a/2", "value": null},
        {"op": "remove", "path": "/a/1"},
        {"op": "replace", "path": "/a/1", "value": "B"}], mergedPatch);
});

test('(indexed) add A + replace B -> add B', () => {
    const patch = [
        {"op": "add", "path": "/a/1", "value": "A"},
        {"op": "replace", "path": "/a/1", "value": "B"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([
        {"op": "add", "path": "/a/1", "value": null},
        {"op": "replace", "path": "/a/1", "value": "B"}
    ], mergedPatch);
});

test('(indexed) add A + remove -> NoOp', () => {
    const patch = [
        {"op": "add", "path": "/a/1", "value": "A"},
        {"op": "remove", "path": "/a/1"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([], mergedPatch);
});

test('(indexed) add A + remove -> NoOp', () => {
    const patch = [
        {"op": "add", "path": "/a/1", "value": 1},
        {"op": "add", "path": "/a/1", "value": 2},
        {"op": "remove", "path": "/a/2"}
    ];
    const mergedPatch = dispense(patch);
    const expected = [
        {"op": "add", "path": "/a/1", "value": null},
        {"op": "add", "path": "/a/1", "value": null},
        {"op": "remove", "path": "/a/2"}, {"op": "replace", "path": "/a/1", "value": 2}];
    assert.equal(expected, mergedPatch);
});


test('prefix', () => {
    const patch = [
        {"op": "add", "path": "/a/1", "value": 1},
        {"op": "remove", "path": "/a"}
    ];
    const mergedPatch = dispense(patch);
    assert.equal([{"op": "remove", "path": "/a"}], mergedPatch);
});

test('foo', () => {
    const patch = [
        {"op": "add", "path": "/a", "value": []},
        {"op": "add", "path": "/a/0", "value": 13}
    ];
    const mergedPatch = dispense(patch);
    const expected = [
        {"op": "add", "path": "/a", "value": []},
        {"op": "add", "path": "/a/0", "value": null},
        {"op": "replace", "path": "/a/0", "value": 13}];
    assert.equal(expected, mergedPatch);
});

test('foo2', () => {
    const patch = [
        {"op": "add", "path": "/a", "value": []},
        {"op": "add", "path": "/a/0", "value": 13},
        {"op": "add", "path": "/a/0/b", "value": 14}
    ];
    const mergedPatch = dispense(patch);
    const expected = [
        {"op": "add", "path": "/a", "value": []},
        {"op": "add", "path": "/a/0", "value": null},
        {"op": "replace", "path": "/a/0", "value": 13}, {op: "add", path: "/a/0/b", value: 14}];
    assert.equal(expected, mergedPatch);
});

test('foo3', () => {
    const patch = [
        {"op": "replace", "path": "/a/0/b", "value": 14}
    ];
    const mergedPatch = dispense(patch);
    const expected = [{"op": "replace", "path": "/a/0/b", "value": 14}];
    assert.equal(expected, mergedPatch);
});

test('foo4', () => {
    const patch = [
        {"op": "add", "path": "/a/0", "value": []},
        {"op": "replace", "path": "/a/0/b", "value": 14}
    ];
    const mergedPatch = dispense(patch);
    const expected = [
        {"op": "add", "path": "/a/0", "value": null},
        {"op": "replace", "path": "/a/0", "value": []},
        {"op": "replace", "path": "/a/0/b", "value": 14}];
    assert.equal(expected, mergedPatch);
});
