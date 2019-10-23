import {test, assert} from './grid-chen/utils.js'
import {ProxyNode, initPath, clearPath} from "../grid-chen/utils.js";

test('parents', () => {
    const node1 = new ProxyNode('',
        {
            type: 'object'
        }, null);

    const node2 = new ProxyNode('foo',
        {
            type: 'object'
        }, node1);

    const node3 = new ProxyNode('bar',
        {
            type: 'string'
        }, node2);

    let patch = node3.createParents();
    node3.parent.obj[node3.key] = 'foobar';

    assert.equal({foo: {bar: 'foobar'}}, node1.obj);
    assert.equal({bar: 'foobar'}, node2.obj);

    assert.equal(
        [{"op": "add", "path": "", "value": {}},
            {"op": "add", "path": "/foo", "value": {}}], patch.operations);

    delete node3.parent.obj[node3.key];
    patch = node3.removeParents();
    assert.equal(undefined, node1.obj);
    assert.equal(undefined, node2.obj);
    assert.equal(undefined, node3.getValue());

    console.log(JSON.stringify(patch));

    assert.equal(
        [{"op": "remove", "path": "/foo", oldValue: {}},
            {"op": "remove", "path": "", oldValue: {}}], patch.operations);

});

const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'object'
            }
        }
    };

test('initPath', () => {
    const holder = {};
    initPath(holder, {type: 'object', properties: {"": schema}}, '/foo/bar');
    assert.equal({foo: {}}, holder['']);
});

test('removePath', () => {
    const holder = {'':{foo: {}}};
    clearPath(holder, {type: 'object', properties: {"": schema}}, '/foo/bar');
    assert.equal(undefined, holder['']);
});