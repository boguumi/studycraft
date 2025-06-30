import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

//////////////////////////////
// Deine Firebase Konfiguration
//////////////////////////////
import firebaseConfig from './database/firebaseConfig.js';

//////////////////////////////
// Firebase Initialisierung
//////////////////////////////

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


///////////////////////////////////////////////////
// Überprüfe den Anmeldestatus beim Laden der Seite
///////////////////////////////////////////////////

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Benutzer ist angemeldet - er darf auf die aktuelle Seite bleiben (z.B. index.html)
        // console.log("Benutzer ist angemeldet.");
        // Hier musst du NICHT weiterleiten, der Benutzer soll auf der aktuellen Seite bleiben.
    } else {
        // Benutzer ist NICHT angemeldet - leite zur Login-Seite weiter
        // console.log("Benutzer ist nicht angemeldet - Weiterleitung zu login.html");
        window.location.href = 'login.html';
    }
});


////////////////
// ColorScheme
////////////////

const themeStylesheet = document.getElementById('theme-stylesheet');
const themeSwitcher = document.getElementById('themeSwitcher'); // Hole das Auswahlmenü (falls auf der Seite vorhanden)

function setTheme(themeName) {
    if (themeStylesheet) {
        themeStylesheet.href = `styles/${themeName}.css`;
        localStorage.setItem('theme', themeName);
    } else {
        // console.error("Error: theme-stylesheet element not found in the DOM.");
    }
}

function applyStoredTheme() {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        setTheme(storedTheme);
        // Wenn die Seite ein Farbschema-Auswahlmenü hat, setze es entsprechend
        if (themeSwitcher) {
            themeSwitcher.value = storedTheme;
        }
    }
}

// Wende das gespeicherte Theme an, sobald die Seite geladen ist
document.addEventListener('DOMContentLoaded', applyStoredTheme);

// Füge den Event-Listener nur hinzu, wenn das Auswahlmenü auf der Seite existiert
if (themeSwitcher) {
    themeSwitcher.addEventListener('change', (event) => {
        const selectedTheme = event.target.value;
        setTheme(selectedTheme);
    });
}


////////////////
// LogoutButton
////////////////
const logoutButton = document.getElementById('logoutButton');


logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Erfolgreich abgemeldet.
        // console.log('Benutzer erfolgreich abgemeldet.');
        // Hier kannst du den Benutzer zur Login-Seite weiterleiten oder andere Aktionen ausführen.
        window.location.href = '/login.html'; // Beispielhafte Weiterleitung zur Login-Seite
    }).catch((error) => {
        // Es gab einen Fehler beim Abmelden.
        // console.error('Fehler beim Abmelden:', error);
        // Hier kannst du dem Benutzer eine Fehlermeldung anzeigen.
    });
});


////////////////
// Settings
////////////////

const settingIcon = document.querySelector(".settings-icon");
const settings = document.querySelector(".settings");
const settingIconClose = document.querySelector(".settings-icon-close"); 

settingIcon.addEventListener('click', () => {
    if (settings.classList.contains("settings-open")) {
        settings.classList.remove("settings-open");
        settingIcon.classList.remove("rotate-right"); 
        settingIconClose.classList.remove("rotate-left"); 
    } else {
        settingIcon.classList.add("rotate-right"); 
        setTimeout(() => {
            settings.classList.add("settings-open"); 
            settingIcon.classList.remove("rotate-right"); 
        }, 300); 
    }
});

settingIconClose.addEventListener('click', () => {
    settingIconClose.classList.add("rotate-left");

    setTimeout(() => {
        settings.classList.remove("settings-open");

        settingIcon.classList.remove("rotate-right");
        settingIconClose.classList.remove("rotate-left"); 
    }, 300); 
});