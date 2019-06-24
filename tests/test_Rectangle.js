import {test, assert} from './utils.js'
import {Rectangle} from '../modules/GridChen.js'

test('Rectangle', () => {
    assert.equal(
        new Rectangle({min:5, sup:6}, {min:8, sup:10}),
        new Rectangle({min:0, sup:10}, {min:0, sup:10})
            .intersect(new Rectangle({min:5, sup:6}, {min:8, sup:20}))
    );
}).finally();

