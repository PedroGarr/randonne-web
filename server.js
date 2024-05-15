// app.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Page d'accueil / Liste des randonnées
app.get('/', (req, res) => {
  db.all('SELECT id, nom, adresse FROM randonnees ORDER BY nom', (err, rows) => {
    if (err) {
      res.status(500).send('Erreur de base de données');
      return;
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// API pour obtenir les randonnées
app.get('/api/randonnees', (req, res) => {
  db.all('SELECT id, nom, adresse FROM randonnees ORDER BY nom', (err, rows) => {
    if (err) {
      res.status(500).send('Erreur de base de données');
      return;
    }
    res.json(rows);
  });
});

// Page d'une randonnée
app.get('/randonnee/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'randonnee.html'));
});

// API pour obtenir les détails d'une randonnée
app.get('/api/randonnee/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM randonnees WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).send('Erreur de base de données');
      return;
    }
    res.json(row);
  });
});

// Page de contribution
app.get('/contribuer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contribuer.html'));
});

// Soumission du formulaire de contribution
app.post('/contribuer', (req, res) => {
  const { nom, description, adresse, popularite, photo } = req.body;
  db.run('INSERT INTO randonnees (nom, description, adresse, popularite, photo) VALUES (?, ?, ?, ?, ?)', 
    [nom, description, adresse, popularite, photo], function(err) {
      if (err) {
        res.status(500).send('Erreur de base de données');
        return;
      }
      res.redirect(`/randonnee/${this.lastID}`);
    });
});

app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});
