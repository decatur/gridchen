// We avoid a https://en.wikipedia.org/wiki/Flash_of_unstyled_content
let theme;
if (window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark';
if (window.localStorage.getItem('theme')) theme = window.localStorage.getItem('theme');

if (theme === 'dark') {
    let styleSheet = document.createElement('style');
    styleSheet.textContent = `
        body {
            background-color: rgb(5, 5, 5);
            color: rgb(200, 250, 250);
        }
    `;
    document.head.appendChild(styleSheet);
}