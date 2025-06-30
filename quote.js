
document.addEventListener('DOMContentLoaded', () => {
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');

    async function fetchDailyMotivationalQuote() { // Funktion umbenannt zur besseren Klarheit
        try {
            const today = new Date().toDateString();
            const lastFetchDate = localStorage.getItem('lastFetchDate');
            const storedQuote = localStorage.getItem('dailyQuote');
            const storedAuthor = localStorage.getItem('dailyAuthor');

            if (lastFetchDate === today && storedQuote && storedAuthor) {
                quoteText.textContent = `"${storedQuote}"`;
                quoteAuthor.textContent = `- ${storedAuthor}`;
                return;
            }

            const response = await fetch('https://zenquotes.io/api/quotes?category=inspirational');
            const data = await response.json(); // Dies gibt ein Array von Zitaten zurück

            if (data && data.length > 0) {
                const randomIndex = Math.floor(Math.random() * data.length);
                const randomMotivationalQuote = data[randomIndex];

                const fetchedQuote = randomMotivationalQuote.q;
                const fetchedAuthor = randomMotivationalQuote.a;

                quoteText.textContent = `"${fetchedQuote}"`;
                quoteAuthor.textContent = `- ${fetchedAuthor}`;

                localStorage.setItem('dailyQuote', fetchedQuote);
                localStorage.setItem('dailyAuthor', fetchedAuthor);
                localStorage.setItem('lastFetchDate', today);
            } else {
                // console.warn('Keine Motivationszitate von der API erhalten. Zeige Fallback-Zitat.');
                quoteText.textContent = "„Glaube an dich selbst und alles, was du bist. Wisse, dass etwas in dir steckt, das größer ist als jedes Hindernis.“";
                quoteAuthor.textContent = "- Christian D. Larson";
            }
        } catch (error) {
            // console.error('Fehler beim Abrufen der Motivationszitate:', error);
            // Fallback bei Netzwerkfehlern oder anderen Problemen (z.B. CORS)
            quoteText.textContent = "„Glaube an dich selbst und alles, was du bist. Wisse, dass etwas in dir steckt, das größer ist als jedes Hindernis.“";
            quoteAuthor.textContent = "- Christian D. Larson";
        }
    }

    fetchDailyMotivationalQuote(); // Rufe die umbenannte Funktion auf
});