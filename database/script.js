import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

console.log("Firebase App initialisiert für:", firebaseConfig.projectId);
console.log("Realtime Database instanziiert mit URL:", firebaseConfig.databaseURL);
console.log("Authentication Service verfügbar.");







const mainSemester = document.querySelector(".main-semester");
const addSubjectButton = document.getElementById("add-subject-button");
const addSemesterButton = document.querySelector(".add-Semester");
const semesterOverview = document.querySelector(".semester-oberview");
let currentUserUid = null;
let currentSemesterKey = null;










// Funktion zur Anzeige benutzerdefinierter Nachrichten anstelle von alert()
function showMessage(message) {
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #333;
        color: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        font-family: 'Inter', sans-serif;
        text-align: center;
    `;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);

    setTimeout(() => {
        document.body.removeChild(messageBox);
    }, 3000); // Nachricht nach 3 Sekunden ausblenden
}

// Gibt die Referenz zum aktuellen Semester des Benutzers zurück
function getUserSemesterRef(semesterKey = currentSemesterKey) {
    if (!currentUserUid) {
        console.error("Benutzer ist nicht angemeldet.");
        return null;
    }
    if (!semesterKey) {
        console.warn("Kein Semester ausgewählt.");
        return null;
    }
    return ref(database, `users/${currentUserUid}/semesters/${semesterKey}`);
}

// Gibt die Referenz zur Semester-Sammlung des Benutzers zurück
function createUserSemestersRef() {
    if (!currentUserUid) {
        console.error("Benutzer ist nicht angemeldet.");
        return null;
    }
    return ref(database, `users/${currentUserUid}/semesters`);
}

// Erstellt ein HTML-Element für ein Fach
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

    // Event Listener zum Bearbeiten des Fachnamens
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
                updatedNameElement.addEventListener("click", () => nameClassElement.click()); // Event Listener erneut anbringen
                newClassDiv.insertBefore(updatedNameElement, newClassDiv.firstChild);
                inputField.replaceWith(updatedNameElement);
                set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectId}/name`), newName);
            } else {
                nameClassElement.textContent = currentName;
                inputField.replaceWith(nameClassElement);
            }
        });
    });

    // Funktion zur Berechnung des Durchschnitts und Speicherung in der Datenbank
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

    // Event Listener zum Hinzufügen neuer Noten
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

    // Event Listener zum Bearbeiten vorhandener Noten
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

// Event Listener zum Hinzufügen eines neuen Fachs
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
        console.error("Fehler beim Abrufen des Semester-Namens für den Prompt:", error);
    }

    const subjectName = prompt(`Bitte gib den Namen des Fachs für ${semesterNameForPrompt} ein:`);
    const userSemesterRef = getUserSemesterRef();
    if (userSemesterRef && subjectName && subjectName.trim() !== "") {
        const newSubjectRef = push(userSemesterRef);
        const subjectId = newSubjectRef.key;
        set(newSubjectRef, { name: subjectName, grades: {}, average: '0' });
    }
});

// Lädt die Daten für das ausgewählte Semester
function loadSemesterData(semesterKey) {
    currentSemesterKey = semesterKey;
    const userSemesterRef = getUserSemesterRef(semesterKey);
    if (userSemesterRef) {
        console.log("loadSemesterData wird ausgeführt für Semester:", semesterKey);
        onValue(userSemesterRef, (snapshot) => {
            const data = snapshot.val();
            console.log("Daten aus Firebase für Semester", semesterKey, ":", data);
            mainSemester.innerHTML = ''; // Vorhandenen Inhalt löschen

            let subjectsFound = false; // Flag, um zu verfolgen, ob Fächer gefunden wurden

            if (data) {
                for (const subjectId in data) {
                    if (Object.hasOwnProperty.call(data, subjectId)) {
                        const subjectData = data[subjectId];
                        console.log(`Prüfe Eintrag ${subjectId}:`, subjectData);

                        // Prüfen, ob es sich um ein gültiges Fach-Objekt handelt (nicht Semester-Metadaten)
                        // Ein Fach sollte ein Objekt sein und nicht 'name' oder 'semesterNumber' heißen
                        // und sollte idealerweise 'name' oder 'grades' Eigenschaften haben
                        if (subjectId !== 'name' && subjectId !== 'semesterNumber' &&
                            typeof subjectData === 'object' && subjectData !== null &&
                            (subjectData.name !== undefined || subjectData.grades !== undefined || subjectData.average !== undefined)) {
                            
                            console.log("Verarbeite Fach:", subjectId, subjectData);
                            const subjectElement = createSubjectElement(subjectId, subjectData);
                            mainSemester.appendChild(subjectElement);
                            subjectsFound = true; // Markieren, dass ein Fach gefunden wurde
                        } else {
                            console.log("Überspringe Semester-Metadaten oder leeren/ungültigen Eintrag:", subjectId, subjectData);
                        }
                    }
                }
            }

            // Wenn keine Fächer nach der Iteration gefunden wurden, eine Meldung anzeigen
            if (!subjectsFound) {
                mainSemester.innerHTML = '<p>Noch keine Fächer in diesem Semester hinzugefügt.</p>';
            }
        });
    }
}

// Erstellt einen Button für ein Semester
function createSemesterButton(semesterKey, semesterData) {
    const semesterButton = document.createElement("button");
    // Der Button-Text basiert jetzt immer auf der automatisch generierten Nummer, falls kein 'name' Feld existiert
    // Oder auf dem explizit gesetzten 'name' Feld (z.B. "Semester 1")
    semesterButton.textContent = semesterData.name || `Semester ${semesterData.semesterNumber || ''}`;
    semesterButton.classList.add("semester-button");
    semesterButton.dataset.semesterKey = semesterKey;
    semesterButton.addEventListener("click", () => {
        semesterOverview.querySelectorAll('.semester-button').forEach(btn => btn.classList.remove('active'));
        semesterButton.classList.add('active');
        loadSemesterData(semesterKey);
    });
    return semesterButton;
}

// Lädt alle Semester des Benutzers und erstellt die Buttons
function loadUserSemesters() {
    const userSemestersRef = createUserSemestersRef();
    if (userSemestersRef) {
        onValue(userSemestersRef, (snapshot) => {
            const data = snapshot.val();
            semesterOverview.innerHTML = '';
            if (data) {
                let firstSemesterKey = null;
                for (const semesterKey in data) {
                    if (Object.hasOwnProperty.call(data, semesterKey)) {
                        const semesterData = data[semesterKey];
                        const button = createSemesterButton(semesterKey, semesterData);
                        semesterOverview.appendChild(button);
                        if (!firstSemesterKey) {
                            firstSemesterKey = semesterKey;
                        }
                    }
                }
                if (firstSemesterKey && !currentSemesterKey && Object.keys(data).length > 0) {
                    const firstButton = semesterOverview.querySelector(`.semester-button[data-semester-key="${firstSemesterKey}"]`);
                    if (firstButton) {
                        firstButton.click();
                    }
                } else if (currentSemesterKey && data[currentSemesterKey]) {
                    const activeButton = semesterOverview.querySelector(`.semester-button[data-semester-key="${currentSemesterKey}"]`);
                    if (activeButton) {
                        activeButton.classList.add('active');
                    } else if (Object.keys(data).length > 0) {
                        const firstButton = semesterOverview.querySelector('.semester-button');
                        if (firstButton) {
                            firstButton.click();
                        }
                    }
                }
            } else {
                mainSemester.innerHTML = '<p>Noch keine Semester hinzugefügt.</p>';
            }
        });
    }
}

// Event Listener zum Hinzufügen eines neuen Semesters mit automatischer Nummerierung
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
            
            // Der Semester-Name wird jetzt automatisch generiert (z.B. "Semester 1")
            const newSemesterName = `Semester ${nextSemesterNumber}`;

            push(userSemestersRef, {
                name: newSemesterName, // Der automatisch generierte Name wird gesetzt
                semesterNumber: nextSemesterNumber // Die fortlaufende Nummer
            }).then((newSemesterRef) => {
                console.log("Neues Semester hinzugefügt mit Schlüssel:", newSemesterRef.key, "und Name:", newSemesterName, "Nummer:", nextSemesterNumber);
            }).catch(error => {
                console.error("Fehler beim Hinzufügen des Semesters:", error);
                showMessage("Fehler beim Hinzufügen des Semesters.");
            });
        } catch (error) {
            console.error("Fehler beim Abrufen der Semesterdaten:", error);
            showMessage("Fehler beim Laden der Semesterdaten.");
        }
    }
});

// Beobachtet den Authentifizierungsstatus des Benutzers
onAuthStateChanged(auth, (user) => {
    console.log("onAuthStateChanged ausgelöst. Benutzer:", user);
    if (user) {
        currentUserUid = user.uid;
        console.log("Benutzer ist angemeldet. currentUserUid:", currentUserUid);
        loadUserSemesters(); // Lädt die Semester-Buttons beim Anmelden
    } else {
        currentUserUid = null;
        console.log("Benutzer ist abgemeldet. currentUserUid:", currentUserUid);
        mainSemester.innerHTML = '';
        semesterOverview.innerHTML = '';
        currentSemesterKey = null;
    }
});
