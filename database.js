// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Définir le chemin vers le fichier de base de données
const dbPath = path.resolve(__dirname, 'randonnees.db');

// Créer une nouvelle base de données ou ouvrir l'existante
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS randonnees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    description TEXT,
    adresse TEXT,
    popularite INTEGER,
    photo TEXT
  )`);
});

module.exports = db;
