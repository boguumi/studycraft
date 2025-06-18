     const burgermenuToggle = document.querySelector('.burgermenu-toggle');
        const burgermenu = document.querySelector('.burgermenu');

        burgermenuToggle.addEventListener('click', () => {
            burgermenuToggle.classList.toggle('open');
            burgermenu.classList.toggle('open');
        });