import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firebase Konfiguration (Muss die gleiche sein wie in main.js) ---
import firebaseConfig from './database/firebaseConfig.js';


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// --- DOM-Elemente ---
const totalFocusTimeDisplay = document.querySelector(".total-focus-time");

// --- Globale Variable für Benutzer-UID ---
let currentUserUid = null;

// --- Funktion zum Laden und Anzeigen der Fokuszeit ---
function loadAndDisplayTotalFocusTime() {
    if (!currentUserUid) {
        if (totalFocusTimeDisplay) {
            totalFocusTimeDisplay.textContent = "Bitte anmelden, um deine Studytime zu sehen.";
        }
        return;
    }

    const userFocusTimeRef = ref(database, `users/${currentUserUid}/focusedTime`);

    // onValue wird immer aufgerufen, wenn sich Daten ändern oder wenn der Listener registriert wird
    onValue(userFocusTimeRef, (snapshot) => {
        const data = snapshot.val();
        let totalSeconds = 0;

        if (data) {
            // Iteriere durch alle gespeicherten Fokus-Sessions
            for (const sessionId in data) {
                if (Object.hasOwnProperty.call(data, sessionId)) {
                    const session = data[sessionId];
                    if (session.durationSeconds && typeof session.durationSeconds === 'number') {
                        totalSeconds += session.durationSeconds;
                    }
                }
            }
        }

        const totalMinutes = Math.round(totalSeconds / 60); // Runden auf ganze Minuten
        
        if (totalFocusTimeDisplay) {
            totalFocusTimeDisplay.textContent = `${totalMinutes} Minuten`;
        }
        // console.log(`Gesamte Fokuszeit für Benutzer ${currentUserUid}: ${totalMinutes} Minuten (${totalSeconds} Sekunden)`);
    }, (error) => {
        // console.error("Fehler beim Abrufen der Fokuszeit:", error);
        if (totalFocusTimeDisplay) {
            totalFocusTimeDisplay.textContent = "Fehler beim Laden der Zeit.";
        }
    });
}

// --- Beobachtet den Authentifizierungsstatus des Benutzers ---
onAuthStateChanged(auth, (user) => {
    // console.log("onAuthStateChanged in stats.js ausgelöst. Benutzer:", user);
    if (user) {
        currentUserUid = user.uid;
        // console.log("Benutzer in stats.js angemeldet. UID:", currentUserUid);
        loadAndDisplayTotalFocusTime(); // Fokuszeit laden, sobald der Benutzer bekannt ist
    } else {
        currentUserUid = null;
        // console.log("Benutzer in stats.js abgemeldet.");
        if (totalFocusTimeDisplay) {
            totalFocusTimeDisplay.textContent = "Bitte anmelden, um deine Studytime zu sehen.";
        }
    }
});

// Optional: Initialen Aufruf, falls das DOM schon geladen ist
// (defer im Script-Tag kümmert sich darum, dass das Skript erst nach dem HTML geladen wird)
// Du kannst hier auch direkt loadAndDisplayTotalFocusTime() aufrufen,
// aber der onAuthStateChanged-Listener ist der sicherere Weg, da er auf den Auth-Status wartet.