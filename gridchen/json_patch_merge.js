
/**
 * Dispense all redundant operation values.
 *
 * @param {GridChenNS.JSONPatchOperation[]} patch
 * @returns {GridChenNS.JSONPatchOperation[]}
 */
export function dispense(patch) {
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
        let parent = undefined;
        let key = undefined;

        while (path.length > 0) {
            key = path[0];
            if (!o.children) {
                if (Number.isInteger(key)) {
                    o.children = [];
                    o.splices = [];
                } else {
                    o.children = {};
                }
            }

            if (!Number.isInteger(key) && o.children[key] === undefined) {
                o.children[key] = {};
            }

            parent = o;
            o = o.children[key];
            path.shift();
        }

        function lastElement(a) {
            if (a.length) return a[a.length-1];
            return {}
        }

        if (Number.isInteger(key)) {
            let last = lastElement(parent.splices);
            if (op.op === 'add') {
                if (last.index === key && last.op === 'remove') {
                    parent.splices.pop()
                } else
                    parent.splices.push({index: key, op:'add'});
                parent.children.length = Math.max(parent.children.length, key+1)
                parent.children.splice(key, 0, op.value);
            } else if (op.op === 'remove') {
                if (last.index === key && last.op === 'add') {
                    parent.splices.pop()
                } else
                    parent.splices.push({index: key, op:'remove'});
                parent.children.splice(key, 1);
            }

            return
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
            delete o.splices;
        }
    }

    const mergedPatch = [];

    function serialize(o, path) {
        if (o.splices) {
            for (const splice of o.splices) {
                if (splice.op === 'add') {
                    mergedPatch.push({op: splice.op, path: path + '/' + splice.index, value: null});
                } else {
                    console.assert(splice.op === 'remove');
                    mergedPatch.push({op: splice.op, path: path + '/' + splice.index});
                }
                //prev = splice;
            }
            for (const index in o.children) {
                mergedPatch.push({op: 'replace', path: path + '/' + index, value: o.children[index]});
            }
            return
        }

        if (o.op === 'add' || o.op === 'replace') {
            mergedPatch.push({op: o.op, path: path, value: o.value});
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
