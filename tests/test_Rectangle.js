import {test, assert} from './utils.js'
import {Rectangle} from '../modules/GridChen.js'

/**
 *
 * @param {number} min
 * @param {number} sup
 * @returns {GridChen.IInterval}
 */
function interval(min, sup) {
    return  {min, sup}
}

test('Rectangle', () => {
    /** @type {GridChen.IInterval} */
    assert.equal(
        new Rectangle(interval(5,6), interval(8, 10)),
        new Rectangle(interval(0, 10), interval(0, 10))
            .intersect(new Rectangle(interval(5, 6), interval(8,20)))
    );
}).finally();

