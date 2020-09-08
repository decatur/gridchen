
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

    /** @type {GridChenNS.PatchNode} */
    const root = /** @type{GridChenNS.PatchNode}*/{};

    /**
     * @param {GridChenNS.JSONPatchOperation} op
     */
    function mergeOperation(op) {
        const path = op.path.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
        path.shift();
        /** @type {GridChenNS.PatchNode} */
        let node = root;
        let parent = undefined;
        let key = undefined;

        while (path.length > 0) {
            parent = node;
            key = path[0];

            if (Number.isInteger(key)) {
                if (!node.items) {
                    node.items = [];
                    node.splices = [];
                }
                if (path.length > 1 && node.items[key] === undefined) {
                    node.items[key] = /** @type{GridChenNS.PatchNode}*/{};

                }
                node = node.items[key];

            } else {
                if (!node.children) {
                    node.children = {};
                }
                if (node.children[key] === undefined) {
                    node.children[key] = /** @type{GridChenNS.PatchNode}*/{};
                }
                 node = node.children[key];
            }

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
                parent.items.length = Math.max(parent.items.length, key+1);
                parent.items.splice(key, 0, /** @type{GridChenNS.PatchNode}*/{value: op.value});
            } else if (op.op === 'remove') {
                if (last.index === key && last.op === 'add') {
                    parent.splices.pop()
                } else
                    parent.splices.push({index: key, op:'remove'});
                parent.items.splice(key, 1);
            }

            return
        }

        if (op.op === 'add') {
            if (node.op === 'remove') {
                node.op = 'replace';
            } else {
                console.assert(node.op === undefined);
                node.op = 'add';
            }
            node.value = op.value;
        } else if (op.op === 'remove') {
            if (node.op === 'add') {
                delete node.op;
            } else {
                console.assert(node.op === undefined);
                node.op = 'remove';
            }
            delete node.value;
            delete node.children;
            delete node.items;
            delete node.splices;
        }
    }

    const mergedPatch = [];

    /**
     *
     * @param {GridChenNS.PatchNode} o
     * @param {string} path
     */
    function serialize(o, path) {

        if (o.op === 'add' || o.op === 'replace') {
            mergedPatch.push({op: o.op, path: path, value: o.value});
        } else if (o.op === 'remove') {
            mergedPatch.push({op: o.op, path: path});
        }

        if (o.items) {
            for (const splice of o.splices) {
                if (splice.op === 'add') {
                    mergedPatch.push({op: splice.op, path: path + '/' + splice.index, value: null});
                } else {
                    console.assert(splice.op === 'remove');
                    mergedPatch.push({op: splice.op, path: path + '/' + splice.index});
                }
            }
            for (const index in o.items) {
                if (o.items[index].value !== undefined) {
                    mergedPatch.push({op: 'replace', path: path + '/' + index, value: o.items[index].value});
                }
                serialize(o.items[index], path + '/' + index);
            }
        }

        if (o.children) {
            for (const key of Object.keys(o.children)) {
                serialize(o.children[key], path + '/' + key);
            }
        }
    }

    for (let op of normalizedPatch) {
        mergeOperation(Object.assign({}, op));
    }

    serialize(root, '');
    return mergedPatch
}
