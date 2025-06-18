// pomodoro.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firebase Konfiguration und Initialisierung ---
const firebaseConfig = {
    apiKey: "AIzaSyCnB_-xgrq7SteCArq2G7veA2hskWYiOzw",
    databaseURL: "https://studycraft-6fcd3-default-rtdb.europe-west1.firebasedatabase.app/",
    authDomain: "studycraft-6fcd3.firebaseapp.com",
    projectId: "studycraft-6fcd3",
    storageBucket: "studycraft-6fcd3.firebasestorage.app",
    messagingSenderId: "941496934992",
    appId: "1:941496934992:web:7db965e94ef9d842362755"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// console.log("Firebase App initialisiert für:", firebaseConfig.projectId);
// console.log("Realtime Database instanziiert mit URL:", firebaseConfig.databaseURL);
// console.log("Authentication Service verfügbar.");

let zahlFokuszeit;
let fokusPlus;
let fokusMinus;
let zahlSmallBrake;
let zahlBigBrake;
let resetPomodoro;
let startTimerButton;
let timerContainer;
let pomodoroSettings;
let countdownAnzeige;
let progressBarFill;
let whatsNowText;
let flipClock;
let whiteNoise;
let pomodoroIconBook;
let pomodoroIconCup1;
let pomodoroIconCup2;

let countdownInterval;
let gesamtZeitInSekunden;
let verbleibendeZeitInSekunden; 
let aktuellerTimerZustand = "fokus";
let timerStatus = "stopped"; 
let fokusEinheiten = 0;

let currentFocusSessionStartTime; 
let focusedTimeInSecondsThisSession = 0;
let pauseStartTime = null; 

let currentUserUid = null; 

let pausePlayIcon = null;
let pausePlayIconPath = null;

let pomodoroResetTimerIcon = null; 

const pauseIconPath = "M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Z";
const playIconPath = "M320-200v-560l440 280-440 280Z";

let mainSemester;
let addSubjectButton;
let addSemesterButton;
let semesterOverview;
let currentSemesterKey = null;


function showMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.classList.add("messageBox")
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    setTimeout(() => {
        document.body.removeChild(messageBox);
    }, 3000);
}

function getUserSemesterRef(semesterKey = currentSemesterKey) {
    if (!currentUserUid) {
        // console.error("Benutzer ist nicht angemeldet.");
        return null;
    }
    if (!semesterKey) {
        // console.warn("Kein Semester ausgewählt.");
        return null;
    }
    return ref(database, `users/${currentUserUid}/semesters/${semesterKey}`);
}

function createUserSemestersRef() {
    if (!currentUserUid) {
        // console.error("Benutzer ist nicht angemeldet.");
        return null;
    }
    return ref(database, `users/${currentUserUid}/semesters`);
}


// --- Pomodoro Funktionen ---

function updateBrakeTimes() {
    // Sicherstellen, dass zahlFokuszeit vor dem Zugriff existiert
    if (!zahlFokuszeit || !zahlSmallBrake || !zahlBigBrake) return;

    const fokusZeit = parseInt(zahlFokuszeit.textContent);
    const smallBrakeValue = Math.round(fokusZeit / 5);
    const bigBrakeValue = fokusZeit / 2;
    zahlSmallBrake.textContent = smallBrakeValue;
    zahlBigBrake.textContent = bigBrakeValue.toFixed(1);
}

/**
 * Startet oder setzt den Pomodoro-Countdown fort.
 * Passt sich dem aktuellen Timer-Zustand (Fokus, kurze Pause, lange Pause) an.
 */
function starteCountdown() {
    let dauerInMinuten;

    if (aktuellerTimerZustand === "fokus") {
        dauerInMinuten = parseInt(zahlFokuszeit.textContent);
        if (whatsNowText) whatsNowText.textContent = "Aktuell: Fokus";
        
        // Wenn der Timer neu gestartet wird (nicht fortgesetzt von einer Pause)
        if (timerStatus === "stopped") {
            currentFocusSessionStartTime = Date.now();
            focusedTimeInSecondsThisSession = 0; // Zähler für die aktuelle Fokus-Session zurücksetzen
        }
        
    } else if (aktuellerTimerZustand === "kurzePause") {
        dauerInMinuten = parseInt(zahlSmallBrake.textContent);
        if (whatsNowText) whatsNowText.textContent = "Aktuell: Kurze Pause";
    } else if (aktuellerTimerZustand === "langePause") {
        dauerInMinuten = parseFloat(zahlBigBrake.textContent);
        if (whatsNowText) whatsNowText.textContent = "Aktuell: Lange Pause";
    }

    if (isNaN(dauerInMinuten) || dauerInMinuten <= 0) {
        if (countdownAnzeige) countdownAnzeige.textContent = "Ungültige Zeit!";
        if (whatsNowText) whatsNowText.textContent = "";
        // console.error("Ungültige Dauer für den Countdown.");
        return;
    }

    // Gesamtzeit nur einmalig setzen, wenn der Timer von "stopped" startet
    if (timerStatus === "stopped") {
        gesamtZeitInSekunden = dauerInMinuten * 60;
        verbleibendeZeitInSekunden = gesamtZeitInSekunden; // Start mit voller Zeit
    } 
    // Wenn von "paused" fortgesetzt, bleibt verbleibendeZeitInSekunden wie sie ist

    if (countdownInterval) {
        clearInterval(countdownInterval); // Sicherstellen, dass kein alter Interval läuft
    }

    anzeigeAktualisieren(verbleibendeZeitInSekunden);
    updateProgressBar(verbleibendeZeitInSekunden, gesamtZeitInSekunden);

    timerStatus = "running"; // Timer läuft jetzt
    // Update des Pause/Play-Icons auf PAUSE-Zustand
    if (pausePlayIconPath) {
        pausePlayIconPath.setAttribute('d', pauseIconPath);
    }


    countdownInterval = setInterval(() => {
        if (verbleibendeZeitInSekunden > 0) {
            verbleibendeZeitInSekunden--;
            anzeigeAktualisieren(verbleibendeZeitInSekunden);
            updateProgressBar(verbleibendeZeitInSekunden, gesamtZeitInSekunden);

            // Fokuszeit während der Fokus-Phase inkrementieren
            if (aktuellerTimerZustand === "fokus") {
                focusedTimeInSecondsThisSession++;
            }

        } else {
            clearInterval(countdownInterval);
            timerAbgelaufen();
        }
    }, 1000);
}

function anzeigeAktualisieren(zeitInSekunden) {
    if (!countdownAnzeige) return;
    const minuten = Math.floor(zeitInSekunden / 60);
    const sekunden = zeitInSekunden % 60;
    const formatierteZeit = `${minuten.toString().padStart(2, '0')}:${sekunden.toString().padStart(2, '0')}`;
    countdownAnzeige.textContent = formatierteZeit;
}

function updateProgressBar(aktuelleZeitInSekunden, gesamtZeitInSekunden) {
    if (!progressBarFill) return;
    if (gesamtZeitInSekunden > 0) {
        const prozentualerFortschritt = ((gesamtZeitInSekunden - aktuelleZeitInSekunden) / gesamtZeitInSekunden) * 100;
        progressBarFill.style.width = `${prozentualerFortschritt}%`;
    } else {
        progressBarFill.style.width = "0%";
    }
}

/**
 * Pausiert den aktuell laufenden Timer.
 */
function pauseTimer() {
    if (timerStatus === "running") {
        clearInterval(countdownInterval);
        timerStatus = "paused";
        pauseStartTime = Date.now(); // Zeitpunkt der Pause speichern

        // Icon auf PLAY-Zustand ändern
        if (pausePlayIconPath) {
            pausePlayIconPath.setAttribute('d', playIconPath);
        }
        // console.log("Timer pausiert Verbleibende Zeit:", verbleibendeZeitInSekunden, "Sekunden.");
        showMessage("Timer pausiert");
    }
}

/**
 * Setzt einen pausierten Timer fort.
 */
function resumeTimer() {
    if (timerStatus === "paused") {
        starteCountdown(); // ruft starteCountdown auf, um den Timer fortzusetzen
        // console.log("Timer fortgesetzt");
        showMessage("Timer fortgesetzt");
    }
}

function timerAbgelaufen() {
    let notificationTitle = "Pomodoro Timer";
    let notificationBody = "";
    let notificationIcon = "/files/logo.svg";

    if (aktuellerTimerZustand === "fokus") {
        fokusEinheiten++;
        notificationBody = "Deine Fokuszeit ist abgelaufen! Zeit für eine Pause!";

        // Fokuszeit speichern, wenn die Fokus-Session erfolgreich abgeschlossen ist
        saveFocusedTime(focusedTimeInSecondsThisSession);

        if (fokusEinheiten % 4 === 0) {
            aktuellerTimerZustand = "langePause";
            whatsNowText.textContent = "Lange Pause startet...";
        } else {
            aktuellerTimerZustand = "kurzePause";
            whatsNowText.textContent = "Kurze Pause startet...";
        }
    } else if (aktuellerTimerZustand === "kurzePause") {
        notificationBody = "Deine kurze Pause ist beendet! Zeit für die nächste Fokuszeit!";
        aktuellerTimerZustand = "fokus";
        whatsNowText.textContent = "Fokus startet...";
    } else if (aktuellerTimerZustand === "langePause") {
        notificationBody = "Deine lange Pause ist beendet! Zurück zur Arbeit!";
        aktuellerTimerZustand = "fokus";
        whatsNowText.textContent = "Fokus startet...";
        fokusEinheiten = 0;
    }

    showNotification(notificationTitle, notificationBody, notificationIcon);
    
    timerStatus = "stopped"; 
    if (pausePlayIconPath) {
        pausePlayIconPath.setAttribute('d', pauseIconPath);
    }
    
    starteCountdown(); // Startet den nächsten Timer
}

// Funktion zum Speichern der Fokuszeit in Firebase
function saveFocusedTime(timeInSeconds) {
    if (!currentUserUid) {
        // console.warn("Benutzer nicht angemeldet. Fokuszeit kann nicht gespeichert werden.");
        return;
    }

    if (timeInSeconds <= 0) {
        // console.log("Keine Fokuszeit zum Speichern für diese Sitzung.");
        return;
    }

    const userFocusTimeRef = ref(database, `users/${currentUserUid}/focusedTime`);
    const newFocusSessionRef = push(userFocusTimeRef);

    set(newFocusSessionRef, {
        durationSeconds: timeInSeconds,
        timestamp: new Date().toISOString()
    })
    .then(() => {
        // console.log(`Fokuszeit von ${timeInSeconds} Sekunden erfolgreich in Firebase gespeichert.`);
    })
    .catch((error) => {
        // console.error("Fehler beim Speichern der Fokuszeit in Firebase:", error);
        showMessage("Fehler beim Speichern der Fokuszeit.");
    });
}

// Icon-Farbwechsel-Logik
function changePomodoroIconColor() {
    if (pomodoroIconBook && pomodoroIconCup1 && pomodoroIconCup2) {
        if (aktuellerTimerZustand === "kurzePause" || aktuellerTimerZustand === "langePause"){
            pomodoroIconBook.classList.add("pomodoro-icon-gray");
            pomodoroIconCup1.classList.remove("pomodoro-icon-gray");
            pomodoroIconCup2.classList.remove("pomodoro-icon-gray");
        } else if (aktuellerTimerZustand === "fokus"){
            pomodoroIconBook.classList.remove("pomodoro-icon-gray");
            pomodoroIconCup1.classList.add("pomodoro-icon-gray");
            pomodoroIconCup2.classList.add("pomodoro-icon-gray");
        }
    }
}


// --- Desktop Benachrichtigungen ---
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        // console.warn("Dieser Browser unterstützt keine Desktop-Benachrichtigungen.");
        showMessage("Dein Browser unterstützt leider keine Desktop-Benachrichtigungen.");
        return;
    }

    if (Notification.permission === "granted") {
        // console.log("Benachrichtigungsberechtigung bereits erteilt.");
        return;
    }

    if (Notification.permission === "denied") {
        // console.warn("Benachrichtigungsberechtigung wurde vom Benutzer verweigert. Bitte manuell in den Browsereinstellungen aktivieren.");
        showMessage("Benachrichtigungen wurden verweigert. Bitte aktivieren Sie sie in den Browsereinstellungen, falls gewünscht.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            // console.log("Benachrichtigungsberechtigung erteilt!");
        } else if (permission === "denied") {
            // console.warn("Benachrichtigungsberechtigung verweigert.");
        } else {
            // console.log("Benachrichtigungsberechtigung wurde ignoriert.");
        }
    });
}

function showNotification(title, body, icon = '') {
    if (Notification.permission === "granted") {
        const options = {
            body: body,
            icon: icon
        };
        new Notification(title, options);
    } else {
        // console.warn("Kann keine Benachrichtigung senden: Berechtigung nicht erteilt.");
    }
}

// --- Semester/Fach-Management Funktionen ---
function createSubjectElement(subjectId, subjectData) {
    const newClassDiv = document.createElement("div");
    newClassDiv.classList.add("fach");
    newClassDiv.dataset.subjectId = subjectId;

    let gradesHTML = '';
    if (subjectData.grades) {
        for (const gradeKey in subjectData.grades) {
            if (Object.hasOwnProperty.call(subjectData.grades, gradeKey)) {
                const gradeValue = subjectData.grades[gradeKey];
                gradesHTML += `<p class="new-grade" data-grade-key="${gradeKey}">${parseFloat(gradeValue).toFixed(1)}</p>`;
            }
        }
    }

    newClassDiv.innerHTML = `
        <p class="nameClass">${subjectData.name || 'Name vom Fach'}</p>
        ${gradesHTML}
        <button class="add-grade">+</button>
        <p class="average">Durchschnitt: ${subjectData.average || '0'}</p>
    `;

    const nameClassElement = newClassDiv.querySelector(".nameClass");
    const addGradeButton = newClassDiv.querySelector(".add-grade");
    const averageDisplay = newClassDiv.querySelector(".average");
    const gradeDisplayElements = newClassDiv.querySelectorAll(".new-grade");

    nameClassElement.addEventListener("click", () => {
        const currentName = nameClassElement.textContent;
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.value = currentName;
        nameClassElement.replaceWith(inputField);
        inputField.focus();

        inputField.addEventListener("blur", () => {
            const newName = inputField.value.trim();
            if (newName !== "") {
                const updatedNameElement = document.createElement("p");
                updatedNameElement.classList.add("nameClass");
                updatedNameElement.textContent = newName;
                updatedNameElement.addEventListener("click", () => updatedNameElement.click()); // Event Listener erneut anbringen
                newClassDiv.insertBefore(updatedNameElement, newClassDiv.firstChild);
                inputField.replaceWith(updatedNameElement);
                set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectId}/name`), newName);
            } else {
                nameClassElement.textContent = currentName;
                inputField.replaceWith(nameClassElement);
            }
        });
    });

    function calculateAverage(container, currentSubjectId) {
        const gradeElements = container.querySelectorAll('.new-grade');
        let total = 0;
        let count = 0;
        const grades = {};

        gradeElements.forEach((gradeElement) => {
            const gradeValue = parseFloat(gradeElement.textContent);
            if (!isNaN(gradeValue)) {
                total += gradeValue;
                count++;
                grades[gradeElement.dataset.gradeKey] = gradeValue;
            }
        });

        if (count > 0) {
            const average = total / count;
            averageDisplay.textContent = `Durchschnitt: ${average.toFixed(2)}`;
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/average`), average.toFixed(2));
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/grades`), grades);
        } else {
            averageDisplay.textContent = `Durchschnitt: 0`;
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/average`), '0');
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/grades`), {});
        }
    }

    addGradeButton.addEventListener("click", () => {
        const newGradeElement = document.createElement("p");
        newGradeElement.classList.add("new-grade");

        const noteInput = document.createElement("input");
        noteInput.type = "text";
        noteInput.value = "0.0";
        noteInput.classList.add("input-grade");
        noteInput.setAttribute("min", "1");
        noteInput.setAttribute("max", "6");

        noteInput.addEventListener("blur", () => {
            let gradeValue = parseFloat(noteInput.value);
            if (gradeValue < 1) {
                gradeValue = 1;
                noteInput.value = 1;
            } else if (gradeValue > 6) {
                gradeValue = 6;
                noteInput.value = 6;
            }
            newGradeElement.textContent = gradeValue.toFixed(1);
            const newGradeRef = push(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectId}/grades`));
            newGradeElement.dataset.gradeKey = newGradeRef.key;
            newClassDiv.insertBefore(newGradeElement, addGradeButton);
            newClassDiv.removeChild(noteInput);
            calculateAverage(newClassDiv, subjectId);
        });

        newClassDiv.insertBefore(noteInput, addGradeButton);
        noteInput.focus();
    });

    gradeDisplayElements.forEach(gradeElement => {
        gradeElement.addEventListener("click", () => {
            const currentGradeText = gradeElement.textContent;
            const inputField = document.createElement("input");
            inputField.type = "text";
            inputField.value = currentGradeText;
            inputField.classList.add("input-grade");
            inputField.setAttribute("min", "1");
            inputField.setAttribute("max", "6");
            newClassDiv.replaceChild(inputField, gradeElement);
            inputField.focus();

            inputField.addEventListener("blur", () => {
                let gradeValue = parseFloat(inputField.value);
                if (gradeValue < 1) {
                    gradeValue = 1;
                    inputField.value = 1;
                } else if (gradeValue > 6) {
                    gradeValue = 6;
                    inputField.value = 6;
                }
                const gradeKey = gradeElement.dataset.gradeKey;
                const updatedGradeElement = document.createElement("p");
                updatedGradeElement.classList.add("new-grade");
                updatedGradeElement.dataset.gradeKey = gradeKey;
                updatedGradeElement.textContent = gradeValue.toFixed(1);
                newClassDiv.replaceChild(updatedGradeElement, inputField);
                set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectId}/grades/${gradeKey}`), gradeValue);
                calculateAverage(newClassDiv, subjectId);
            });
        });
    });

    return newClassDiv;
}

function loadSemesterData(semesterKey) {
    currentSemesterKey = semesterKey;
    const userSemesterRef = getUserSemesterRef(semesterKey);
    if (userSemesterRef) {
       // // console.log("loadSemesterData wird ausgeführt für Semester:", semesterKey);
        onValue(userSemesterRef, (snapshot) => {
            const data = snapshot.val();
            if (mainSemester) mainSemester.innerHTML = ''; // Vorhandenen Inhalt löschen

            let subjectsFound = false;

            if (data) {
                for (const subjectId in data) {
                    if (Object.hasOwnProperty.call(data, subjectId)) {
                        const subjectData = data[subjectId];
                       // // console.log(`Prüfe Eintrag ${subjectId}:`, subjectData);

                        if (subjectId !== 'name' && subjectId !== 'semesterNumber' &&
                            typeof subjectData === 'object' && subjectData !== null &&
                            (subjectData.name !== undefined || subjectData.grades !== undefined || subjectData.average !== undefined)) {
                            
                         //   // console.log("Verarbeite Fach:", subjectId, subjectData);
                            const subjectElement = createSubjectElement(subjectId, subjectData);
                            if (mainSemester) mainSemester.appendChild(subjectElement);
                            subjectsFound = true;
                        } else {
                           // // console.log("Überspringe Semester-Metadaten oder leeren/ungültigen Eintrag:", subjectId, subjectData);
                        }
                    }
                }
            }

            if (!subjectsFound && mainSemester) {
                mainSemester.innerHTML = '<p>Noch keine Fächer in diesem Semester hinzugefügt.</p>';
            }
        });
    }
}

function createSemesterButton(semesterKey, semesterData) {
    const semesterButton = document.createElement("button");
    semesterButton.textContent = semesterData.name || `Semester ${semesterData.semesterNumber || ''}`;
    semesterButton.classList.add("semester-button");
    semesterButton.dataset.semesterKey = semesterKey;
    semesterButton.addEventListener("click", () => {
        if (semesterOverview) {
            semesterOverview.querySelectorAll('.semester-button').forEach(btn => btn.classList.remove('active'));
            semesterButton.classList.add('active');
        }
        loadSemesterData(semesterKey);
    });
    return semesterButton;
}

function loadUserSemesters() {
    const userSemestersRef = createUserSemestersRef();
    if (userSemestersRef) {
        onValue(userSemestersRef, (snapshot) => {
            const data = snapshot.val();
            if (semesterOverview) semesterOverview.innerHTML = '';
            if (data) {
                let firstSemesterKey = null;
                for (const semesterKey in data) {
                    if (Object.hasOwnProperty.call(data, semesterKey)) {
                        const semesterData = data[semesterKey];
                        const button = createSemesterButton(semesterKey, semesterData);
                        if (semesterOverview) semesterOverview.appendChild(button);
                        if (!firstSemesterKey) {
                            firstSemesterKey = semesterKey;
                        }
                    }
                }
                if (firstSemesterKey && !currentSemesterKey && Object.keys(data).length > 0) {
                    const firstButton = semesterOverview ? semesterOverview.querySelector(`.semester-button[data-semester-key="${firstSemesterKey}"]`) : null;
                    if (firstButton) {
                        firstButton.click();
                    }
                } else if (currentSemesterKey && data[currentSemesterKey]) {
                    const activeButton = semesterOverview ? semesterOverview.querySelector(`.semester-button[data-semester-key="${currentSemesterKey}"]`) : null;
                    if (activeButton) {
                        activeButton.classList.add('active');
                    } else if (Object.keys(data).length > 0) {
                        const firstButton = semesterOverview ? semesterOverview.querySelector('.semester-button') : null;
                        if (firstButton) {
                            firstButton.click();
                        }
                    }
                }
            } else {
                if (mainSemester) mainSemester.innerHTML = '<p>Noch keine Semester hinzugefügt.</p>';
            }
        });
    }
}


// --- DOMContentLoaded Event Listener ---
// ALLE DOM-Selektionen und Event-Listener HIER REIN
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Zuweisungen ---
    zahlFokuszeit = document.querySelector(".zahl-fokuszeit");
    fokusPlus = document.querySelector(".fokuszeitPlus");
    fokusMinus = document.querySelector(".fokuszeitMinus");
    zahlSmallBrake = document.querySelector(".zahl-small-pause");
    zahlBigBrake = document.querySelector(".zahl-big-pause");
    resetPomodoro = document.querySelector(".reset-pomodoro-button");
    startTimerButton = document.querySelector(".pomodoro-start-button");
    timerContainer = document.querySelector(".timer-container");
    pomodoroSettings = document.querySelector(".pomodoro-settings");
    countdownAnzeige = document.querySelector(".countdown");
    progressBarFill = document.querySelector(".progress-bar-fill");
    whatsNowText = document.querySelector(".whats-now");
    flipClock = document.querySelector(".flipclock");
    whiteNoise = document.querySelector(".white-noises");
    pomodoroIconBook = document.querySelector(".pomodoro-book-path");
    pomodoroIconCup1 = document.querySelector(".pomodoro-cup-path1");
    pomodoroIconCup2 = document.querySelector(".pomodoro-cup-path2");

    pausePlayIcon = document.getElementById("pomodoro-pause-play-icon");
    if (pausePlayIcon) {
        pausePlayIconPath = pausePlayIcon.querySelector('path');
    }

    pomodoroResetTimerIcon = document.getElementById("pomodoro-reset-icon");

    if (pausePlayIcon) {
        pausePlayIcon.addEventListener("click", () => {
            if (timerStatus === "running") {
                pauseTimer();
            } else if (timerStatus === "paused") {
                resumeTimer();
            } else {
                showMessage("Timer ist noch nicht gestartet.");
            }
        });
    }
    
// NEU: Event-Listener für das neue Reset-Icon im Timer-Container
if (pomodoroResetTimerIcon) {
    pomodoroResetTimerIcon.addEventListener("click", () => {
        // ... (bestehende Reset-Logik)

        // Logik vom ursprünglichen Reset-Button in den Einstellungen kopieren
        if (aktuellerTimerZustand === "fokus") {
            if (focusedTimeInSecondsThisSession > 0) {
                saveFocusedTime(focusedTimeInSecondsThisSession);
            }
        }

        if (zahlFokuszeit) zahlFokuszeit.textContent = 25;
        updateBrakeTimes();
        aktuellerTimerZustand = "fokus";
        fokusEinheiten = 0;
        if (countdownAnzeige) countdownAnzeige.textContent = "25:00";
        if (progressBarFill) progressBarFill.style.width = "0%";
        if (whatsNowText) whatsNowText.textContent = "";
        if (pomodoroSettings) pomodoroSettings.classList.remove("display-none");
        if (startTimerButton) {
            startTimerButton.classList.remove("display-none");
            startTimerButton.removeAttribute("disabled");
            startTimerButton.textContent = "Starten";
        }
        if (timerContainer) timerContainer.style.display = "none";
        clearInterval(countdownInterval);
        
        timerStatus = "stopped";
        verbleibendeZeitInSekunden = 0;
        gesamtZeitInSekunden = 0;
        pauseStartTime = null;
        focusedTimeInSecondsThisSession = 0;
        currentFocusSessionStartTime = null;

        if (pausePlayIconPath) {
            pausePlayIconPath.setAttribute('d', pauseIconPath);
        }
        showMessage("Timer wurde zurückgesetzt."); // Optional: Bestätigungsnachricht

        // NEU: White Noise beim Reset ausblenden
        if (whiteNoise) whiteNoise.style.display = "none";
    });
}
    // Element-Referenzen für Noten/Semester
    mainSemester = document.querySelector(".main-semester");
    addSubjectButton = document.getElementById("add-subject-button");
    addSemesterButton = document.querySelector(".add-Semester");
    semesterOverview = document.querySelector(".semester-oberview");

    // Sicherstellen, dass die anfänglichen Bremszeiten aktualisiert werden, nachdem DOM geladen ist
    updateBrakeTimes();

    // --- ALLE EVENT-LISTENER HIER HIN VERSCHIEBEN ---

    if (fokusPlus) {
        fokusPlus.addEventListener("click", () => {
            if (zahlFokuszeit) zahlFokuszeit.textContent = parseInt(zahlFokuszeit.textContent) + 5;
            updateBrakeTimes();
        });
    }

    if (fokusMinus) {
        fokusMinus.addEventListener("click", () => {
            if (!zahlFokuszeit) return;
            const aktuelleFokusZeit = parseInt(zahlFokuszeit.textContent);
            if (aktuelleFokusZeit - 5 >= 5) {
                zahlFokuszeit.textContent = aktuelleFokusZeit - 5;
                updateBrakeTimes();
            } else {
                showMessage("Die Fokuszeit muss mindestens 5 Minuten betragen"); // Geändert von alert()
            }
        });
    }

    if (resetPomodoro) {
        resetPomodoro.addEventListener("click", () => {
            if (aktuellerTimerZustand === "fokus" && focusedTimeInSecondsThisSession > 0) {
                // console.log("Fokus-Session unterbrochen durch Reset. Zeit wird nicht gespeichert.");
            }

            if (zahlFokuszeit) zahlFokuszeit.textContent = 25;
            updateBrakeTimes();
            aktuellerTimerZustand = "fokus";
            fokusEinheiten = 0;
            if (countdownAnzeige) countdownAnzeige.textContent = "25:00";
            if (progressBarFill) progressBarFill.style.width = "0%";
            if (whatsNowText) whatsNowText.textContent = "";
            if (pomodoroSettings) pomodoroSettings.classList.remove("display-none");
            if (startTimerButton) {
                startTimerButton.classList.remove("display-none");
                // Wenn der Benutzer angemeldet ist, wieder aktivieren
                // Dies bleibt hier, aber die Prüfung auf currentUserUid sollte in onAuthStateChanged erfolgen
                startTimerButton.removeAttribute("disabled");
                startTimerButton.textContent = "Starten";
            }
            if (timerContainer) timerContainer.style.display = "none";
            clearInterval(countdownInterval);
            
            timerStatus = "stopped"; // Setze den Status auf gestoppt
            verbleibendeZeitInSekunden = 0; // Rücksetzen der verbleibenden Zeit
            gesamtZeitInSekunden = 0; // Auch die Gesamtzeit zurücksetzen
            pauseStartTime = null; // Pause-Startzeit zurücksetzen
            focusedTimeInSecondsThisSession = 0; // Zähler für die aktuelle Fokus-Session zurücksetzen
            currentFocusSessionStartTime = null;

            // Icon auf PAUSE zurücksetzen, da der Timer noch nicht läuft
            if (pausePlayIconPath) {
                pausePlayIconPath.setAttribute('d', pauseIconPath);
            }
        });
    }

    if (startTimerButton) {
        startTimerButton.addEventListener("click", () => {
            if (!currentUserUid) {
                showMessage("Bitte melde dich zuerst an, um den Timer zu nutzen.");
                return;
            }
            
            requestNotificationPermission();

            if (pomodoroSettings) pomodoroSettings.classList.add("display-none");
            if (startTimerButton) startTimerButton.classList.add("display-none");
            if (whiteNoise) whiteNoise.style.display = "flex";
            if (timerContainer) timerContainer.style.display = "flex";
            if (flipClock) flipClock.classList.add("flipClockPomodoro");
            
            starteCountdown();
        });
    }

    if (pausePlayIcon) {
        pausePlayIcon.addEventListener("click", () => {
            if (timerStatus === "running") {
                pauseTimer();
            } else if (timerStatus === "paused") {
                resumeTimer();
            } else {
                showMessage("Timer ist noch nicht gestartet.");
            }
        });
    }
    
    // Initialer Aufruf und Intervall für Icon-Farbwechsel
    changePomodoroIconColor();
    setInterval(changePomodoroIconColor, 500); // 500ms ist ein guter Kompromiss

    // White Noise Code bleibt hier
    const whiteNoiseItems = document.querySelectorAll('.white-noise-item');
    whiteNoiseItems.forEach(item => {
        const audio = item.querySelector('.white-noise-audio');
        const playPauseBtn = item.querySelector('.playPauseBtn');
        const volumeSlider = item.querySelector('.volumeSlider');
        const volumeValueSpan = item.querySelector('.volumeValue');

        let isPlaying = false;

        if (playPauseBtn) { // Sicherstellen, dass der Button existiert
            playPauseBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playPauseBtn.style.backgroundColor = 'var(--color-accent)';
                    playPauseBtn.style.color = 'var(--color-sec)';
                } else {
                    audio.play();
                    playPauseBtn.style.backgroundColor = 'var(--color-sec)';
                    playPauseBtn.style.color = 'var(--color-main)';
                }
                isPlaying = !isPlaying;
                // Text des Buttons aktualisieren (optional, je nach Design)
                // playPauseBtn.textContent = isPlaying ? 'Pause' : 'Play'; 
            });
        }

        if (volumeSlider) { // Sicherstellen, dass der Slider existiert
            volumeSlider.addEventListener('input', () => {
                audio.volume = parseFloat(volumeSlider.value);
                if (volumeValueSpan) volumeValueSpan.textContent = `${Math.round(audio.volume * 100)}%`;
            });
        }

        if (audio && audio.volume !== undefined && volumeValueSpan && volumeSlider) {
            volumeValueSpan.textContent = `${Math.round(audio.volume * 100)}%`;
            volumeSlider.value = audio.volume;
        } else if (volumeValueSpan && volumeSlider) { // Fallback, falls audio noch nicht bereit ist
            volumeValueSpan.textContent = '100%';
            volumeSlider.value = 1;
        }

        audio.addEventListener('ended', () => {
            isPlaying = false;
            if (playPauseBtn) {
                playPauseBtn.style.backgroundColor = 'var(--color-accent)';
                playPauseBtn.style.color = 'var(--color-sec)';
                // playPauseBtn.textContent = 'Play';
            }
            audio.currentTime = 0;
        });

        audio.addEventListener('canplaythrough', () => {
            if (!audio.paused && isPlaying) { // Prüfe isPlaying, um nicht sofort zu starten
                if (playPauseBtn) {
                    playPauseBtn.style.backgroundColor = 'var(--color-sec)';
                    playPauseBtn.style.color = 'var(--color-main)';
                    // playPauseBtn.textContent = 'Pause';
                }
            }
        });
    });

    // Event Listener zum Hinzufügen eines neuen Fachs (verschoben aus dem globalen Bereich)
    if (addSubjectButton) {
        addSubjectButton.addEventListener("click", async () => {
            if (!currentSemesterKey) {
                showMessage("Bitte wähle zuerst ein Semester aus.");
                return;
            }

            if (!currentUserUid) {
                showMessage("Benutzer ist nicht angemeldet.");
                return;
            }

            const semesterRef = getUserSemesterRef(currentSemesterKey);
            let semesterNameForPrompt = "ausgewähltem Semester"; // Fallback
            try {
                const snapshot = await get(semesterRef);
                const semesterData = snapshot.val();
                if (semesterData && (semesterData.name || semesterData.semesterNumber)) {
                    semesterNameForPrompt = semesterData.name || `Semester ${semesterData.semesterNumber}`;
                }
            } catch (error) {
                // console.error("Fehler beim Abrufen des Semester-Namens für den Prompt:", error);
            }

            const subjectName = prompt(`Bitte gib den Namen des Fachs für ${semesterNameForPrompt} ein:`);
            const userSemesterRef = getUserSemesterRef();
            if (userSemesterRef && subjectName && subjectName.trim() !== "") {
                const newSubjectRef = push(userSemesterRef);
                const subjectId = newSubjectRef.key;
                set(newSubjectRef, { name: subjectName, grades: {}, average: '0' });
            }
        });
    }

    // Event Listener zum Hinzufügen eines neuen Semesters (verschoben aus dem globalen Bereich)
    if (addSemesterButton) {
        addSemesterButton.addEventListener("click", async () => {
            if (!currentUserUid) {
                showMessage("Bitte melde dich zuerst an, um Semester hinzuzufügen.");
                return;
            }

            const userSemestersRef = createUserSemestersRef();
            if (userSemestersRef) {
                try {
                    const snapshot = await get(userSemestersRef);
                    const existingSemesters = snapshot.val();
                    let nextSemesterNumber = 1;
                    if (existingSemesters) {
                        const semesterNumbers = Object.values(existingSemesters)
                                                         .map(sem => sem.semesterNumber)
                                                         .filter(num => typeof num === 'number');
                        if (semesterNumbers.length > 0) {
                            nextSemesterNumber = Math.max(...semesterNumbers) + 1;
                        }
                    }
                    
                    const newSemesterName = `Semester ${nextSemesterNumber}`;

                    push(userSemestersRef, {
                        name: newSemesterName,
                        semesterNumber: nextSemesterNumber
                    }).then((newSemesterRef) => {
                        // console.log("Neues Semester hinzugefügt mit Schlüssel:", newSemesterRef.key, "und Name:", newSemesterName, "Nummer:", nextSemesterNumber);
                    }).catch(error => {
                        // console.error("Fehler beim Hinzufügen des Semesters:", error);
                        showMessage("Fehler beim Hinzufügen des Semesters.");
                    });
                } catch (error) {
                    // console.error("Fehler beim Abrufen der Semesterdaten:", error);
                    showMessage("Fehler beim Laden der Semesterdaten.");
                }
            }
        });
    }

}); // ENDE DOMContentLoaded

// Beobachtet den Authentifizierungsstatus des Benutzers (einmal für die gesamte App)
// Dieser Block bleibt außerhalb des DOMContentLoaded, da er global lauschen muss.
onAuthStateChanged(auth, (user) => {
    // console.log("onAuthStateChanged ausgelöst. Benutzer:", user);
    if (user) {
        currentUserUid = user.uid;
        // console.log("Benutzer ist angemeldet. currentUserUid:", currentUserUid);
        loadUserSemesters(); // Lädt die Semester-Buttons beim Anmelden
        // Optional: Hier den Start-Button aktivieren, wenn er vorher deaktiviert war
        if (startTimerButton) { // Prüfen, ob schon geladen
            startTimerButton.removeAttribute("disabled");
            startTimerButton.textContent = "Starten";
        }
    } else {
        currentUserUid = null;
        // console.log("Benutzer ist abgemeldet. currentUserUid:", currentUserUid);
        // Sicherstellen, dass diese Elemente existieren, bevor darauf zugegriffen wird
        if (mainSemester) mainSemester.innerHTML = '';
        if (semesterOverview) semesterOverview.innerHTML = '';
        currentSemesterKey = null;
        // Optional: Start-Button deaktivieren
        if (startTimerButton) { // Prüfen, ob schon geladen
            startTimerButton.setAttribute("disabled", "true");
            startTimerButton.textContent = "Bitte anmelden...";
        }
    }
});

// Optional: Listener für das Schliessen des Browsers, um Fokuszeit nicht zu speichern (wenn unterbrochen)
window.addEventListener('beforeunload', () => {
    if (aktuellerTimerZustand === "fokus" && focusedTimeInSecondsThisSession > 0 && timerStatus === "running") {
        // console.log("Benutzer verlässt die Seite während einer Fokus-Session. Zeit wird NICHT gespeichert.");
        // Hier könntest du optional eine Bestätigung verlangen
        // return "Du hast eine laufende Fokus-Session. Möchtest du wirklich verlassen?";
    }
});