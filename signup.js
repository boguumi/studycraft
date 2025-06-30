import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import firebaseConfig from './database/firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById('form');
const firstnameInput = document.getElementById('firstname_input');
const emailInput = document.getElementById('email_input');
const passwordInput = document.getElementById('password_input');
const repeatPasswordInput = document.getElementById('repeat-password_input');
const errorMessage = document.getElementById('error-message');

// NEUE ELEMENTE FÜR GOOGLE SIGN-UP
const googleSignUpButton = document.getElementById('google-signup-button');
const provider = new GoogleAuthProvider(); // Initialisiere den Google Auth Provider

// Event Listener für E-Mail/Passwort Registrierung
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstname = firstnameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const repeatPassword = repeatPasswordInput.value.trim();

    const errors = validateSignUpForm(firstname, email, password, repeatPassword);

    if (errors.length > 0) {
        errorMessage.innerText = errors.join(". ");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Benutzerprofil aktualisieren (optional, um den Namen zu speichern)
        await updateProfile(user, {
            displayName: firstname
        });

        // console.log("Benutzer erfolgreich registriert (E-Mail/Passwort):", user);
        // Weiterleitung zur Hauptseite oder einer anderen Seite nach der Registrierung
        window.location.href = 'index.html'; // Ändere dies zu deiner Hauptseite
    } catch (error) {
        // console.error("Fehler bei der Registrierung:", error.message);
        let message = 'Registrierung fehlgeschlagen.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Diese E-Mail-Adresse wird bereits verwendet.';
                break;
            case 'auth/invalid-email':
                message = 'Ungültiges E-Mail-Format.';
                break;
            case 'auth/weak-password':
                message = 'Das Passwort ist zu schwach (mindestens 6 Zeichen).';
                break;
            default:
                message = `Registrierung fehlgeschlagen: ${error.message}`;
                break;
        }
        errorMessage.innerText = message;
    }
});

// NEUE FUNKTION FÜR GOOGLE REGISTRIERUNG
function signUpWithGooglePopup() {
    signInWithPopup(auth, provider)
        .then(async (result) => { // Füge async hinzu, falls du updateProfile verwenden möchtest
            const user = result.user;

            // Optional: Wenn du den Vornamen auch bei Google-Registrierungen festlegen möchtest
            // Firebase versucht, displayName vom Google-Konto zu verwenden.
            // Falls du einen spezifischen "Vornamen" aus einem Formularfeld willst,
            // müsstest du überlegen, wie du diesen erfassst, da das SignUp-Formular
            // beim Google-Sign-in übersprungen wird.
            // Für den Anfang können wir den displayName von Google übernehmen oder leer lassen.
            // Hier nutzen wir den displayName, den Google bereitstellt.

            // console.log("Nutzer erfolgreich registriert (Google):", user);
            errorMessage.innerText = '';
            window.location.href = 'index.html';
        })
        .catch((error) => {
            // console.error("Fehler bei der Google-Registrierung (Popup):", error);
            let message = 'Registrierung mit Google fehlgeschlagen.';
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = 'Registrierungsfenster geschlossen.';
                    break;
                case 'auth/cancelled-popup-request':
                    message = 'Registrierungsvorgang abgebrochen.';
                    break;
                case 'auth/operation-not-allowed':
                    message = 'Google-Registrierung ist in Firebase nicht aktiviert.';
                    break;
                case 'auth/auth-domain-config-required':
                    message = 'Die Auth-Domain ist in der Firebase-Konfiguration nicht korrekt.';
                    break;
                case 'auth/account-exists-with-different-credential':
                    message = 'Ein Konto mit dieser E-Mail existiert bereits mit einer anderen Anmeldemethode.';
                    break;
                default:
                    message = `Registrierung mit Google fehlgeschlagen: ${error.message}`;
                    break;
            }
            errorMessage.innerText = message;
        });
}

// Event Listener für den Google Registrierungs-Button
if (googleSignUpButton) {
    googleSignUpButton.addEventListener('click', signUpWithGooglePopup);
}


function validateSignUpForm(firstname, email, password, repeatPassword) {
    let errors = [];

    if (!firstname) {
        errors.push('Vorname ist erforderlich');
    }

    if (!email) {
        errors.push('E-Mail ist erforderlich');
    } else if (!isValidEmail(email)) {
        errors.push('Ungültiges E-Mail-Format');
    }

    if (!password) {
        errors.push('Passwort ist erforderlich');
    } else if (password.length < 6) {
        errors.push('Passwort muss mindestens 6 Zeichen lang sein');
    }

    if (password !== repeatPassword) {
        errors.push('Passwörter stimmen nicht überein');
    }

    return errors;
}

function isValidEmail(email) {
    // Einfache E-Mail-Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const weiterleitungRegistrieren = document.querySelector('.weiterleitung-Registrieren');

weiterleitungRegistrieren.addEventListener('click', () => {
    window.location.href = 'login.html';
});