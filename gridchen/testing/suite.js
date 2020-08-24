/*
 * ### Test Execution Design
 * 0. No dependencies.
 * 1. Test modules are loaded and executed complete independent of each other.
 * 2. In generated iframes access to the clipboard is restricted. So we use a new browser window, not an iframe.
 * 3. We rely on the given browser functionality such as 'Close Other Tabs'
 */
import "../webcomponent.js"
import {createView} from "../matrixview.js"

export function create(testPath) {
    if (!testPath.endsWith('/')) {
        testPath += '/'
    }

    let tests;
    let modulesToRun;

    function nextModule() {
        const url = 'testrunner.html?module=' + modulesToRun[0];
        console.log(url);
        window.open(url);
    }

// Register callback through window.opener.
    window.moduleDone = function (moduleName) {
        if (!modulesToRun) return;
        const index = modulesToRun.indexOf(moduleName);
        modulesToRun.splice(index, 1);
        if (modulesToRun.length) {
            nextModule();
        }
    };

    const schema = {
        title: 'Test Suite',
        type: 'array',
        items: {
            type: 'array',
            items: [
                {title: 'Run Single Test', type: 'string', format: 'uri', width: 500}
            ]
        }
    };

    /** @type {GridChenNS.GridChen} */
    const gridChen = document.querySelector('grid-chen');

    import(testPath + 'modules.js')
        .then(function (module) {
            tests = module.modules;
            gridChen.resetFromView(createView(schema, tests.map(moduleName => ['testrunner.html?module=' + testPath + moduleName])));
        });

    document.getElementById('runAllTests').onclick = function () {
        modulesToRun = tests.map(moduleName => testPath + moduleName);
        nextModule();
    };

}