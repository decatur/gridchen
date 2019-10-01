(function () {

    function applyScheme() {
        // We avoid a https://en.wikipedia.org/wiki/Flash_of_unstyled_content
        let colorScheme = window.localStorage.getItem('colorScheme') || 'preferred';

        if (colorScheme === 'preferred' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            colorScheme = 'dark';
        }

        let style;
        if (colorScheme === 'dark') {
            style = `
                body, option {
                    background-color: rgb(5, 5, 5);
                    color: rgb(200, 250, 250);
                }
            `;
        } else {
            style = `
                body, option {
                    color: rgb(5, 5, 5);
                    background-color: rgb(250, 250, 250);
                }
            `;
        }

        let styleSheet = document.createElement('style');
        styleSheet.textContent = style;
        document.head.appendChild(styleSheet);
    }

    if (!document.body) {
        applyScheme();
    }

    window.onload = function () {
        const colorSchemeElement = /** @type {HTMLSelectElement} */ document.getElementById('colorScheme');
        if (!colorSchemeElement) return
        const colorScheme = window.localStorage.getItem('colorScheme') || 'preferred';

        colorSchemeElement.namedItem(colorScheme).selected = true;
        colorSchemeElement.onchange = function () {
            window.localStorage.setItem('colorScheme', colorSchemeElement.value);
            applyScheme();
        }
    };

})();

