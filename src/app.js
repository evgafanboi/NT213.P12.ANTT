const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  store: new SQLiteStore({ 
    db: 'data/sessions.sqlite',
    dir: path.join(__dirname, '..') 
  }),
  secret: process.env.SESSION_SECRET || 'your secret key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
