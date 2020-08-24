import {test, assert} from '../testing/utils.js'
import {mergePatch} from "../json_patch_merge.js";


test('normalize1', () => {
    const patch = [
        {"op": "add", "path": "/a/1", "value": 1},
        {"op": "add", "path": "/a/1", "value": 2},
        {"op": "remove", "path": "/a/2"}
    ];
    const mergedPatch = mergePatch(patch);
    assert.equal([{"op": "add", "path": ["", "a", 1], "value": 2}], mergedPatch);
});

test('normalize2', () => {
    const patch = [
        {"op": "add", "path": "/a", "value": 1},
        {"op": "add", "path": "/b", "value": 2},
        {"op": "remove", "path": "/a"}
    ];
    const mergedPatch = mergePatch(patch);
    assert.equal([{"op": "add", "path": ["", "b"], "value": 2}], mergedPatch);
});

test('normalize3', () => {
    const patch = [
        {"op": "add", "path": "/a", "value": 1},
        {"op": "replace", "path": "/a", "value": 2}
    ];
    const mergedPatch = mergePatch(patch);
    assert.equal([{"op": "add", "path": ["", "a"], "value": 2}], mergedPatch);
});

test('normalize4', () => {
    const patch = [
        {"op": "add", "path": "/a/1", "value": 1},
        {"op": "remove", "path": "/a"}
    ];
    const mergedPatch = mergePatch(patch);
    assert.equal(0, mergedPatch.length);
});
