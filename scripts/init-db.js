// init-db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'randonnees.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS randonnees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    description TEXT,
    adresse TEXT,
    popularite INTEGER,
    photo TEXT
  )`, (err) => {
    if (err) {
      console.error('Erreur lors de la création de la table:', err.message);
    } else {
      console.log('Base de données initialisée avec succès.');
    }
    db.close();
  });
});
