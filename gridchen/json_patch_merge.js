/**
 * Merges all operations with spurious, intermittened values.
 * With two adjacent operations other + op with op.path is prefix of other.path
 * 1) replace A + replace B -> replace B
 * 2) replace A + remove -> remove
 * 3) add A + replace B -> add B
 * 4) add A + remove -> NoOp
 *
 * @param {GridChenNS.JSONPatchOperation[]} patch
 * @returns {GridChenNS.JSONPatchOperation[]}
 */
export function mergePatch(patch) {
    const normalizedPatch = [];
    for (const op of patch) {
        if (op.op === 'replace') {
            normalizedPatch.push({op: 'remove', path: op.path});
            normalizedPatch.push({op: 'add', path: op.path, value: op.value});
        } else {
            normalizedPatch.push(op);
        }
    }
    const root = {children: null, op: null};

    /**
     * @param {GridChenNS.JSONPatchOperation} op
     */
    function mergeOperation(op) {
        const path = op.path.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
        path.shift();
        let o = root;

        while (path.length > 0) {
            if (!o.children) {
                if (Number.isInteger(path[0])) {
                    o.children = [];
                } else {
                    o.children = {};
                }
            }
            if (o.children[path[0]] === undefined) {
                o.children[path[0]] = {};
            }
            o = o.children[path[0]];
            path.shift();
        }

        if (op.op === 'add') {
            if (o.op === 'remove') {
                o.op = 'replace';
            } else {
                console.assert(o.op === undefined);
                o.op = 'add';
            }
            o.value = op.value;
        } else if (op.op === 'remove') {
            if (o.op === 'add') {
                delete o.op;
            } else {
                console.assert(o.op === undefined);
                o.op = 'remove';
            }
            delete o.value;
            delete o.children;
        }
    }

    const mergedPatch = [];

    function serialize(o, path) {
        if (o.op === 'add' || o.op === 'replace') {
            mergedPatch.push({op: o.op, path: path, value: o.value});
            // serialize(o.children[key], path + '/' + key);
        } else if (o.op === 'remove') {
            mergedPatch.push({op: o.op, path: path});
        }

        for (const key in o.children) {
            serialize(o.children[key], path + '/' + key);
        }
    }

    for (let op of normalizedPatch) {
        mergeOperation(Object.assign({}, op));
    }

    serialize(root, '');
    return mergedPatch
}

/**
 * Merges all operations with spurious, intermittened values.
 * With two adjacent operations other + op with op.path is prefix of other.path
 * 1) replace A + replace B -> replace B
 * 2) replace A + remove -> remove
 * 3) add A + replace B -> add B
 * 4) add A + remove -> NoOp
 *
 * @param {GridChenNS.JSONPatchOperation[]} patch
 * @returns {GridChenNS.JSONPatchOperation[]}
 */
export function mergePatch1(patch) {
    const normalizedPatch = [];
    for (const op of patch) {
        if (op.op === 'replace') {
            normalizedPatch.push({op: 'remove', path: op.path});
            normalizedPatch.push({op: 'add', path: op.path, value: op.value});
        } else {
            normalizedPatch.push(op);
        }
    }
    const mergedPatch = [];

    /**
     * Returns true if path starts with prefix
     * @param {(string|int)[]} path
     * @param {(string|int)[]} prefix
     * @returns {boolean}
     */
    function isPrefix(path, prefix) {
        if (prefix.length > path.length) return false;
        for (const [index, key] of prefix.entries()) {
            if (path[index] !== key) return false;
        }
        return true
    }

    /**
     * @param {GridChenNS.JSONPatchOperation} op
     */
    function mergeOperation(op) {
        op.path = op.path.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
        let removeOps = [];
        let addOp = op;

        for (let other of mergedPatch) {
            if (op.op === 'add') {
                for (const [index, key] of op.path.entries()) {
                    if (index > other.path.length) break;
                    const otherKey = other.path[index];
                    if (Number.isInteger(key) && Number.isInteger(otherKey) && key <= otherKey) {
                        other.path[index]++;
                    } else if (key !== otherKey) {
                        break;
                    }
                }
            } else if (op.op === 'remove') {
                if (isPrefix(other.path, op.path)) {
                    if (other.op === 'replace') {
                        console.assert(false)
                        // 2) replace A + remove -> remove
                        other.op = op.op;
                        other.path = op.path;
                        delete other.value;
                        addOp = undefined;
                    } else if (other.op === 'add') {
                        // 4) add A + remove -> NoOp or remove
                        addOp = undefined;
                        if (other.path.length > op.path.length) {
                            other.op = op.op;
                            other.path = op.path;
                            delete other.value;
                        } else {
                            removeOps.push(other);
                        }
                    }
                } else {
                    for (const [index, key] of op.path.entries()) {
                        if (index > other.path.length) break;
                        const otherKey = other.path[index];
                        if (Number.isInteger(key) && Number.isInteger(otherKey) && key <= otherKey) {
                            other.path[index]--;
                        } else if (key !== otherKey) {
                            break;
                        }
                    }
                }
            } else if (op.op === 'replace') {
                console.assert(false)
                if (other.op === 'add' && isPrefix(other.path, op.path)) {
                    // Case 3) add A + replace B -> add B
                    other.value = op.value;
                    if (other.path.length > op.path.length) {
                        other.op = 'replace';
                        other.path = op.path;
                    }
                    addOp = undefined;
                } else if (other.op === 'replace' && op.path.join('/') === other.path.join('/')) {
                    // Case 1) replace A + replace B -> replace B
                    other.value = op.value;
                    addOp = undefined;
                }
            } else {
                throw Error('JSON Patch operation not supported: ' + op.op);
            }
        }

        for (const removeOp of removeOps) {
            const index = mergedPatch.indexOf(removeOp);
            console.assert(index !== -1)
            mergedPatch.splice(index, 1);
        }

        if (addOp) {
            mergedPatch.push(addOp);
        }
    }

    for (let op of normalizedPatch) {
        mergeOperation(Object.assign({}, op));
    }

    mergedPatch.forEach(op => op.path = op.path.join('/'))
    return mergedPatch
}