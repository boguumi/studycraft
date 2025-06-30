import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

//////////////////////////////
// Deine Firebase Konfiguration
//////////////////////////////
import firebaseConfig from './database/firebaseConfig.js';

//////////////////////////////
// Firebase Initialisierung
//////////////////////////////

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


/////////////////////////////////////////
// Elemente für E-Mail/Passwort Formular
/////////////////////////////////////////

const emailForm = document.getElementById('form');
const emailInput = document.getElementById('email_input');
const passwordInput = document.getElementById('password_input');
const errorMessage = document.getElementById('error-message');

///////////////////////////////
// Elemente für Google Sign-In
///////////////////////////////

const googleSignInButton = document.getElementById('google-signin-button');
const provider = new GoogleAuthProvider();

//////////////////////////////////////////////
// Event Listener für E-Mail/Passwort Formular
//////////////////////////////////////////////

if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email) {
            errorMessage.innerText = 'E-Mail ist erforderlich.';
            return;
        }

        if (!password) {
            errorMessage.innerText = 'Passwort ist erforderlich.';
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // console.log('Benutzer erfolgreich angemeldet (E-Mail/Passwort):', user);
            errorMessage.innerText = '';
            window.location.href = 'index.html';

        } catch (error) {
            // console.error('Fehler bei der E-Mail/Passwort-Anmeldung:', error.message);
            let message = 'Anmeldung fehlgeschlagen.';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'Benutzer mit dieser E-Mail nicht gefunden.';
                    break;
                case 'auth/wrong-password':
                    message = 'Falsches Passwort.';
                    break;
                case 'auth/invalid-email':
                    message = 'Ungültiges E-Mail-Format.';
                    break;
                case 'auth/user-disabled':
                    message = 'Dieses Benutzerkonto wurde deaktiviert.';
                    break;
                default:
                    message = `Anmeldung fehlgeschlagen: ${error.message}`;
                    break;
            }
            errorMessage.innerText = message;
        }
    });
}

///////////////////////////////////////////////////
// Funktion zum Anmelden mit Google (Popup Methode)
///////////////////////////////////////////////////

function signInWithGooglePopup() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            // console.log("Nutzer erfolgreich angemeldet (Google):", user);
            errorMessage.innerText = '';
            window.location.href = 'index.html';
        })
        .catch((error) => {
            // console.error("Fehler bei der Google-Anmeldung (Popup):", error);
            let message = 'Anmeldung mit Google fehlgeschlagen.';
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = 'Anmeldefenster geschlossen.';
                    break;
                case 'auth/cancelled-popup-request':
                    message = 'Anmeldevorgang abgebrochen.';
                    break;
                case 'auth/operation-not-allowed':
                    message = 'Google-Anmeldung ist nicht aktiviert.';
                    break;
                case 'auth/auth-domain-config-required':
                    message = 'Die Auth-Domain ist in der Firebase-Konfiguration nicht korrekt.';
                    break;
                default:
                    message = `Anmeldung mit Google fehlgeschlagen: ${error.message}`;
                    break;
            }
            errorMessage.innerText = message;
        });
}

if (googleSignInButton) {
    googleSignInButton.addEventListener('click', signInWithGooglePopup);
}

const weiterleitungRegistrieren = document.querySelector('.weiterleitung-Registrieren');

weiterleitungRegistrieren.addEventListener('click', () => {
    window.location.href = 'signup.html';
});