const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'quiz-maker-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Data files
const USERS_FILE = 'users.json';
const QUIZZES_FILE = 'quizzes.json';

// Helper: Load JSON file or create empty
function loadJSON(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ users: [], quizzes: [] }, null, 2));
    return { users: [], quizzes: [] };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Helper: Save JSON file
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get current user
app.get('/api/user', (req, res) => {
  if (req.session.userId) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Register API
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const data = loadJSON(USERS_FILE);
  const existingUser = data.users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = data.users.length + 1;
  data.users.push({ id: userId, username, password: hashedPassword });
  saveJSON(USERS_FILE, data);

  req.session.userId = userId;
  req.session.username = username;
  res.json({ success: true, username });
});

// Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const data = loadJSON(USERS_FILE);
  const user = data.users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.username = username;
  res.json({ success: true, username });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Create/Edit Quiz API
app.post('/api/quizzes', requireAuth, (req, res) => {
  const { title, questions, editId } = req.body;
  const userId = req.session.userId;

  const data = loadJSON(QUIZZES_FILE);
  
  if (editId) {
    // Edit existing
    const quizIndex = data.quizzes.findIndex(q => q.id == editId && q.userId === userId);
    if (quizIndex !== -1) {
      data.quizzes[quizIndex] = { ...data.quizzes[quizIndex], title, questions };
      saveJSON(QUIZZES_FILE, data);
      return res.json({ success: true, quizId: editId });
    }
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Create new
  const quizId = data.quizzes.length + 1;
  data.quizzes.push({ id: quizId, title, questions, userId, username: req.session.username });
  saveJSON(QUIZZES_FILE, data);
  res.json({ success: true, quizId });
});

// Get user's quizzes
app.get('/api/myquizzes', requireAuth, (req, res) => {
  const data = loadJSON(QUIZZES_FILE);
  const myQuizzes = data.quizzes.filter(q => q.userId === req.session.userId);
  res.json(myQuizzes);
});

// Get all quizzes
app.get('/api/quizzes', (req, res) => {
  const data = loadJSON(QUIZZES_FILE);
  res.json(data.quizzes);
});

// Delete quiz
app.delete('/api/quizzes/:id', requireAuth, (req, res) => {
  const quizId = parseInt(req.params.id);
  const userId = req.session.userId;
  const data = loadJSON(QUIZZES_FILE);
  const quizIndex = data.quizzes.findIndex(q => q.id === quizId && q.userId === userId);
  if (quizIndex !== -1) {
    data.quizzes.splice(quizIndex, 1);
    saveJSON(QUIZZES_FILE, data);
    return res.json({ success: true });
  }
  res.status(403).json({ error: 'Unauthorized' });
});

// Get single quiz
app.get('/api/quizzes/:id', (req, res) => {
  const quizId = parseInt(req.params.id);
  const data = loadJSON(QUIZZES_FILE);
  const quiz = data.quizzes.find(q => q.id === quizId);
  if (quiz) {
    res.json(quiz);
  } else {
    res.status(404).json({ error: 'Quiz not found' });
  }
});

// Submit quiz answers
app.post('/api/results', (req, res) => {
  const { quizId, answers } = req.body;
  const data = loadJSON(QUIZZES_FILE);
  const quiz = data.quizzes.find(q => q.id === quizId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  let score = 0;
  const results = quiz.questions.map((q, i) => {
    const isCorrect = q.correct === answers[i];
    if (isCorrect) score++;
    return { ...q, selected: answers[i], isCorrect };
  });

  res.json({ score, total: quiz.questions.length, results, title: quiz.title });
});

// Serve pages
app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create.html'));
});

app.get('/list', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

app.get('/take/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'take.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});