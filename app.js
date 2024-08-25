// app.js

let sentences = []; // Store all sentences globally
let currentSentenceIndex = null; // Track the current sentence index

// When the page loads, check if there's existing data in local storage and process it
window.onload = function() {
    const storedText = localStorage.getItem('chatText');
    if (storedText) {
        sentences = storedText.split('\n').filter(line => line.trim() !== '');
        drawRandomFlashcard();
    }
};

// Toggle between file upload and manual text input
function toggleInputMethod() {
    const fileInputSection = document.getElementById('file-input-section');
    const manualInputSection = document.getElementById('manual-input-section');
    const selectedInput = document.querySelector('input[name="input-type"]:checked').value;

    if (selectedInput === 'file') {
        fileInputSection.style.display = 'block';
        manualInputSection.style.display = 'none';
    } else {
        fileInputSection.style.display = 'none';
        manualInputSection.style.display = 'block';
    }
}

// Save API Key to Local Storage
function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    if (apiKey) {
        localStorage.setItem('openai_api_key', apiKey);
        alert('API Key saved!');
    } else {
        alert('Please enter a valid API Key.');
    }
}

// Get API Key from Local Storage
function getApiKey() {
    return localStorage.getItem('openai_api_key');
}

// Process Chat File and Generate Flashcards
function processChat() {
    const chatFile = document.getElementById('chatFile').files[0];
    if (chatFile) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const text = event.target.result;
            localStorage.setItem('chatText', text); // Save the text to local storage
            sentences = text.split('\n').filter(line => line.trim() !== '');
            drawRandomFlashcard();
        };
        reader.readAsText(chatFile);
    } else {
        alert('Please upload a chat conversation file.');
    }
}

// Process Manually Entered Text
function processManualText() {
    const text = document.getElementById('manualTextInput').value;
    if (text.trim() !== '') {
        localStorage.setItem('chatText', text); // Save the text to local storage
        sentences = text.split('\n').filter(line => line.trim() !== '');
        drawRandomFlashcard();
    } else {
        alert('Please enter some text.');
    }
}

// Store conversation histories in an array where the index corresponds to the flashcard index
const conversationHistories = [];

// Draw a random flashcard
function drawRandomFlashcard() {
    if (sentences.length === 0) {
        alert('No sentences available.');
        return;
    }

    currentSentenceIndex = Math.floor(Math.random() * sentences.length);
    generateFlashcard(sentences[currentSentenceIndex]);
}

// Generate a single flashcard
function generateFlashcard(sentence) {
    const flashcardsContainer = document.getElementById('flashcards-container');
    
    if (!flashcardsContainer) {
        console.error('Flashcards container not found');
        return;
    }

    flashcardsContainer.innerHTML = ''; // Clear the container before adding the new flashcard

    const conversationHistory = []; // Initialize conversation history for this flashcard
    conversationHistories[currentSentenceIndex] = conversationHistory; // Store it in the array

    const escapedSentence = JSON.stringify(sentence);

    const flashcard = document.createElement('div');
    flashcard.className = 'flashcard';

    flashcard.innerHTML = `
        <div class="content-container">
            <p>${sentence}</p>
            <input type="text" placeholder="Your Translation" id="translation">
            <button onclick="getFeedback(${currentSentenceIndex}, ${escapedSentence.replace(/"/g, "'")})">Get Feedback</button>
            <div id="conversation" class="conversation-container"></div>
            <div id="follow-up" class="follow-up-container" style="display:none;">
                <input type="text" placeholder="Ask a follow-up question" id="follow-up-input">
                <button onclick="askFollowUp(${currentSentenceIndex}, ${escapedSentence.replace(/"/g, "'")})">Ask</button>
            </div>
        </div>
        <button onclick="drawRandomFlashcard()">Next</button>
    `;

    flashcardsContainer.appendChild(flashcard);
}

// Get AI Feedback
// Get AI Feedback
async function getFeedback(index, sentence) {
    const translationInput = document.getElementById('translation');
    const translation = translationInput.value;
    const apiKey = getApiKey();
    let conversationHistory = conversationHistories[index]; // Retrieve the history for this flashcard
    
    if (!apiKey) {
        alert('Please save your OpenAI API Key first.');
        return;
    }

    conversationHistory.length = 0; // Clear the previous history
    // Add user's translation to the conversation history
    conversationHistory.push({ role: "user", content: `Source sentence: ${sentence}` });
    const prompt = `
    You need to give the feedback on the user-provided translation. If it doesn't sound like a sentence that a native speaker would say in daily life, or if it's long-winded, you need to provide a better sentence. Make sure it has natural flow and rhythm. You need to find a sentence that a native speaker or movie character would use daily that gives a similar meaning to the source sentence. If you cannot find an exact sentence, then find a good sentence and change its noun to achieve the goal. Try to give the result as concise a sentence as possible. If you can express the meaning in 3 words, then do not use 4.
    
    Source Text: "${sentence}"
    User Provided Translation: "${translation}"
    
    Please provide the result in the format of:
    Source Sentence: "source sentence"\n
    User Provided Translation: "user provided translation"\n
    Feedback: "feedback"\n
    AI Suggestion: "AI suggestion"
    `
    
    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const data = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
            ...conversationHistory
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const completion = await response.json();
        conversationHistory.push({ role: "assistant", content: completion.choices[0].message.content });

        updateConversationDisplay(conversationHistory);

        // Clear the input box after submission
        translationInput.value = '';

        // Show the follow-up input field
        document.getElementById('follow-up').style.display = 'block';
    } catch (error) {
        console.error('Error fetching AI feedback:', error);
        document.getElementById('conversation').innerText = "Error: Unable to retrieve feedback. Please try again later.";
    }
}

// Ask Follow-Up Question
async function askFollowUp(index, sentence) {
    const followUpInput = document.getElementById('follow-up-input');
    const followUpQuestion = followUpInput.value;
    const apiKey = getApiKey();
    const conversationHistory = conversationHistories[index]; // Retrieve the history for this flashcard

    if (!apiKey) {
        alert('Please save your OpenAI API Key first.');
        return;
    }

    // Add user's follow-up question to the conversation history
    conversationHistory.push({ role: "user", content: followUpQuestion });

    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const data = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: `Follow-up question based on the previous feedback: "${followUpQuestion}". The original sentence was "${sentence}".` },
            ...conversationHistory
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const completion = await response.json();
        conversationHistory.push({ role: "assistant", content: completion.choices[0].message.content });

        updateConversationDisplay(conversationHistory);

        // Clear the input box after submission
        followUpInput.value = '';
    } catch (error) {
        console.error('Error fetching follow-up response:', error);
        document.getElementById('conversation').innerText = "Error: Unable to retrieve follow-up response. Please try again later.";
    }
}


// Update the conversation display
function updateConversationDisplay(conversationHistory) {
    const conversationContainer = document.getElementById('conversation');
    conversationContainer.innerHTML = '';

    conversationHistory.forEach(message => {
        // Split the message content by line breaks to preserve formatting
        const lines = message.content.split('\n');
        lines.forEach(line => {
            const messageElement = document.createElement('p');
            
            // Apply bold formatting to specific headers
            if (line.startsWith('Source Sentence:')) {
                messageElement.innerHTML = `<strong>Source sentence:</strong> ${line.replace('Source Sentence:', '').trim()}`;
            } else if (line.startsWith('User Provided Translation:')) {
                messageElement.innerHTML = `<strong>User Provided Translation:</strong> ${line.replace('User Provided Translation:', '').trim()}`;
            } else if (line.startsWith('Feedback:')) {
                messageElement.innerHTML = `<strong>Feedback:</strong> ${line.replace('Feedback:', '').trim()}`;
            } else if (line.startsWith('AI Suggestion:')) {
                messageElement.innerHTML = `<strong>AI Suggestion:</strong> ${line.replace('AI Suggestion:', '').trim()}`;
            } else {
                messageElement.textContent = line;
            }

            conversationContainer.appendChild(messageElement);
        });
    });

    // Make the conversation container scrollable if content exceeds the container's height
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
}
