document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('themeSwitcher');
    const themeStylesheet = document.getElementById('theme-stylesheet');

    if (themeSwitcher && themeStylesheet) {
        themeSwitcher.addEventListener('change', (event) => {
            const selectedTheme = event.target.value;
            themeStylesheet.href = `styles/${selectedTheme}.css`;
            localStorage.setItem('theme', selectedTheme); // Optional: Speichern für zukünftige Besuche auf dieser Seite
        });

        // Beim Laden der Seite: Überprüfe, ob eine Auswahl im Local Storage gespeichert ist (nur für diese Seite)
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            themeSwitcher.value = storedTheme;
            themeStylesheet.href = `styles/${storedTheme}.css`;
        }
    } else {
        // console.error("Theme switcher elements not found on this page.");
    }
});