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
        let parent = undefined;
        let key = undefined;

        while (path.length > 0) {
            key = path[0];
            if (!o.children) {
                if (Number.isInteger(key)) {
                    o.children = {};
                } else {
                    o.children = {};
                }
            }
            if (Number.isInteger(key)) {
                for (const k in o.children) {
                    const child = o.children[k];
                    if (child.op === 'remove' && parseInt(k) < key) {
                        key++;
                    } else if (child.op === 'add' && parseInt(k) <= key) {
                        key--;
                    }
                }
            }

            if (o.children[key] === undefined) {
                o.children[key] = {};
            }
            parent = o;
            o = o.children[key];
            path.shift();
        }

        if (op.op === 'add') {
            if (o.op === 'remove') {
                o.op = 'replace';
            } else {
                console.assert(o.op === undefined);
                o.op = 'add';
                // if (parent && Number.isInteger(key)) {
                //     const copy = {};
                //     for (const k in parent.children) {
                //         if (key <= parseInt(key)) {
                //             copy[k] = parent.children[k];
                //         }
                //     }
                //     for (const k in copy) {
                //         delete parent.children[k];
                //     }
                //     for (const k in copy) {
                //         parent.children[parseInt(k) + 1] = copy[k];
                //     }
                // }
            }
            o.value = op.value;
        } else if (op.op === 'remove') {
            if (o.op === 'add') {
                delete o.op;
            } else {
                console.assert(o.op === undefined);
                o.op = 'remove';
                // if (parent && Number.isInteger(key)) {
                //     const copy = {};
                //     for (const k in parent.children) {
                //         if (key <= parseInt(key)) {
                //             copy[k] = parent.children[k];
                //         }
                //     }
                //     for (const k in copy) {
                //         delete parent.children[k];
                //     }
                //     for (const k in copy) {
                //         parent.children[parseInt(k) - 1] = copy[k];
                //     }
                // }
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

        const keys = Object.keys(o.children || {}).sort().reverse();
        for (const key of keys) {
            serialize(o.children[key], path + '/' + key);
        }
    }

    for (let op of normalizedPatch) {
        mergeOperation(Object.assign({}, op));
    }

    serialize(root, '');
    return mergedPatch
}
