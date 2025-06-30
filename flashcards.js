import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, update } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Deine Firebase-Konfiguration (stelle sicher, dass sie mit der im HTML übereinstimmt)
import firebaseConfig from './database/firebaseConfig.js';

// Initialisiere die Firebase-App
const app = initializeApp(firebaseConfig);

// Hol dir die Auth- und Database-Instanzen
const auth = getAuth(app);
const database = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    const createSetButton = document.getElementById('create-new-set-button');
    const createSetContainer = document.getElementById('create-set-container');
    const cardsContainer = document.getElementById('cards-container');
    const addCardButton = document.getElementById('add-card-button');
    const saveSetButton = document.getElementById('save-set-button');
    const flashcardsOverview = document.querySelector('.flaschcards-oberview'); // Das Element, in dem die Sets angezeigt werden sollen
    const modal = document.getElementById('flashcard-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const cardDisplayArea = document.getElementById('card-display-area');
    const prevCardButton = document.getElementById('prev-card-button');
    const nextCardButton = document.getElementById('next-card-button');
    const flipCardButton = document.getElementById('flip-card-button');
    const modalContent = document.querySelector('.modal-content'); // Hol das modal-content Element
    const controlsContainer = document.getElementById('controls-container'); // Hol den Container für die Buttons
    const cardNumberDisplay = document.createElement('p'); // Neues Element zur Anzeige der Kartennummer
    cardNumberDisplay.classList.add('card-number-display');
    if (modalContent && controlsContainer) {
        modalContent.insertBefore(cardNumberDisplay, controlsContainer); 
    } 

    // Neue Elemente für das Eingabefeld und Feedback
    const answerInputContainer = document.getElementById('answer-input-container');
    const answerInput = document.getElementById('answer-input');
    const checkAnswerButton = document.getElementById('check-answer-button');
    const feedbackDisplay = document.getElementById('feedback-display');
    const generalMessageDisplay = document.getElementById('general-message-display'); // Für allgemeine Nachrichten
    const markCorrectButton = document.getElementById('mark-correct-button'); // Neuer Button

    let cardCounter = cardsContainer.querySelectorAll('.card-input').length; // Initialisiere mit der Anzahl der vorhandenen Karten
    let currentSet = null;
    let currentSetId = null; // Speichert die ID des aktuell geöffneten Sets
    let currentCardIndex = 0;

    // Variablen für den gespeicherten Fortschritt
    let lastViewedSetId = null;
    let lastViewedCardIndex = 0;

    // Funktion zum Anzeigen von Nachrichten im UI
    function showMessage(message, type = 'info') {
        generalMessageDisplay.textContent = message;
        generalMessageDisplay.className = `general-message ${type}`; // Füge Klasse für Styling hinzu (z.B. 'error', 'success')
        generalMessageDisplay.style.display = 'block';
        setTimeout(() => {
            generalMessageDisplay.style.display = 'none';
            generalMessageDisplay.textContent = '';
        }, 3000); // Nach 3 Sekunden ausblenden
    }

    // Funktion zum Speichern des Fortschritts in Firebase
    async function saveProgress(userId, setId, cardIndex) {
        if (!userId || !setId) return; // Speichere nur, wenn ein Benutzer und ein Set ausgewählt sind
        try {
            const progressRef = ref(database, `users/${userId}/progress`);
            await set(progressRef, {
                lastViewedSetId: setId,
                lastViewedCardIndex: cardIndex
            });
            console.log('Fortschritt gespeichert:', { setId, cardIndex });
        } catch (error) {
            console.error('Fehler beim Speichern des Fortschritts:', error);
        }
    }

    createSetButton.addEventListener('click', () => {
        createSetContainer.style.display = 'block'; // Zeige den Container an
    });

    function addCardInput() {
        cardCounter++;
        const newCardDiv = document.createElement('div');
        newCardDiv.classList.add('card-input');
        newCardDiv.innerHTML = `
            <label for="question-${cardCounter}">Frage ${cardCounter}:</label>
            <textarea id="question-${cardCounter}" required></textarea><br>
            <label for="answer-${cardCounter}">Antwort ${cardCounter}:</label>
            <textarea id="answer-${cardCounter}" required></textarea><br>
            <button type="button" class="remove-card-button">Karte entfernen</button>
        `;
        cardsContainer.appendChild(newCardDiv);

        // Füge Event Listener für den neuen Entfernen-Button hinzu
        const removeButton = newCardDiv.querySelector('.remove-card-button');
        removeButton.addEventListener('click', () => {
            newCardDiv.remove();
            // Optional: Kartennummern neu ordnen, wenn eine Karte entfernt wird
        });
    }

    addCardButton.addEventListener('click', addCardInput);

    // Füge Event Listener für alle vorhandenen Entfernen-Buttons hinzu (für die initial geladene Karte)
    cardsContainer.querySelectorAll('.remove-card-button').forEach(button => {
        button.addEventListener('click', (event) => {
            event.target.parentNode.remove();
        });
    });

    saveSetButton.addEventListener('click', async () => {
        const setTitle = document.getElementById('set-title').value.trim();
        const cardInputs = cardsContainer.querySelectorAll('.card-input');
        const cards = [];

        if (!setTitle) {
            showMessage('Bitte gib einen Titel für dein Flashcard-Set ein.', 'error');
            return;
        }

        if (cardInputs.length === 0) {
            showMessage('Bitte füge mindestens eine Karte zu deinem Set hinzu.', 'error');
            return;
        }

        let allCardsValid = true;
        cardInputs.forEach(cardInput => {
            const questionTextarea = cardInput.querySelector('textarea[id^="question-"]');
            const answerTextarea = cardInput.querySelector('textarea[id^="answer-"]');

            if (questionTextarea && answerTextarea) {
                const question = questionTextarea.value.trim();
                const answer = answerTextarea.value.trim();
                if (question && answer) {
                    cards.push({ question: question, answer: answer });
                } else {
                    showMessage('Bitte stelle sicher, dass alle Fragen und Antworten ausgefüllt sind.', 'error');
                    allCardsValid = false;
                    return;
                }
            }
        });

        if (!allCardsValid) {
            return;
        }

        if (cards.length > 0) {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const flashcardSetsRef = ref(database, `users/${user.uid}/flashcardSets`);
                    const newSetRef = push(flashcardSetsRef); // Erzeugt einen neuen Eintrag mit einer einzigartigen ID
                    try {
                        await set(newSetRef, {
                            title: setTitle,
                            cards: cards,
                            createdAt: new Date().toISOString() // Speichern als ISO-String
                        });
                        console.log('Flashcard-Set mit ID gespeichert: ', newSetRef.key);
                        showMessage('Flashcard-Set erfolgreich gespeichert!', 'success');
                        document.getElementById('set-title').value = '';
                        cardsContainer.innerHTML = `
                            <div class="card-input">
                                <label for="question-1">Frage 1:</label>
                                <textarea id="question-1" required></textarea><br>
                                <label for="answer-1">Antwort 1:</label>
                                <textarea id="answer-1" required></textarea><br>
                                <button type="button" class="remove-card-button">Karte entfernen</button>
                            </div>
                        `;
                        cardCounter = 1;
                        // Füge Event Listener für den neuen Entfernen-Button der ersten Karte hinzu
                        const newInitialRemoveButton = document.querySelector('.card-input .remove-card-button');
                        if (newInitialRemoveButton) {
                            newInitialRemoveButton.addEventListener('click', (event) => {
                                event.target.parentNode.remove();
                            });
                        }
                        loadFlashcardSets(user.uid); // Nach dem Speichern die Sets neu laden
                    } catch (error) {
                        console.error('Fehler beim Speichern des Flashcard-Sets: ', error);
                        showMessage('Fehler beim Speichern des Flashcard-Sets.', 'error');
                    }
                } else {
                    showMessage('Du musst angemeldet sein, um Flashcard-Sets zu speichern.', 'error');
                }
            });
        }
    });

    // Funktion zum Laden und Anzeigen der Flashcard-Sets
    function loadFlashcardSets(userId) {
        const flashcardSetsRef = ref(database, `users/${userId}/flashcardSets`);

        onValue(flashcardSetsRef, (snapshot) => {
            flashcardsOverview.innerHTML = ''; // Leere zuerst den Overview
            const data = snapshot.val();
            if (data) {
                for (const setId in data) {
                    if (Object.hasOwnProperty.call(data, setId)) {
                        const set = data[setId];
                        const setElement = document.createElement('div');
                        setElement.classList.add('flashcard-set-item');
                        setElement.innerHTML = `
                            <h3>${set.title}</h3>
                            <p>${set.cards.length} Karten</p>
                            <button class="view-set-button" data-set-id="${setId}">Anzeigen</button>
                        `;
                        flashcardsOverview.appendChild(setElement);
                    }
                }
            } else {
                const noSetsMessage = document.createElement('p');
                noSetsMessage.textContent = 'Noch keine Flashcard-Sets erstellt.';
                flashcardsOverview.appendChild(noSetsMessage);
            }

            // Füge Event Listener für die "Anzeigen"-Buttons hinzu (nachdem die Elemente geladen wurden)
            const viewSetButtons = flashcardsOverview.querySelectorAll('.view-set-button');
            viewSetButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    currentSetId = event.target.dataset.setId; // Speichere die Set-ID
                    currentSet = data[currentSetId];
                    currentCardIndex = 0; // Setze den Index standardmäßig auf 0

                    // Überprüfe, ob es gespeicherten Fortschritt für dieses Set gibt
                    if (lastViewedSetId === currentSetId && lastViewedCardIndex !== undefined) {
                        currentCardIndex = lastViewedCardIndex;
                        console.log(`Fortschritt geladen: Set ${currentSetId}, Karte ${currentCardIndex}`);
                    }

                    if (currentSet && currentSet.cards && currentSet.cards.length > 0) {
                        displayCard(false); // Starte immer mit der Frage und dem Eingabefeld
                        modal.style.display = 'flex'; // Zeige das Modal-Overlay
                        if (modalContent) {
                            modalContent.style.display = 'flex'; // Zeige den Inhalt an
                            modalContent.style.flexDirection = 'column'; // Zeige den Inhalt an
                           
                        }
                    } else {
                        cardDisplayArea.textContent = "Keine Karten in diesem Set gefunden.";
                        modal.style.display = 'flex'; // Zeige das Modal-Overlay auch bei leerem Set
                        if (modalContent) {
                            modalContent.style.display = 'block';
                        }
                        // Verstecke alle Lern-relevanten Elemente, wenn keine Karten vorhanden sind
                        answerInputContainer.style.opacity = 'none';
                        feedbackDisplay.textContent = '';
                        flipCardButton.style.display = 'block';
                        checkAnswerButton.style.display = 'none';
                   
                        prevCardButton.style.display = 'none';
                        nextCardButton.style.display = 'none';
                        markCorrectButton.style.display = 'none'; // Neuer Button verstecken
                    }
                });
            });
        });
    }

    // Lade die Flashcard-Sets und den Fortschritt, wenn der Benutzer angemeldet ist
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadFlashcardSets(user.uid);
            // Lade den Fortschritt des Benutzers
            const progressRef = ref(database, `users/${user.uid}/progress`);
            onValue(progressRef, (snapshot) => {
                const progressData = snapshot.val();
                if (progressData) {
                    lastViewedSetId = progressData.lastViewedSetId;
                    lastViewedCardIndex = progressData.lastViewedCardIndex;
                    console.log('Geladener Fortschritt:', progressData);
                } else {
                    lastViewedSetId = null;
                    lastViewedCardIndex = 0;
                }
            });
        } else {
            flashcardsOverview.innerHTML = '<p>Bitte melde dich an, um deine Flashcard-Sets zu sehen.</p>';
            lastViewedSetId = null;
            lastViewedCardIndex = 0;
        }
    });

    // Modal schließen
    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
        if (modalContent) {
            modalContent.style.display = 'none'; // Verstecke den Inhalt wieder
        }
        // Speichere den Fortschritt beim Schließen des Modals
        if (auth.currentUser && currentSetId) {
            saveProgress(auth.currentUser.uid, currentSetId, currentCardIndex);
        }
        currentSet = null;
        currentSetId = null; // Setze die Set-ID zurück
        currentCardIndex = 0;
        // Setze Anzeigeelemente zurück
        cardDisplayArea.textContent = '';
        answerInput.value = '';
        feedbackDisplay.textContent = '';
        answerInputContainer.style.opacity = 'none';
        flipCardButton.style.display = 'inline-block'; // Stelle sicher, dass es für das nächste Öffnen wieder sichtbar ist
        flipCardButton.textContent = 'Umdrehen'; // Setze Text zurück
        checkAnswerButton.style.display = 'none'; // Stelle sicher, dass es versteckt ist
        markCorrectButton.style.display = 'none'; // Neuer Button verstecken
        // Stelle auch die Navigationsbuttons wieder her
        prevCardButton.style.display = 'inline-block';
        nextCardButton.style.display = 'inline-block';
    });


    // Funktion zum Anzeigen der Karte (Frage oder Antwort)
    function displayCard(showAnswer = false) {
        if (!currentSet || !currentSet.cards || currentSet.cards.length === 0) {
            cardDisplayArea.textContent = "Keine Karten gefunden.";
            cardNumberDisplay.textContent = "";
            answerInputContainer.style.opacity = 0; 
            feedbackDisplay.textContent = '';
            flipCardButton.style.display = 'block'; // Oder 'inline-block'
            checkAnswerButton.style.display = 'none';
            markCorrectButton.style.display = 'none';
            return;
        }
    
        if (currentCardIndex >= 0 && currentCardIndex < currentSet.cards.length) {
            const card = currentSet.cards[currentCardIndex];
            cardNumberDisplay.textContent = `${currentCardIndex + 1} / ${currentSet.cards.length}`;
    
            if (showAnswer) {
                cardDisplayArea.textContent = card.answer;
                answerInputContainer.style.opacity = 0;
                feedbackDisplay.textContent = '';
                flipCardButton.style.display = 'inline-block';
          
                flipCardButton.textContent = 'Frage anzeigen';
                checkAnswerButton.style.display = 'none'; 
                markCorrectButton.style.display = 'none';
            } else {
                // Frage anzeigen
                cardDisplayArea.textContent = card.question;
                answerInputContainer.style.display = 'flex';
                answerInputContainer.style.opacity = 1;
                answerInput.value = '';
                feedbackDisplay.textContent = '';
                flipCardButton.style.display = 'block'; // Oder 'inline-block'
                checkAnswerButton.style.display = 'inline-block'; // <-- HIER KORRIGIEREN: von opacity zu display
                markCorrectButton.style.display = 'none';
            }
        } else {
            cardDisplayArea.textContent = "Ende der Karten.";
            cardNumberDisplay.textContent = "";
            answerInputContainer.style.display = 'none';
            feedbackDisplay.textContent = '';
            flipCardButton.style.display = 'none';
            checkAnswerButton.style.display = 'none'; // <-- HIER KORRIGIEREN: von opacity zu display
            markCorrectButton.style.display = 'none';
        }
    }   

    // Event Listener für den "Antwort prüfen"-Button
    checkAnswerButton.addEventListener('click', () => {
        if (!currentSet || !currentSet.cards || currentSet.cards.length === 0) return;

        const card = currentSet.cards[currentCardIndex];
        const userAnswer = answerInput.value.trim();
        const correctAnswer = card.answer.trim();

        // Vergleich ist jetzt exakt (case-sensitive)
        if (userAnswer === correctAnswer) {
            feedbackDisplay.textContent = 'Richtig!';
            feedbackDisplay.style.color = 'green';
            flipCardButton.style.display = 'inline-block'; // Erlaube das Umdrehen, um die Antwort zu sehen
            flipCardButton.textContent = 'Antwort anzeigen';
            markCorrectButton.style.display = 'none'; // Bei richtiger Antwort verstecken
        } else {
            feedbackDisplay.textContent = `Falsch! Die richtige Antwort ist: "${correctAnswer}"`;
            feedbackDisplay.style.color = 'red';
            flipCardButton.style.display = 'inline-block'; // Erlaube das Umdrehen, um die Antwort zu sehen
            flipCardButton.textContent = 'Antwort anzeigen';
            markCorrectButton.style.display = 'inline-block'; // Bei falscher Antwort anzeigen
        }
        checkAnswerButton.style.display = 'none'; // Prüfen-Button nach dem Prüfen verstecken
    });

    // Event Listener für den "Als richtig werten"-Button
    markCorrectButton.addEventListener('click', async () => {
        if (!currentSet || !currentSet.cards || currentSet.cards.length === 0 || !currentSetId) return;

        const userAnswer = answerInput.value.trim();
        const user = auth.currentUser;

        if (user && userAnswer) {
            // Die folgende Zeile wurde auskommentiert, damit die als richtig gewertete Antwort
            // nicht in der Datenbank gespeichert wird, sondern nur für die aktuelle Sitzung.
            // const cardAnswerRef = ref(database, `users/${user.uid}/flashcardSets/${currentSetId}/cards/${currentCardIndex}/answer`);
            // await set(cardAnswerRef, userAnswer); // Aktualisiere die Antwort in der Datenbank

            // Aktualisiere das lokale Objekt für die aktuelle Sitzung
            currentSet.cards[currentCardIndex].answer = userAnswer;

            feedbackDisplay.textContent = `Antwort wurde als "${userAnswer}" in dieser Sitzung als richtig gewertet!`;
            feedbackDisplay.style.color = 'green';
            flipCardButton.style.display = 'inline-block';
            flipCardButton.textContent = 'Antwort anzeigen';
            checkAnswerButton.style.display = 'none';
            markCorrectButton.style.display = 'none';
            showMessage('Antwort erfolgreich in dieser Sitzung aktualisiert!', 'success');
        } else {
            showMessage('Bitte gib eine Antwort ein, um sie als richtig zu werten.', 'error');
        }
    });

    // Event Listener für den "Umdrehen"-Button
    flipCardButton.addEventListener('click', () => {
        // Wenn die Frage oder Feedback angezeigt wird, drehe zur Antwort um
        if (cardDisplayArea.textContent === currentSet.cards[currentCardIndex].question || feedbackDisplay.textContent !== '') {
            displayCard(true); // Antwort anzeigen
            flipCardButton.textContent = 'Frage anzeigen'; // Button-Text ändern
        } else {
            // Wenn die Antwort angezeigt wird, drehe zurück zur Frage
            displayCard(false); // Frage anzeigen
            flipCardButton.textContent = 'Umdrehen'; // Button-Text zurücksetzen
        }
    });

    // Event Listener für den "Zurück"-Button
    prevCardButton.addEventListener('click', () => {
        if (currentSet && currentCardIndex > 0) {
            currentCardIndex--;
            displayCard(false); // Immer die Frage anzeigen, wenn navigiert wird
            if (auth.currentUser && currentSetId) {
                saveProgress(auth.currentUser.uid, currentSetId, currentCardIndex); // Fortschritt speichern
            }
        }
    });

    // Event Listener für den "Weiter"-Button
    nextCardButton.addEventListener('click', () => {
        if (currentSet && currentCardIndex < currentSet.cards.length - 1) {
            currentCardIndex++;
            displayCard(false); // Immer die Frage anzeigen, wenn navigiert wird
            if (auth.currentUser && currentSetId) {
                saveProgress(auth.currentUser.uid, currentSetId, currentCardIndex); // Fortschritt speichern
            }
        }
    });
});
