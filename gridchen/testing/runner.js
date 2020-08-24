import {getErrorCount, execute, log} from './utils.js'

// See https://websemantics.uk/tools/image-to-data-uri-converter
const red = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAADYSURBVHhe7dChAYAwEMDAhzmQ3X8zdsBg2yxwZ+Jzvc8a9u6/bBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgYFAwKBgUDAoGBYOCQcGgo5kPhYcB7Tdh4oYAAAAASUVORK5CYII=';
const green = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAADHSURBVHhe7dABDQAgDMAwtKAHs3eIg89AkyroufNYCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoCAoCAqCgqAgKAgKgoKgICgICoKCoNW8D/AdXllb7+9DAAAAAElFTkSuQmCC';
const yellow = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAADVSURBVHhe7dAxAYAwEMDAB/9qa6AsrG0M3C3Z8+w1XLx/OTAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBwaBgUDAoGBQMCgYFg4JBVzMfgpICsfJLQ/sAAAAASUVORK5CYII=';

const favLink = document.getElementById('favicon');
favLink.setAttribute('href', yellow)

export function create(moduleName, module, test) {
    document.title = moduleName;
    document.getElementById('moduleName').textContent = moduleName;

    module
        .then(function () {
            return execute(test)
        })
        .then(() => favLink.setAttribute('href', getErrorCount() ? red : green))
        .catch(function (reason) {
            favLink.setAttribute('href', red);
            console.error(reason);
            log(reason);
        })
        .then(function () {
            if (window.opener) {
                window.opener.moduleDone(moduleName);
            }
        });
}
