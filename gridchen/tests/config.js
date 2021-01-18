import {create} from "../testing/suite.js"
console.log(import.meta);
const modules = [
    'test_json_patch_merge',
    'test_patch',
    'test_date',
    'test_GridChen',
    'test_Clipboard',
    "test_Converter",
    "test_tsvToMatrix",
    "test_DataViews",
    "test_range",
    "test_selection"
];

const url = new URL(import.meta.url);
const base = url.pathname.split('/');
base.pop();

create(modules.map(m => base.concat([m]).join('/')));