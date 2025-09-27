// Global variables
let currentUser = null;
let currentQuiz = null;
let questionCount = 0;

// API Base URL
const API_BASE = '/api';

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/user`, { credentials: 'include' });
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            showNavButtons(user.username);
        } else {
            showAuthForm();
        }
    } catch (err) {
        console.error('Auth check failed:', err);
        showAuthForm();
    }
}

// Show authentication form
function showAuthForm() {
    const authSection = document.getElementById('authSection');
    if (!authSection) return;
    
    authSection.innerHTML = `
        <div class="auth-card">
            <h2>Login</h2>
            <form id="loginForm">
                <div class="form-group">
                    <input type="text" id="loginUsername" placeholder="Username" required>
                </div>
                <div class="form-group">
                    <input type="password" id="loginPassword" placeholder="Password" required>
                </div>
                <button type="submit">Login</button>
            </form>
            
            <h2>Register</h2>
            <form id="registerForm">
                <div class="form-group">
                    <input type="text" id="regUsername" placeholder="New Username" required>
                </div>
                <div class="form-group">
                    <input type="password" id="regPassword" placeholder="New Password" required>
                </div>
                <button type="submit">Register</button>
            </form>
        </div>
    `;

    document.getElementById('loginForm').onsubmit = login;
    document.getElementById('registerForm').onsubmit = register;
}

// Show navigation buttons
function showNavButtons(username) {
    const authSection = document.getElementById('authSection');
    const navButtons = document.getElementById('navButtons');
    const status = document.getElementById('status');
    
    if (authSection) authSection.style.display = 'none';
    if (navButtons) navButtons.style.display = 'block';
    if (status) status.innerHTML = `<p>Welcome, ${username}!</p>`;
}

// Login function
async function login(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            currentUser = { username: data.username };
            showNavButtons(data.username);
        } else {
            showStatus(data.error || 'Login failed', true);
        }
    } catch (err) {
        showStatus('Login error: ' + err.message, true);
    }
}

// Register function
async function register(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            currentUser = { username: data.username };
            showNavButtons(data.username);
        } else {
            showStatus(data.error || 'Registration failed', true);
        }
    } catch (err) {
        showStatus('Registration error: ' + err.message, true);
    }
}

// Logout function
async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
        currentUser = null;
        window.location.href = '/';
    } catch (err) {
        showStatus('Logout error: ' + err.message, true);
    }
}

// Navigate to page
function navigateTo(path) {
    if ((path === '/create' || path === '/list') && !currentUser) {
        showStatus('Please login first', true);
        return;
    }
    window.location.href = path;
}

// Create/Save Quiz
async function createQuiz(e) {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const editId = document.getElementById('editId').value;
    const questions = [];

    // Collect all questions
    const questionGroups = document.querySelectorAll('.question-group');
    questionGroups.forEach((group, index) => {
        const questionText = group.querySelector('input[type="text"]').value;
        if (!questionText) return;

        const options = Array.from(group.querySelectorAll('.options input[type="text"]')).map(input => input.value);
        const correct = parseInt(group.querySelector('input[type="radio"]:checked')?.value) || 1;

        questions.push({ text: questionText, options, correct });
    });

    if (questions.length === 0) {
        showStatus('Add at least one question', true);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, questions, editId }),
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            showStatus(`Quiz ${editId ? 'updated' : 'created'} successfully!`);
            setTimeout(() => navigateTo('/list'), 1500);
        } else {
            showStatus(data.error || 'Save failed', true);
        }
    } catch (err) {
        showStatus('Save error: ' + err.message, true);
    }
}

// Add Question
function addQuestion(questionData = null) {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    const questionNum = ++questionCount;
    const div = document.createElement('div');
    div.className = 'question-group';
    div.innerHTML = `
        <h3>Question ${questionNum}</h3>
        <div class="form-group">
            <input type="text" id="question${questionNum}" placeholder="Enter question text" required 
                   value="${questionData ? questionData.text : ''}">
        </div>
        <div class="options">
            ${[1, 2, 3, 4].map(opt => `
                <div class="form-group">
                    <label>Option ${opt}:</label>
                    <input type="text" id="q${questionNum}opt${opt}" required 
                           value="${questionData ? questionData.options[opt - 1] : ''}">
                </div>
            `).join('')}
        </div>
        <div class="correct-answer">
            <label>Correct Answer:</label>
            ${[1, 2, 3, 4].map(opt => `
                <label>
                    <input type="radio" name="correct${questionNum}" value="${opt}" 
                           ${questionData && questionData.correct === opt ? 'checked' : ''}>
                    Option ${opt}
                </label>
            `).join('')}
        </div>
        <button type="button" onclick="removeQuestion(${questionNum})">Remove Question</button>
    `;
    container.appendChild(div);
}

// Remove Question
function removeQuestion(num) {
    const group = document.getElementById(`questionGroup${num}`);
    if (group) group.remove();
}

// Load Quiz for Edit
async function loadQuizForEdit(quizId) {
    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`);
        const quiz = await response.json();
        if (quiz) {
            document.getElementById('title').value = quiz.title;
            document.querySelector('h1').textContent = 'Edit Quiz';
            
            // Clear existing questions
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';
            questionCount = 0;
            
            // Add questions from quiz
            quiz.questions.forEach(q => addQuestion(q));
        }
    } catch (err) {
        showStatus('Load error: ' + err.message, true);
    }
}

// Load My Quizzes
async function loadMyQuizzes() {
    try {
        const response = await fetch(`${API_BASE}/myquizzes`, { credentials: 'include' });
        const quizzes = await response.json();
        const list = document.getElementById('quizzesList');
        if (list) {
            list.innerHTML = quizzes.map(q => `
                <div class="quiz-card">
                    <h3>${q.title}</h3>
                    <p>Questions: ${q.questions.length}</p>
                    <button onclick="editQuiz(${q.id})">Edit</button>
                    <button onclick="deleteQuiz(${q.id})">Delete</button>
                    <button onclick="startQuiz(${q.id})">Start (Preview)</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Load my quizzes error:', err);
    }
}

// Load All Quizzes
async function loadAllQuizzes() {
    try {
        const response = await fetch(`${API_BASE}/quizzes`);
        const quizzes = await response.json();
        const list = document.getElementById('allQuizzesList');
        if (list) {
            list.innerHTML = quizzes.map(q => `
                <div class="quiz-card">
                    <h3>${q.title}</h3>
                    <p>By: ${q.username || 'Unknown'} | Questions: ${q.questions.length}</p>
                    <button onclick="startQuiz(${q.id})">Take Quiz</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Load all quizzes error:', err);
    }
}

// Edit Quiz
function editQuiz(quizId) {
    navigateTo(`/create?edit=${quizId}`);
}

// Delete Quiz
async function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            showStatus('Quiz deleted successfully');
            loadMyQuizzes();
        } else {
            showStatus(data.error || 'Delete failed', true);
        }
    } catch (err) {
        showStatus('Delete error: ' + err.message, true);
    }
}

// Start Quiz
function startQuiz(quizId) {
    window.location.href = `/take?id=${quizId}`;
}

// Load Quiz for Taking
async function loadQuiz(quizId) {
    try {
        const response = await fetch(`${API_BASE}/quizzes/${quizId}`);
        currentQuiz = await response.json();
        if (!currentQuiz) {
            showStatus('Quiz not found', true);
            setTimeout(() => navigateTo('/'), 1500);
            return;
        }
        
        const title = document.getElementById('quizTitle');
        if (title) title.textContent = currentQuiz.title;
        
        userAnswers = new Array(currentQuiz.questions.length).fill(null);
        showQuestion(0);
    } catch (err) {
        showStatus('Load quiz error: ' + err.message, true);
    }
}

// Show current question
let currentQuestionIndex = 0;
let userAnswers = [];

function showQuestion(index) {
    if (!currentQuiz || index >= currentQuiz.questions.length) {
        submitQuiz();
        return;
    }
    
    currentQuestionIndex = index;
    const q = currentQuiz.questions[index];
    const content = document.getElementById('quizContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="question-card">
            <h3>${index + 1}. ${q.text}</h3>
            ${q.options.map((opt, i) => `
                <label class="option">
                    <input type="radio" name="answer" value="${i + 1}" 
                           ${userAnswers[index] === i + 1 ? 'checked' : ''}>
                    ${opt}
                </label>
            `).join('')}
            <div class="quiz-nav">
                <button onclick="showQuestion(${index - 1})" ${index === 0 ? 'disabled' : ''}>
                    Previous
                </button>
                <button onclick="showQuestion(${index + 1})">
                    ${index === currentQuiz.questions.length - 1 ? 'Submit' : 'Next'}
                </button>
            </div>
        </div>
    `;
    
    updateProgress();
    
    // Add event listener for answer selection
    const radios = content.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            userAnswers[index] = parseInt(e.target.value);
        });
    });
}

// Update progress bar
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
}

// Submit Quiz
async function submitQuiz() {
    try {
        const response = await fetch(`${API_BASE}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                quizId: currentQuiz.id, 
                answers: userAnswers 
            })
        });
        const results = await response.json();
        showResults(results);
    } catch (err) {
        showStatus('Submit error: ' + err.message, true);
    }
}

// Show Results
function showResults(data) {
    const quizContent = document.getElementById('quizContent');
    const progressBar = document.querySelector('.progress-bar');
    const resultsDiv = document.getElementById('results');
    const score = document.getElementById('score');
    const resultsList = document.getElementById('resultsList');
    
    if (quizContent) quizContent.style.display = 'none';
    if (progressBar) progressBar.style.display = 'none';
    if (resultsDiv) resultsDiv.style.display = 'block';
    
    if (score) {
        const percentage = Math.round((data.score / data.total) * 100);
        score.innerHTML = `Score: ${data.score}/${data.total} (${percentage}%)`;
    }
    
    if (resultsList) {
        resultsList.innerHTML = data.results.map((q, i) => `
            <div class="result-item ${q.isCorrect ? 'correct' : 'wrong'}">
                <h4>${i + 1}. ${q.text}</h4>
                <p>Your answer: ${q.selected ? q.options[q.selected - 1] : 'Not answered'}</p>
                <p>Correct answer: ${q.options[q.correct - 1]}</p>
                ${!q.isCorrect ? `<p class="wrong-answer">Your answer was incorrect</p>` : ''}
            </div>
        `).join('');
    }
}

// Show status message
function showStatus(msg, isError = false) {
    const status = document.getElementById('status');
    if (status) {
        status.innerHTML = `<p class="${isError ? 'error' : ''}">${msg}</p>`;
        setTimeout(() => {
            if (status) status.innerHTML = '';
        }, 3000);
    }
}

// Initialize auth check on home page
if (window.location.pathname === '/') {
    window.addEventListener('DOMContentLoaded', checkAuth);
}