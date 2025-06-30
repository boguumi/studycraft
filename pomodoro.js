// pomodoro.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- Firebase Konfiguration und Initialisierung ---
import firebaseConfig from './database/firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// --- Globale Zustandsvariablen ---
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
let currentSemesterKey = null;

const pauseIconPath = "M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Z";
const playIconPath = "M320-200v-560l440 280-440 280Z";

// --- DOM-Element Referenzen (werden in DOMContentLoaded zugewiesen) ---
const DOM = {};

// --- Hilfsfunktionen ---
function showMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.classList.add("messageBox");
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    setTimeout(() => {
        document.body.removeChild(messageBox);
    }, 3000);
}

function getUserSemesterRef(semesterKey = currentSemesterKey) {
    if (!currentUserUid) {
        return null;
    }
    if (!semesterKey) {
        return null;
    }
    return ref(database, `users/${currentUserUid}/semesters/${semesterKey}`);
}

function createUserSemestersRef() {
    if (!currentUserUid) {
        return null;
    }
    return ref(database, `users/${currentUserUid}/semesters`);
}

// --- Pomodoro Funktionen ---
function updateBrakeTimes() {
    if (!DOM.zahlFokuszeit || !DOM.zahlSmallBrake || !DOM.zahlBigBrake) return;

    const fokusZeit = parseInt(DOM.zahlFokuszeit.textContent);
    const smallBrakeValue = Math.round(fokusZeit / 5);
    const bigBrakeValue = fokusZeit / 2;
    DOM.zahlSmallBrake.textContent = smallBrakeValue;
    DOM.zahlBigBrake.textContent = bigBrakeValue.toFixed(1);
}

function starteCountdown() {
    let dauerInMinuten;

    if (aktuellerTimerZustand === "fokus") {
        dauerInMinuten = parseInt(DOM.zahlFokuszeit.textContent);
        if (DOM.whatsNowText) DOM.whatsNowText.textContent = "Aktuell: Fokus";
        
        if (timerStatus === "stopped") {
            currentFocusSessionStartTime = Date.now();
            focusedTimeInSecondsThisSession = 0;
        }
        
    } else if (aktuellerTimerZustand === "kurzePause") {
        dauerInMinuten = parseInt(DOM.zahlSmallBrake.textContent);
        if (DOM.whatsNowText) DOM.whatsNowText.textContent = "Aktuell: Kurze Pause";
    } else if (aktuellerTimerZustand === "langePause") {
        dauerInMinuten = parseFloat(DOM.zahlBigBrake.textContent);
        if (DOM.whatsNowText) DOM.whatsNowText.textContent = "Aktuell: Lange Pause";
    }

    if (isNaN(dauerInMinuten) || dauerInMinuten <= 0) {
        if (DOM.countdownAnzeige) DOM.countdownAnzeige.textContent = "Ungültige Zeit!";
        if (DOM.whatsNowText) DOM.whatsNowText.textContent = "";
        return;
    }

    if (timerStatus === "stopped") {
        gesamtZeitInSekunden = dauerInMinuten * 60;
        verbleibendeZeitInSekunden = gesamtZeitInSekunden;
    } 

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    anzeigeAktualisieren(verbleibendeZeitInSekunden);
    updateProgressBar(verbleibendeZeitInSekunden, gesamtZeitInSekunden);

    timerStatus = "running";
    if (DOM.pausePlayIconPath) {
        DOM.pausePlayIconPath.setAttribute('d', pauseIconPath);
    }

    countdownInterval = setInterval(() => {
        if (verbleibendeZeitInSekunden > 0) {
            verbleibendeZeitInSekunden--;
            anzeigeAktualisieren(verbleibendeZeitInSekunden);
            updateProgressBar(verbleibendeZeitInSekunden, gesamtZeitInSekunden);

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
    if (!DOM.countdownAnzeige) return;
    const minuten = Math.floor(zeitInSekunden / 60);
    const sekunden = zeitInSekunden % 60;
    const formatierteZeit = `${minuten.toString().padStart(2, '0')}:${sekunden.toString().padStart(2, '0')}`;
    DOM.countdownAnzeige.textContent = formatierteZeit;
}

function updateProgressBar(aktuelleZeitInSekunden, gesamtZeitInSekunden) {
    if (!DOM.progressBarFill) return;
    if (gesamtZeitInSekunden > 0) {
        const prozentualerFortschritt = ((gesamtZeitInSekunden - aktuelleZeitInSekunden) / gesamtZeitInSekunden) * 100;
        DOM.progressBarFill.style.width = `${prozentualerFortschritt}%`;
    } else {
        DOM.progressBarFill.style.width = "0%";
    }
}

function pauseTimer() {
    if (timerStatus === "running") {
        clearInterval(countdownInterval);
        timerStatus = "paused";
        pauseStartTime = Date.now();

        if (DOM.pausePlayIconPath) {
            DOM.pausePlayIconPath.setAttribute('d', playIconPath);
        }
        showMessage("Timer pausiert");
    }
}

function resumeTimer() {
    if (timerStatus === "paused") {
        starteCountdown();
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
        saveFocusedTime(focusedTimeInSecondsThisSession); // Save focused time when session ends naturally

        if (fokusEinheiten % 4 === 0) {
            aktuellerTimerZustand = "langePause";
            DOM.whatsNowText.textContent = "Lange Pause startet...";
        } else {
            aktuellerTimerZustand = "kurzePause";
            DOM.whatsNowText.textContent = "Kurze Pause startet...";
        }
    } else if (aktuellerTimerZustand === "kurzePause") {
        notificationBody = "Deine kurze Pause ist beendet! Zeit für die nächste Fokuszeit!";
        aktuellerTimerZustand = "fokus";
        DOM.whatsNowText.textContent = "Fokus startet...";
    } else if (aktuellerTimerZustand === "langePause") {
        notificationBody = "Deine lange Pause ist beendet! Zurück zur Arbeit!";
        aktuellerTimerZustand = "fokus";
        DOM.whatsNowText.textContent = "Fokus startet...";
        fokusEinheiten = 0;
    }

    showNotification(notificationTitle, notificationBody, notificationIcon);
    
    timerStatus = "stopped";
    if (DOM.pausePlayIconPath) {
        DOM.pausePlayIconPath.setAttribute('d', pauseIconPath);
    }
    
    starteCountdown();
}

function saveFocusedTime(timeInSeconds) {
    if (!currentUserUid) {
        return;
    }

    if (timeInSeconds <= 0) {
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
        showMessage("Fehler beim Speichern der Fokuszeit.");
    });
}

function changePomodoroIconColor() {
    if (DOM.pomodoroIconBook && DOM.pomodoroIconCup1 && DOM.pomodoroIconCup2) {
        if (aktuellerTimerZustand === "kurzePause" || aktuellerTimerZustand === "langePause"){
            DOM.pomodoroIconBook.classList.add("pomodoro-icon-gray");
            DOM.pomodoroIconCup1.classList.remove("pomodoro-icon-gray");
            DOM.pomodoroIconCup2.classList.remove("pomodoro-icon-gray");
        } else if (aktuellerTimerZustand === "fokus"){
            DOM.pomodoroIconBook.classList.remove("pomodoro-icon-gray");
            DOM.pomodoroIconCup1.classList.add("pomodoro-icon-gray");
            DOM.pomodoroIconCup2.classList.add("pomodoro-icon-gray");
        }
    }
}

// --- Desktop Benachrichtigungen ---
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showMessage("Dein Browser unterstützt leider keine Desktop-Benachrichtigungen.");
        return;
    }

    if (Notification.permission === "granted") {
        return;
    }

    if (Notification.permission === "denied") {
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
                updatedNameElement.addEventListener("click", () => updatedNameElement.click());
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
        onValue(userSemesterRef, (snapshot) => {
            const data = snapshot.val();
            if (DOM.mainSemester) DOM.mainSemester.innerHTML = '';

            let subjectsFound = false;

            if (data) {
                for (const subjectId in data) {
                    if (Object.hasOwnProperty.call(data, subjectId)) {
                        const subjectData = data[subjectId];
                        if (subjectId !== 'name' && subjectId !== 'semesterNumber' &&
                            typeof subjectData === 'object' && subjectData !== null &&
                            (subjectData.name !== undefined || subjectData.grades !== undefined || subjectData.average !== undefined)) {
                            
                            const subjectElement = createSubjectElement(subjectId, subjectData);
                            if (DOM.mainSemester) DOM.mainSemester.appendChild(subjectElement);
                            subjectsFound = true;
                        }
                    }
                }
            }

            if (!subjectsFound && DOM.mainSemester) {
                DOM.mainSemester.innerHTML = '<p>Noch keine Fächer in diesem Semester hinzugefügt.</p>';
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
        if (DOM.semesterOverview) {
            DOM.semesterOverview.querySelectorAll('.semester-button').forEach(btn => btn.classList.remove('active'));
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
            if (DOM.semesterOverview) DOM.semesterOverview.innerHTML = '';
            if (data) {
                let firstSemesterKey = null;
                for (const semesterKey in data) {
                    if (Object.hasOwnProperty.call(data, semesterKey)) {
                        const semesterData = data[semesterKey];
                        const button = createSemesterButton(semesterKey, semesterData);
                        if (DOM.semesterOverview) DOM.semesterOverview.appendChild(button);
                        if (!firstSemesterKey) {
                            firstSemesterKey = semesterKey;
                        }
                    }
                }
                if (firstSemesterKey && !currentSemesterKey && Object.keys(data).length > 0) {
                    const firstButton = DOM.semesterOverview ? DOM.semesterOverview.querySelector(`.semester-button[data-semester-key="${firstSemesterKey}"]`) : null;
                    if (firstButton) {
                        firstButton.click();
                    }
                } else if (currentSemesterKey && data[currentSemesterKey]) {
                    const activeButton = DOM.semesterOverview ? DOM.semesterOverview.querySelector(`.semester-button[data-semester-key="${currentSemesterKey}"]`) : null;
                    if (activeButton) {
                        activeButton.classList.add('active');
                    } else if (Object.keys(data).length > 0) {
                        const firstButton = DOM.semesterOverview ? DOM.semesterOverview.querySelector('.semester-button') : null;
                        if (firstButton) {
                            firstButton.click();
                        }
                    }
                }
            } else {
                if (DOM.mainSemester) DOM.mainSemester.innerHTML = '<p>Noch keine Semester hinzugefügt.</p>';
            }
        });
    }
}

/**
 * Setzt den Pomodoro-Timer auf den Anfangszustand zurück.
 * Wenn eine Fokuszeit-Sitzung aktiv war und Fokuszeit gesammelt wurde,
 * wird diese vor dem Zurücksetzen gespeichert.
 */
function resetPomodoroTimer() {
    // Save focused time if the timer was in a focus session and had accumulated time
    if (aktuellerTimerZustand === "fokus" && focusedTimeInSecondsThisSession > 0) {
        saveFocusedTime(focusedTimeInSecondsThisSession);
    }

    if (DOM.zahlFokuszeit) DOM.zahlFokuszeit.textContent = 25;
    updateBrakeTimes();
    aktuellerTimerZustand = "fokus";
    fokusEinheiten = 0;
    if (DOM.countdownAnzeige) DOM.countdownAnzeige.textContent = "25:00";
    if (DOM.progressBarFill) DOM.progressBarFill.style.width = "0%";
    if (DOM.whatsNowText) DOM.whatsNowText.textContent = "";
    if (DOM.pomodoroSettings) DOM.pomodoroSettings.classList.remove("display-none");
    if (DOM.startTimerButton) {
        DOM.startTimerButton.classList.remove("display-none");
        DOM.startTimerButton.removeAttribute("disabled");
        DOM.startTimerButton.textContent = "Starten";
    }
    if (DOM.timerContainer) DOM.timerContainer.style.display = "none";
    clearInterval(countdownInterval);
    
    timerStatus = "stopped";
    verbleibendeZeitInSekunden = 0;
    gesamtZeitInSekunden = 0;
    pauseStartTime = null;
    focusedTimeInSecondsThisSession = 0; // Reset accumulated focus time for the session
    currentFocusSessionStartTime = null;

    if (DOM.pausePlayIconPath) {
        DOM.pausePlayIconPath.setAttribute('d', pauseIconPath);
    }
    showMessage("Timer wurde zurückgesetzt.");
    if (DOM.whiteNoise) DOM.whiteNoise.style.display = "none";
}

// --- Event Listener Initialisierung ---
function initEventListeners() {
    if (DOM.fokusPlus) {
        DOM.fokusPlus.addEventListener("click", () => {
            if (DOM.zahlFokuszeit) DOM.zahlFokuszeit.textContent = parseInt(DOM.zahlFokuszeit.textContent) + 5;
            updateBrakeTimes();
        });
    }

    if (DOM.fokusMinus) {
        DOM.fokusMinus.addEventListener("click", () => {
            if (!DOM.zahlFokuszeit) return;
            const aktuelleFokusZeit = parseInt(DOM.zahlFokuszeit.textContent);
            if (aktuelleFokusZeit - 5 >= 5) {
                DOM.zahlFokuszeit.textContent = aktuelleFokusZeit - 5;
                updateBrakeTimes();
            } else {
                showMessage("Die Fokuszeit muss mindestens 5 Minuten betragen");
            }
        });
    }

    // Beide Reset-Buttons verwenden die gleiche Funktion
    if (DOM.resetPomodoro) {
        DOM.resetPomodoro.addEventListener("click", resetPomodoroTimer);
    }
    if (DOM.pomodoroResetTimerIcon) {
        DOM.pomodoroResetTimerIcon.addEventListener("click", resetPomodoroTimer);
    }

    if (DOM.startTimerButton) {
        DOM.startTimerButton.addEventListener("click", () => {
            if (!currentUserUid) {
                showMessage("Bitte melde dich zuerst an, um den Timer zu nutzen.");
                return;
            }
            
            requestNotificationPermission();

            if (DOM.pomodoroSettings) DOM.pomodoroSettings.classList.add("display-none");
            if (DOM.startTimerButton) DOM.startTimerButton.classList.add("display-none");
            if (DOM.whiteNoise) DOM.whiteNoise.style.display = "flex";
            if (DOM.timerContainer) DOM.timerContainer.style.display = "flex";
            if (DOM.flipClock) DOM.flipClock.classList.add("flipClockPomodoro");
            
            starteCountdown();
        });
    }

    if (DOM.pausePlayIcon) {
        DOM.pausePlayIcon.addEventListener("click", () => {
            if (timerStatus === "running") {
                pauseTimer();
            } else if (timerStatus === "paused") {
                resumeTimer();
            } else {
                showMessage("Timer ist noch nicht gestartet.");
            }
        });
    }
    
    // White Noise Event Listener
    const whiteNoiseItems = document.querySelectorAll('.white-noise-item');
    whiteNoiseItems.forEach(item => {
        const audio = item.querySelector('.white-noise-audio');
        const playPauseBtn = item.querySelector('.playPauseBtn');
        const volumeSlider = item.querySelector('.volumeSlider');
        const volumeValueSpan = item.querySelector('.volumeValue');

        let isPlaying = false;

        if (playPauseBtn) {
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
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', () => {
                audio.volume = parseFloat(volumeSlider.value);
                if (volumeValueSpan) volumeValueSpan.textContent = `${Math.round(audio.volume * 100)}%`;
            });
        }

        if (audio && audio.volume !== undefined && volumeValueSpan && volumeSlider) {
            volumeValueSpan.textContent = `${Math.round(audio.volume * 100)}%`;
            volumeSlider.value = audio.volume;
        } else if (volumeValueSpan && volumeSlider) {
            volumeValueSpan.textContent = '100%';
            volumeSlider.value = 1;
        }

        audio.addEventListener('ended', () => {
            isPlaying = false;
            if (playPauseBtn) {
                playPauseBtn.style.backgroundColor = 'var(--color-accent)';
                playPauseBtn.style.color = 'var(--color-sec)';
            }
            audio.currentTime = 0;
        });

        audio.addEventListener('canplaythrough', () => {
            if (!audio.paused && isPlaying) {
                if (playPauseBtn) {
                    playPauseBtn.style.backgroundColor = 'var(--color-sec)';
                    playPauseBtn.style.color = 'var(--color-main)';
                }
            }
        });
    });

    // Event Listener zum Hinzufügen eines neuen Fachs
    if (DOM.addSubjectButton) {
        DOM.addSubjectButton.addEventListener("click", async () => {
            if (!currentSemesterKey) {
                showMessage("Bitte wähle zuerst ein Semester aus.");
                return;
            }

            if (!currentUserUid) {
                showMessage("Benutzer ist nicht angemeldet.");
                return;
            }

            const semesterRef = getUserSemesterRef(currentSemesterKey);
            let semesterNameForPrompt = "ausgewähltem Semester";
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

    // Event Listener zum Hinzufügen eines neuen Semesters
    if (DOM.addSemesterButton) {
        DOM.addSemesterButton.addEventListener("click", async () => {
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
                        showMessage("Fehler beim Hinzufügen des Semesters.");
                    });
                } catch (error) {
                    showMessage("Fehler beim Laden der Semesterdaten.");
                }
            }
        });
    }
}


// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Zuweisungen ---
    DOM.zahlFokuszeit = document.querySelector(".zahl-fokuszeit");
    DOM.fokusPlus = document.querySelector(".fokuszeitPlus");
    DOM.fokusMinus = document.querySelector(".fokuszeitMinus");
    DOM.zahlSmallBrake = document.querySelector(".zahl-small-pause");
    DOM.zahlBigBrake = document.querySelector(".zahl-big-pause");
    DOM.resetPomodoro = document.querySelector(".reset-pomodoro-button");
    DOM.startTimerButton = document.querySelector(".pomodoro-start-button");
    DOM.timerContainer = document.querySelector(".timer-container");
    DOM.pomodoroSettings = document.querySelector(".pomodoro-settings");
    DOM.countdownAnzeige = document.querySelector(".countdown");
    DOM.progressBarFill = document.querySelector(".progress-bar-fill");
    DOM.whatsNowText = document.querySelector(".whats-now");
    DOM.flipClock = document.querySelector(".flipclock");
    DOM.whiteNoise = document.querySelector(".white-noises");
    DOM.pomodoroIconBook = document.querySelector(".pomodoro-book-path");
    DOM.pomodoroIconCup1 = document.querySelector(".pomodoro-cup-path1");
    DOM.pomodoroIconCup2 = document.querySelector(".pomodoro-cup-path2");

    DOM.pausePlayIcon = document.getElementById("pomodoro-pause-play-icon");
    if (DOM.pausePlayIcon) {
        DOM.pausePlayIconPath = DOM.pausePlayIcon.querySelector('path');
    }
    DOM.pomodoroResetTimerIcon = document.getElementById("pomodoro-reset-icon");

    // Element-Referenzen für Noten/Semester
    DOM.mainSemester = document.querySelector(".main-semester");
    DOM.addSubjectButton = document.getElementById("add-subject-button");
    DOM.addSemesterButton = document.querySelector(".add-Semester");
    DOM.semesterOverview = document.querySelector(".semester-oberview");

    // Sicherstellen, dass die anfänglichen Bremszeiten aktualisiert werden, nachdem DOM geladen ist
    updateBrakeTimes();

    // Event Listener initialisieren
    initEventListeners();
    
    // Initialer Aufruf und Intervall für Icon-Farbwechsel
    changePomodoroIconColor();
    setInterval(changePomodoroIconColor, 500);
});

// Beobachtet den Authentifizierungsstatus des Benutzers (einmal für die gesamte App)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        loadUserSemesters();
        if (DOM.startTimerButton) {
            DOM.startTimerButton.removeAttribute("disabled");
            DOM.startTimerButton.textContent = "Starten";
        }
    } else {
        currentUserUid = null;
        if (DOM.mainSemester) DOM.mainSemester.innerHTML = '';
        if (DOM.semesterOverview) DOM.semesterOverview.innerHTML = '';
        currentSemesterKey = null;
        if (DOM.startTimerButton) {
            DOM.startTimerButton.setAttribute("disabled", "true");
            DOM.startTimerButton.textContent = "Bitte anmelden...";
        }
    }
});

// Optional: Listener für das Schliessen des Browsers, um Fokuszeit nicht zu speichern (wenn unterbrochen)
window.addEventListener('beforeunload', () => {
    if (aktuellerTimerZustand === "fokus" && focusedTimeInSecondsThisSession > 0 && timerStatus === "running") {
        // console.log("Benutzer verlässt die Seite während einer Fokus-Session. Zeit wird NICHT gespeichert.");
    }
});
