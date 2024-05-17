const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database.db');

// Création d'une nouvelle instance de base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connecté à la base de données SQLite.');
  }
});

// Crée la table des utilisateurs si elle n'existe pas déjà
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS randonnees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT,
      description TEXT,
      adresse TEXT,
      popularite INTEGER,
      photo TEXT
    )`);

    db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    randonnee_id INTEGER,
    utilisateur_id INTEGER,
    note INTEGER,
    FOREIGN KEY(randonnee_id) REFERENCES randonnees(id),
    FOREIGN KEY(utilisateur_id) REFERENCES utilisateurs(id)
  )
`);


  db.run(`CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifiant TEXT UNIQUE,
    mot_de_passe TEXT
  )`, (err) => {
    if (err) {
      console.error('Erreur lors de la création de la table utilisateurs:', err);
    } else {
      console.log('Table utilisateurs prête.');
    }
  });
});


module.exports = db;
