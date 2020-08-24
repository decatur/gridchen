/**
 * @param {GridChenNS.JSONPatchOperation[]} patch
 * @returns {GridChenNS.JSONPatchOperation[]}
 */
export function mergePatch(patch) {
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
    function normalizeOperation(op) {
        op.path = op.path.split('/').map(key => /^\d+$/.test(key)?parseInt(key):key);
        let removeOps = [];
        let addOp = op;

        for (let other of normalizedPatch) {
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
                    removeOps.push(other);
                    addOp = undefined;
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
                if (other.op === 'add' && op.path.join('/') === other.path.join('/')) {
                    other.value = op.value;
                    addOp = undefined;
                }
            } else {
                throw Error('JSON Patch operation not supported: ' + op.op);
            }
        }

        for (const removeOp of removeOps) {
            const index = normalizedPatch.indexOf(removeOp);
            console.assert(index !== -1)
            normalizedPatch.splice(index, 1);
        }

        if (addOp) {
            normalizedPatch.push(addOp);
        }
    }

    const normalizedPatch = [];
    for (let op of patch) {
        normalizeOperation(Object.assign({}, op));
    }
    return normalizedPatch
}