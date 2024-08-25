// app.js
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
window.onload = function() {
    const storedText = localStorage.getItem('chatText');
    if (storedText) {
        const sentences = storedText.split('\n').filter(line => line.trim() !== '');
        generateFlashcards(sentences);
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
            const sentences = text.split('\n').filter(line => line.trim() !== '');
            generateFlashcards(sentences);
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
        const sentences = text.split('\n').filter(line => line.trim() !== '');
        generateFlashcards(sentences);
    } else {
        alert('Please enter some text.');
    }
}

// Store conversation histories in an array where the index corresponds to the flashcard index
const conversationHistories = [];

// Generate Flashcards
function generateFlashcards(sentences) {
    const flashcardsContainer = document.getElementById('flashcards-container');
    
    if (!flashcardsContainer) {
        console.error('Flashcards container not found');
        return;
    }

    flashcardsContainer.innerHTML = ''; // Clear the container before adding new flashcards
    conversationHistories.length = 0; // Clear conversation histories

    sentences.forEach((sentence, index) => {
        const conversationHistory = []; // Initialize conversation history for this flashcard
        conversationHistories[index] = conversationHistory; // Store it in the array

        const escapedSentence = JSON.stringify(sentence);

        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';

        flashcard.innerHTML = `
            <div class="content-container">
                <p>${sentence}</p>
                <input type="text" placeholder="Your Translation" id="translation-${index}">
                <button onclick="getFeedback(${index}, ${escapedSentence.replace(/"/g, "'")})">Get Feedback</button>
                <div id="conversation-${index}" class="conversation-container"></div>
                <div id="follow-up-${index}" class="follow-up-container" style="display:none;">
                    <input type="text" placeholder="Ask a follow-up question" id="follow-up-input-${index}">
                    <button onclick="askFollowUp(${index}, ${escapedSentence.replace(/"/g, "'")})">Ask</button>
                </div>
            </div>
        `;

        flashcardsContainer.appendChild(flashcard);
    });
}

// Get AI Feedback
async function getFeedback(index, sentence) {
    const translation = document.getElementById(`translation-${index}`).value;
    const apiKey = getApiKey();
    let conversationHistory = conversationHistories[index]; // Retrieve the history for this flashcard
    
    if (!apiKey) {
        alert('Please save your OpenAI API Key first.');
        return;
    }

    conversationHistory.length = 0; // Clear the previous history
    // Add user's translation to the conversation history
    conversationHistory.push({ role: "user", content: `Source sentence: ${sentence}` });
    const prompt = `The following sentence needs to be convert into English. Do not use the direct translation. Please find the sentence that people used in the movie that gives the same meaning. If you can not find exact sentence, then find  the good sentence structure, change its noun or verb to achive the goal. The resulting sentence should be as concise as possible. Please provide the English sentence that best translates the meaning:\n\nSource Text: "${sentence}"\nTranslation: "${translation}"\n\nProvide the best movie-like translation for this sentence.`;
    
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

        updateConversationDisplay(index, conversationHistory);

        // Show the follow-up input field
        document.getElementById(`follow-up-${index}`).style.display = 'block';
    } catch (error) {
        console.error('Error fetching AI feedback:', error);
        document.getElementById(`conversation-${index}`).innerText = "Error: Unable to retrieve feedback. Please try again later.";
    }
}

// Ask Follow-Up Question
async function askFollowUp(index, sentence) {
    const followUpQuestion = document.getElementById(`follow-up-input-${index}`).value;
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

        updateConversationDisplay(index, conversationHistory);
    } catch (error) {
        console.error('Error fetching follow-up response:', error);
        document.getElementById(`conversation-${index}`).innerText = "Error: Unable to retrieve follow-up response. Please try again later.";
    }
}

// Update the conversation display
function updateConversationDisplay(index, conversationHistory) {
    const conversationContainer = document.getElementById(`conversation-${index}`);
    conversationContainer.innerHTML = '';

    conversationHistory.forEach(message => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${message.role === 'user' ? 'You' : 'AI'}: ${message.content}`;
        conversationContainer.appendChild(messageElement);
    });

    // Make the conversation container scrollable if content exceeds the container's height
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
}
