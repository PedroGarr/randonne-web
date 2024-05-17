const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./init-db.js');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware pour vérifier si l'utilisateur est connecté
function checkAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/connexion');
  }
}

// Page d'accueil / Liste des randonnées
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API pour obtenir les randonnées avec tri
app.get('/api/randonnees', (req, res) => {
  const sortBy = req.query.sort || 'nom';
  db.all(`SELECT id, nom, adresse, popularite FROM randonnees ORDER BY ${sortBy}`, (err, rows) => {
    if (err) {
      console.error('Erreur de base de données:', err);
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
app.get('/api/randonnees/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM randonnees WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Erreur de base de données:', err);
      res.status(500).send('Erreur de base de données');
      return;
    }
    res.json(row);
  });
});

// Vérification de la session utilisateur pour la page de contribution
app.get('/contribuer', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contribuer.html'));
});

// Gestion de la soumission du formulaire de contribution
app.post('/contribuer', checkAuth, (req, res) => {
  const { nom, description, adresse, popularite, photo } = req.body;
  db.run('INSERT INTO randonnees (nom, description, adresse, popularite, photo) VALUES (?, ?, ?, ?, ?)', 
    [nom, description, adresse, popularite, photo], function(err) {
      if (err) {
        console.error('Erreur de base de données:', err);
        res.status(500).send('Erreur de base de données');
        return;
      }
      res.redirect(`/randonnee/${this.lastID}`);
    });
});

// Page de connexion
app.get('/connexion', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'connexion.html'));
});

// Route pour la déconnexion
app.get('/deconnexion', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
      res.status(500).send('Erreur lors de la déconnexion');
      return;
    }
    res.redirect('/');
  });
});

// Gestion de la connexion et de l'inscription
app.post('/connexion', (req, res) => {
  const { identifiant, mot_de_passe, nouveau_utilisateur } = req.body;

  if (nouveau_utilisateur) {
    // Vérifier si l'utilisateur existe déjà
    db.get('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant], (err, row) => {
      if (err) {
        console.error('Erreur de base de données:', err);
        res.status(500).json({ error: 'Erreur de serveur.' });
        return;
      }
      if (row) {
        res.json({ error: 'Identifiant déjà utilisé.' });
      } else {
        // Création d'un nouvel utilisateur
        bcrypt.hash(mot_de_passe, 10, (err, hash) => {
          if (err) {
            console.error('Erreur de hachage du mot de passe:', err);
            res.status(500).json({ error: 'Erreur de serveur.' });
            return;
          }
          db.run('INSERT INTO utilisateurs (identifiant, mot_de_passe) VALUES (?, ?)', [identifiant, hash], function(err) {
            if (err) {
              console.error('Erreur de base de données:', err);
              res.status(500).json({ error: 'Erreur de base de données.' });
              return;
            }
            req.session.userId = this.lastID;
            req.session.userIdentifiant = identifiant;
            res.json({ success: true });
          });
        });
      }
    });
  } else {
    // Connexion d'un utilisateur existant
    db.get('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant], (err, row) => {
      if (err) {
        console.error('Erreur de base de données:', err);
        res.status(500).json({ error: 'Erreur de serveur.' });
        return;
      }
      if (!row) {
        res.json({ error: 'Identifiant non trouvé.' });
      } else {
        bcrypt.compare(mot_de_passe, row.mot_de_passe, (err, result) => {
          if (err) {
            console.error('Erreur de comparaison de mot de passe:', err);
            res.status(500).json({ error: 'Erreur de serveur.' });
            return;
          }
          if (result) {
            req.session.userId = row.id;
            req.session.userIdentifiant = identifiant;
            res.json({ success: true });
          } else {
            res.json({ error: 'Mot de passe incorrect.' });
          }
        });
      }
    });
  }
});

// Endpoint pour vérifier l'état de la session utilisateur
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ userId: req.session.userId, userIdentifiant: req.session.userIdentifiant });
  } else {
    res.json({ userId: null });
  }
});

// API pour soumettre une note pour une randonnée
app.post('/api/randonnees/:id/note', checkAuth, (req, res) => {
  const randonneeId = req.params.id;
  const utilisateurId = req.session.userId;
  const note = req.body.note;

  // Vérifier si l'utilisateur a déjà noté cette randonnée
  db.get('SELECT * FROM notes WHERE randonnee_id = ? AND utilisateur_id = ?', [randonneeId, utilisateurId], (err, row) => {
    if (err) {
      console.error('Erreur de base de données:', err);
      res.status(500).json({ error: 'Erreur de base de données' });
      return;
    }

    if (row) {
      // L'utilisateur a déjà noté cette randonnée
      res.json({ error: 'Vous avez déjà noté cette randonnée.' });
    } else {
      // Ajouter la note à la base de données
      db.run('INSERT INTO notes (randonnee_id, utilisateur_id, note) VALUES (?, ?, ?)', [randonneeId, utilisateurId, note], function(err) {
        if (err) {
          console.error('Erreur de base de données:', err);
          res.status(500).json({ error: 'Erreur de base de données' });
          return;
        }

        // Calculer la nouvelle moyenne des notes
        db.get('SELECT AVG(note) AS moyenne FROM notes WHERE randonnee_id = ?', [randonneeId], (err, result) => {
          if (err) {
            console.error('Erreur de base de données:', err);
            res.status(500).json({ error: 'Erreur de base de données' });
            return;
          }

          const nouvelleMoyenne = result.moyenne;
          db.run('UPDATE randonnees SET popularite = ? WHERE id = ?', [nouvelleMoyenne, randonneeId], function(err) {
            if (err) {
              console.error('Erreur de base de données:', err);
              res.status(500).json({ error: 'Erreur de base de données' });
              return;
            }

            res.json({ success: true, moyenne: nouvelleMoyenne });
          });
        });
      });
    }
  });
});

app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});
