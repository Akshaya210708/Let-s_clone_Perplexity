// Suggestions Data
const suggestionData = {
    life: [
        "Build a personal CRM to track my network",
        "Redesign my schedule around priorities",
        "Sort my tasks and prioritize this week",
        "Prepare me for an upcoming meeting",
        "Set up a weekly review system every Sunday"
    ],
    business: [
        "Draft a business plan for a boutique agency",
        "Analyze market trends in sustainable tech",
        "Create a pitch deck outline for investors",
        "Optimize my LinkedIn for networking",
        "Research competitor pricing for SaaS"
    ],
    learn: [
        "Explain quantum computing for beginners",
        "Create a 30-day plan to learn public speaking",
        "Summarize the history of modern architecture",
        "Find top-rated courses for data science",
        "Teach me how to cook a perfect risotto"
    ],
    prototype: [
        "Design a mobile app for plant care",
        "Write a prompt for a minimalist UI landing page",
        "Create a user flow for an e-commerce checkout",
        "Draft a wireframe for a fitness tracker",
        "Generate a color palette for a fintech app"
    ]
};

// Select Elements
const searchBox = document.querySelector('.search-box');
const searchInput = document.getElementById('search-input');
const suggestionList = document.getElementById('suggestion-list');
const tabs = document.querySelectorAll('.tab');
const submitBtn = document.getElementById('submit-btn');
const initialView = document.getElementById('initial-view');
const chatThread = document.getElementById('chat-thread');
const chatWrapper = document.getElementById('chat-wrapper');
const historyItems = document.getElementById('history-items');
const newChatBtn = document.getElementById('new-chat-btn');

// File Upload Elements
const uploadTrigger = document.getElementById('upload-trigger');
const fileInput = document.getElementById('file-input');
const filePillContainer = document.getElementById('file-pill-container');
const fileNameDisplay = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file-btn');

// Global state for CURRENT upload
let pdfContext = "";
let currentFileName = "";
let isUploading = false;
let chatHistory = []; // {role: 'user'|'model', text: '...', fileName: '...'}

// 1. Auto-resize Textarea
searchInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    if (this.value.trim() !== '' || pdfContext !== "") {
        submitBtn.style.opacity = '1';
        submitBtn.style.transform = 'scale(1)';
    } else {
        submitBtn.style.opacity = '0.5';
    }
});

// 2. Chat UI Helpers
function scrollToBottom() {
    chatWrapper.scrollTo({
        top: chatWrapper.scrollHeight,
        behavior: 'smooth'
    });
}

function appendMessage(role, text, fileName = null, isLoading = false) {
    const isUser = role === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'message-user' : 'message-ai'}`;
    
    if (isLoading) {
        messageDiv.id = 'temp-loading-bubble';
    }

    let contentHTML = '';
    if (isUser) {
        // Render File Tag if exists
        const fileTagHTML = fileName ? `
            <div class="message-file-tag">
                <i data-lucide="${fileName.toLowerCase().endsWith('pdf') ? 'file-text' : 'presentation'}" class="icon-xs"></i>
                <span>${fileName}</span>
            </div>
        ` : '';
        
        contentHTML = `
            ${fileTagHTML}
            <div class="message-content">${text}</div>
        `;
    } else {
        const parsedContent = isLoading ? `
            <div class="loading-spinner">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        ` : marked.parse(text);

        contentHTML = `
            <div class="message-header">
                <i data-lucide="sparkles" class="icon-sm"></i>
                <span>Eco</span>
            </div>
            <div class="message-content">${parsedContent}</div>
        `;
    }

    messageDiv.innerHTML = contentHTML;
    chatThread.appendChild(messageDiv);
    lucide.createIcons();
    setTimeout(scrollToBottom, 50);
}

// 3. Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const category = tab.getAttribute('data-category');
        renderSuggestions(category);
    });
});

function renderSuggestions(category) {
    suggestionList.style.opacity = '0';
    suggestionList.style.transform = 'translateY(5px)';
    setTimeout(() => {
        const items = suggestionData[category];
        suggestionList.innerHTML = items.map(item => `<li class="suggestion-item">${item}</li>`).join('');
        suggestionList.style.opacity = '1';
        suggestionList.style.transform = 'translateY(0)';
        attachItemListeners();
    }, 150);
}

function attachItemListeners() {
    const items = document.querySelectorAll('.suggestion-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            searchInput.value = item.textContent;
            searchInput.focus();
            searchInput.dispatchEvent(new Event('input'));
        });
    });
}

// 4. File Upload Logic
uploadTrigger.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        isUploading = true;
        uploadTrigger.innerHTML = `<i data-lucide="loader" class="icon-sm spin"></i>`;
        lucide.createIcons();
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            pdfContext = data.text;
            currentFileName = data.filename;
            fileNameDisplay.textContent = data.filename;
            filePillContainer.classList.remove('hidden');
            searchInput.placeholder = "Ask about this file...";
            searchInput.dispatchEvent(new Event('input'));
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert("Error uploading file.");
    } finally {
        isUploading = false;
        uploadTrigger.innerHTML = `<i data-lucide="plus" class="icon-sm"></i>`;
        lucide.createIcons();
        fileInput.value = "";
    }
});

removeFileBtn.addEventListener('click', () => {
    pdfContext = "";
    currentFileName = "";
    filePillContainer.classList.add('hidden');
    searchInput.placeholder = "Ask anything...";
    searchInput.dispatchEvent(new Event('input'));
});

// 5. Search Submit & Thread Handling
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query && !pdfContext) return;

    if (chatHistory.length === 0) initialView.classList.add('hidden');

    const userQuery = query || "Please analyze the uploaded document.";
    const attachedFile = currentFileName; // Capture current file for this message
    const attachedContext = pdfContext;

    // Reset Global Upload UI for NEXT message
    pdfContext = "";
    currentFileName = "";
    filePillContainer.classList.add('hidden');
    searchInput.placeholder = "Ask anything...";
    searchInput.value = '';
    searchInput.style.height = 'auto';
    searchInput.dispatchEvent(new Event('input'));

    // Append User Bubble with File Tag
    appendMessage('user', userQuery, attachedFile);
    appendMessage('model', '', null, true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: userQuery,
                history: chatHistory,
                pdf_context: attachedContext,
                filename: attachedFile
            }),
        });

        const data = await response.json();
        const loadingBubble = document.getElementById('temp-loading-bubble');
        if (loadingBubble) loadingBubble.remove();

        if (response.ok) {
            chatHistory.push({ role: 'user', text: userQuery, fileName: attachedFile });
            chatHistory.push({ role: 'model', text: data.reply });
            appendMessage('model', data.reply);
            loadHistory();
        } else if (data.status === 'quota_exceeded') {
            appendMessage('model', `⚠️ **Daily Quota Exceeded**.`);
        } else {
            appendMessage('model', `Error: ${data.error || 'Failed'}`);
        }
    } catch (error) {
        const loadingBubble = document.getElementById('temp-loading-bubble');
        if (loadingBubble) loadingBubble.remove();
        appendMessage('model', '⚠️ **Connection Error**.');
    }
}

submitBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSearch();
    }
});

// 6. Sidebar History Logic
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        if (response.ok) {
            historyItems.innerHTML = data.map(item => `
                <li class="history-item" data-id="${item.id}" title="${item.query}">
                    ${item.query}
                </li>
            `).join('');
            attachHistoryListeners();
        }
    } catch (error) {}
}

function attachHistoryListeners() {
    const items = document.querySelectorAll('.history-item');
    items.forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.getAttribute('data-id');
            await loadHistoryItem(id);
            items.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

async function loadHistoryItem(id) {
    try {
        const response = await fetch(`/api/history/${id}`);
        const data = await response.json();
        if (response.ok) {
            initialView.classList.add('hidden');
            chatThread.innerHTML = '';
            chatHistory = [];
            
            // Load with stored filename
            appendMessage('user', data.query, data.filename);
            chatHistory.push({ role: 'user', text: data.query, fileName: data.filename });
            
            appendMessage('model', data.response);
            chatHistory.push({ role: 'model', text: data.response });
        }
    } catch (error) {}
}

// 7. Reset Flow
newChatBtn.addEventListener('click', () => {
    chatHistory = [];
    pdfContext = "";
    currentFileName = "";
    chatThread.innerHTML = '';
    filePillContainer.classList.add('hidden');
    initialView.classList.remove('hidden');
    searchInput.value = '';
    searchInput.placeholder = "Ask anything...";
    searchInput.dispatchEvent(new Event('input'));
    document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
});

function init() {
    attachItemListeners();
    loadHistory();
}

init();
