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

// Funktion zur Anzeige benutzerdefinierter Nachrichten
// Verwendet die Klasse "messageBox" für das Styling
function showMessage(message, type = 'info') { // 'type' kann 'info', 'success', 'error', 'warning' sein
    const messageBox = document.createElement('div');
    messageBox.textContent = message;

    // Füge die bereits vorhandene Klasse "messageBox" hinzu
    messageBox.classList.add('messageBox');
    // Füge den Typ als weitere Klasse hinzu (z.B. 'success', 'error' für spezifisches Styling)
    messageBox.classList.add(type);

    document.body.appendChild(messageBox);

    // Eine kleine Verzögerung vor dem Hinzufügen der 'show'-Klasse für die Animation
    // Dies ist wichtig, wenn deine CSS-Transition 'opacity' von 0 auf 1 animieren soll.
    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);

    // Nachricht nach 3 Sekunden ausblenden
    setTimeout(() => {
        messageBox.classList.remove('show'); // Animation zum Ausblenden starten
        // Nach der Ausblendanimation das Element entfernen
        messageBox.addEventListener('transitionend', () => {
            // Stelle sicher, dass das Element tatsächlich ausgeblendet ist, bevor es entfernt wird
            if (!messageBox.classList.contains('show')) {
                document.body.removeChild(messageBox);
            }
        }, { once: true }); // Event Listener nur einmal ausführen
    }, 3000);
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
                const gradeEntry = subjectData.grades[gradeKey]; // Ist jetzt ein Objekt {value, factor}
                // Sicherstellen, dass gradeEntry ein Objekt ist und value/factor hat
                const gradeValue = parseFloat(gradeEntry.value || 0).toFixed(1);
                const gradeFactor = parseFloat(gradeEntry.factor || 1).toFixed(1); // Standardfaktor 1, falls nicht vorhanden
                gradesHTML += `<p class="new-grade" data-grade-key="${gradeKey}" data-grade-factor="${gradeFactor}">${gradeValue} (x${gradeFactor})</p>`;
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
    // Noten-Elemente beim Erstellen des Faches finden und Event Listener anbringen
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
                // Wichtig: Event Listener für Klick auf den Namen erneut anbringen!
                updatedNameElement.addEventListener("click", () => nameClassElement.click());
                inputField.replaceWith(updatedNameElement);
                set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectId}/name`), newName);
            } else {
                // Wenn leer, den ursprünglichen Namen wiederherstellen
                inputField.replaceWith(nameClassElement);
            }
        });

        inputField.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                inputField.blur(); // Löst den blur-Event aus
            }
        });
    });

    // Funktion zur Berechnung des Durchschnitts und Speicherung in der Datenbank
    function calculateAverage(container, currentSubjectId) {
        const gradeElements = container.querySelectorAll('.new-grade');
        let totalWeighted = 0;
        let totalFactors = 0;
        const grades = {}; // Zum Speichern der Notenobjekte {value, factor}

        gradeElements.forEach((gradeElement) => {
            const gradeValue = parseFloat(gradeElement.textContent.split(' ')[0]); // Extrahiere nur den Notenwert
            const gradeFactor = parseFloat(gradeElement.dataset.gradeFactor || 1); // Extrahiere den Faktor aus data-attribute
            const gradeKey = gradeElement.dataset.gradeKey;

            if (!isNaN(gradeValue) && !isNaN(gradeFactor)) {
                totalWeighted += gradeValue * gradeFactor;
                totalFactors += gradeFactor;
                grades[gradeKey] = { value: gradeValue, factor: gradeFactor };
            }
        });

        if (totalFactors > 0) {
            const average = totalWeighted / totalFactors;
            averageDisplay.textContent = `Durchschnitt: ${average.toFixed(2)}`;
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/average`), average.toFixed(2));
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/grades`), grades);
        } else {
            averageDisplay.textContent = `Durchschnitt: 0`;
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/average`), '0');
            // Wenn keine Noten vorhanden sind, stelle sicher, dass 'grades' auch null ist (löscht den Knoten)
            set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${currentSubjectId}/grades`), null);
        }
    }


    // Event Listener zum Hinzufügen neuer Noten
    addGradeButton.addEventListener("click", () => {
        // Überprüfen, ob bereits Eingabefelder aktiv sind
        if (newClassDiv.querySelector('.grade-input-container')) {
            showMessage("Bitte beende die aktuelle Eingabe zuerst.", "warning");
            return;
        }

        const inputContainer = document.createElement("div");
        inputContainer.style.cssText = 'display: flex; gap: 5px; margin-bottom: 10px;'; // CSS für Container
        inputContainer.classList.add('grade-input-container'); // Füge eine Klasse für Styling hinzu

        const noteInput = document.createElement("input");
        noteInput.type = "number"; // Verwende 'number' für Noten
        noteInput.placeholder = "Note";
        noteInput.value = "0.0";
        noteInput.classList.add("input-grade");
        noteInput.setAttribute("min", "1");
        noteInput.setAttribute("max", "6");
        noteInput.setAttribute("step", "0.1"); // Ermöglicht Dezimalzahlen

        const factorInput = document.createElement("input");
        factorInput.type = "number"; // Verwende 'number' für Faktoren
        factorInput.placeholder = "Faktor";
        factorInput.value = "1.0"; // Standardfaktor
        factorInput.classList.add("input-grade"); // <--- HIER GEÄNDERT: Gleiche Klasse wie Note
        factorInput.setAttribute("min", "0.1"); // Mindestfaktor, z.B. 0.5
        factorInput.setAttribute("step", "0.1"); // Ermöglicht Dezimalzahlen

        // Hinzufügen eines Speichern-Buttons
        const saveButton = document.createElement("button");
        saveButton.textContent = "✓"; // Häkchen-Symbol
        saveButton.classList.add("save-grade-button");
        saveButton.style.cssText = 'background-color: #4CAF50; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;';


        inputContainer.appendChild(noteInput);
        inputContainer.appendChild(factorInput);
        inputContainer.appendChild(saveButton); // Speichern-Button zum Container hinzufügen
        newClassDiv.insertBefore(inputContainer, addGradeButton);

        noteInput.focus(); // Fokus auf das erste Eingabefeld setzen

        const saveNewGrade = () => {
            let gradeValue = parseFloat(noteInput.value);
            let gradeFactor = parseFloat(factorInput.value);

            // Validierung für Note
            if (isNaN(gradeValue) || gradeValue < 1) {
                gradeValue = 1;
            } else if (gradeValue > 6) {
                gradeValue = 6;
            }

            // Validierung für Faktor
            if (isNaN(gradeFactor) || gradeFactor <= 0) {
                gradeFactor = 1;
            }

            const newGradeElement = document.createElement("p");
            newGradeElement.classList.add("new-grade");
            newGradeElement.textContent = `${gradeValue.toFixed(1)} (x${gradeFactor.toFixed(1)})`;
            newGradeElement.dataset.gradeFactor = gradeFactor.toFixed(1); // Speichern als Data-Attribut

            const newGradeRef = push(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectId}/grades`));
            newGradeElement.dataset.gradeKey = newGradeRef.key;

            newClassDiv.insertBefore(newGradeElement, inputContainer);
            newClassDiv.removeChild(inputContainer);

            // Speichere Note und Faktor als Objekt
            set(newGradeRef, { value: gradeValue, factor: gradeFactor });
            calculateAverage(newClassDiv, subjectId);

            // Event Listener für die neu hinzugefügte Note anbringen (für Bearbeitung)
            attachGradeEditListener(newGradeElement, subjectId);
            showMessage("Note hinzugefügt!", "success");
        };

        // Event Listener für den Speichern-Button
        saveButton.addEventListener("click", saveNewGrade);

        // Enter-Taste Listener für beide Felder
        noteInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                saveNewGrade();
            }
        });
        factorInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                saveNewGrade();
            }
        });

        // NEU: Blur-Event-Handling mit setTimeout zur Vermeidung von sofortigem Verschwinden
        let blurTimeout;
        const handleBlur = () => {
            blurTimeout = setTimeout(() => {
                // Prüfe, ob der Fokus *nicht* mehr innerhalb des Containers ist
                if (!inputContainer.contains(document.activeElement)) {
                    // Wenn der Benutzer nichts eingegeben hat und den Fokus verlässt, einfach entfernen
                    if (noteInput.value.trim() === "" && factorInput.value.trim() === "") {
                        newClassDiv.removeChild(inputContainer);
                    } else if (!isNaN(parseFloat(noteInput.value)) && !isNaN(parseFloat(factorInput.value))) {
                        saveNewGrade();
                    } else {
                        // Wenn ungültige Eingabe, einfach den Container entfernen
                        newClassDiv.removeChild(inputContainer);
                    }
                }
            }, 100); // Kurze Verzögerung, um den Wechsel zwischen Feldern zu ermöglichen
        };

        noteInput.addEventListener("blur", handleBlur);
        factorInput.addEventListener("blur", handleBlur);

        // Optional: Fokusmanagement, wenn man von einem Feld zum anderen wechselt
        noteInput.addEventListener("focus", () => clearTimeout(blurTimeout));
        factorInput.addEventListener("focus", () => clearTimeout(blurTimeout));
    });

    // Funktion zum Anbringen des Event Listeners für die Notenbearbeitung
    function attachGradeEditListener(gradeElementToAttach, subjectIdForEdit) {
        gradeElementToAttach.addEventListener("click", () => {
            // Überprüfen, ob bereits Eingabefelder aktiv sind
            if (newClassDiv.querySelector('.grade-input-container')) {
                showMessage("Bitte beende die aktuelle Eingabe zuerst.", "warning");
                return;
            }

            const currentGradeText = gradeElementToAttach.textContent.split(' ')[0]; // Nur den Notenwert extrahieren
            const currentFactorText = gradeElementToAttach.dataset.gradeFactor || "1.0"; // Faktor aus Data-Attribut

            const inputContainer = document.createElement("div");
            inputContainer.style.cssText = 'display: flex; gap: 5px;'; // CSS für Container
            inputContainer.classList.add('grade-input-container'); // Füge eine Klasse für Styling hinzu

            const noteInput = document.createElement("input");
            noteInput.type = "number";
            noteInput.value = currentGradeText;
            noteInput.classList.add("input-grade");
            noteInput.setAttribute("min", "1");
            noteInput.setAttribute("max", "6");
            noteInput.setAttribute("step", "0.1");

            const factorInput = document.createElement("input");
            factorInput.type = "number";
            factorInput.value = currentFactorText;
            factorInput.classList.add("input-grade"); // <--- HIER GEÄNDERT: Gleiche Klasse wie Note
            factorInput.setAttribute("min", "0.1");
            factorInput.setAttribute("step", "0.1");

            // Hinzufügen eines Speichern-Buttons
            const saveButton = document.createElement("button");
            saveButton.textContent = "✓"; // Häkchen-Symbol
            saveButton.classList.add("save-grade-button");
            saveButton.style.cssText = 'background-color: #4CAF50; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer;';

            // Hinzufügen eines Löschen-Buttons
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "🗑️"; // Papierkorb-Symbol
            deleteButton.classList.add("delete-grade-button");
            deleteButton.style.cssText = 'background-color: #f44336; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; margin-left: 5px;';


            inputContainer.appendChild(noteInput);
            inputContainer.appendChild(factorInput);
            inputContainer.appendChild(saveButton); // Speichern-Button zum Container hinzufügen
            inputContainer.appendChild(deleteButton); // Löschen-Button hinzufügen

            newClassDiv.replaceChild(inputContainer, gradeElementToAttach); // Ersetze das p-Element durch den Container
            noteInput.focus();

            const saveEditedGrade = () => {
                let gradeValue = parseFloat(noteInput.value);
                let gradeFactor = parseFloat(factorInput.value);

                if (isNaN(gradeValue) || gradeValue < 1) {
                    gradeValue = 1;
                } else if (gradeValue > 6) {
                    gradeValue = 6;
                }

                if (isNaN(gradeFactor) || gradeFactor <= 0) {
                    gradeFactor = 1;
                }

                const gradeKey = gradeElementToAttach.dataset.gradeKey;
                const updatedGradeElement = document.createElement("p");
                updatedGradeElement.classList.add("new-grade");
                updatedGradeElement.dataset.gradeKey = gradeKey;
                updatedGradeElement.dataset.gradeFactor = gradeFactor.toFixed(1); // Faktor aktualisieren
                updatedGradeElement.textContent = `${gradeValue.toFixed(1)} (x${gradeFactor.toFixed(1)})`;

                newClassDiv.replaceChild(updatedGradeElement, inputContainer); // Ersetze den Container durch das p-Element
                set(ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectIdForEdit}/grades/${gradeKey}`), { value: gradeValue, factor: gradeFactor });
                calculateAverage(newClassDiv, subjectIdForEdit);
                attachGradeEditListener(updatedGradeElement, subjectIdForEdit); // Listener neu anbringen
                showMessage("Note aktualisiert!", "success");
            };

            const deleteGrade = () => {
                const gradeKey = gradeElementToAttach.dataset.gradeKey;
                const gradeRef = ref(database, `users/${currentUserUid}/semesters/${currentSemesterKey}/${subjectIdForEdit}/grades/${gradeKey}`);
                set(gradeRef, null) // Löscht den Eintrag in Firebase
                    .then(() => {
                        newClassDiv.removeChild(inputContainer); // Entfernt die Eingabefelder
                        calculateAverage(newClassDiv, subjectIdForEdit); // Durchschnitt neu berechnen
                        showMessage("Note gelöscht!", "success");
                    })
                    .catch(error => {
                        console.error("Fehler beim Löschen der Note:", error);
                        showMessage("Fehler beim Löschen der Note.", "error");
                    });
            };

            // Event Listener für den Speichern-Button
            saveButton.addEventListener("click", saveEditedGrade);
            // Event Listener für den Löschen-Button
            deleteButton.addEventListener("click", deleteGrade);


            // Enter-Taste Listener für beide Felder
            noteInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    saveEditedGrade();
                }
            });
            factorInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    saveEditedGrade();
                }
            });

            // NEU: Blur-Event-Handling mit setTimeout zur Vermeidung von sofortigem Verschwinden
            let blurTimeout;
            const handleBlur = () => {
                blurTimeout = setTimeout(() => {
                    if (!inputContainer.contains(document.activeElement)) {
                        // Wenn der Benutzer beide Felder leer gemacht hat, als wäre es ein Löschvorgang
                        if (noteInput.value.trim() === "" && factorInput.value.trim() === "") {
                             deleteGrade(); // Versuche zu löschen
                        } else if (!isNaN(parseFloat(noteInput.value)) && !isNaN(parseFloat(factorInput.value))) {
                            saveEditedGrade();
                        } else {
                            // Wenn ungültige Eingabe, das ursprüngliche p-Element wiederherstellen
                            newClassDiv.replaceChild(gradeElementToAttach, inputContainer);
                            attachGradeEditListener(gradeElementToAttach, subjectIdForEdit); // Listener neu anbringen
                        }
                    }
                }, 100);
            };

            noteInput.addEventListener("blur", handleBlur);
            factorInput.addEventListener("blur", handleBlur);

            noteInput.addEventListener("focus", () => clearTimeout(blurTimeout));
            factorInput.addEventListener("focus", () => clearTimeout(blurTimeout));
        });
    }

    // Event Listener zum Bearbeiten vorhandener Noten (beim Initialisieren des Faches)
    gradeDisplayElements.forEach(gradeElement => {
        attachGradeEditListener(gradeElement, subjectId);
    });

    return newClassDiv;
}

// Event Listener zum Hinzufügen eines neuen Fachs
addSubjectButton.addEventListener("click", async () => {
    if (!currentSemesterKey) {
        showMessage("Bitte wähle zuerst ein Semester aus.", "warning");
        return;
    }

    if (!currentUserUid) {
        showMessage("Benutzer ist nicht angemeldet.", "error");
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
        set(newSubjectRef, { name: subjectName, grades: null, average: '0' })
            .then(() => {
                showMessage("Fach erfolgreich hinzugefügt!", "success");
            })
            .catch(error => {
                console.error("Fehler beim Hinzufügen des Fachs:", error);
                showMessage("Fehler beim Hinzufügen des Fachs.", "error");
            });
    } else if (subjectName !== null) { // Wenn der Benutzer auf "Abbrechen" klickt, ist subjectName null
        showMessage("Fachname darf nicht leer sein.", "warning");
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
        showMessage("Bitte melde dich zuerst an, um Semester hinzuzufügen.", "warning");
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
                showMessage("Semester erfolgreich hinzugefügt!", "success");
            }).catch(error => {
                console.error("Fehler beim Hinzufügen des Semesters:", error);
                showMessage("Fehler beim Hinzufügen des Semesters.", "error");
            });
        } catch (error) {
            console.error("Fehler beim Abrufen der Semesterdaten:", error);
            showMessage("Fehler beim Laden der Semesterdaten.", "error");
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