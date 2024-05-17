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

function checkAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/connexion');
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/api/randonnees', (req, res) => {
  const sortBy = req.query.sort || 'nom';
  let orderByClause = 'ORDER BY nom ASC'; // Default sorting

  if (sortBy === 'popularite') {
    orderByClause = 'ORDER BY popularite DESC'; // Sorting by popularity in descending order
  }

  db.all(`SELECT id, nom, adresse, popularite FROM randonnees ${orderByClause}`, (err, rows) => {
    if (err) {
      console.error('Erreur de base de données:', err);
      res.status(500).send('Erreur de base de données');
      return;
    }
    res.json(rows);
  });
});


app.get('/randonnee/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'randonnee.html'));
});

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

app.get('/contribuer', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contribuer.html'));
});

app.post('/contribuer', checkAuth, (req, res) => {
  const { nom, description, adresse, popularite, photo } = req.body;
  db.run('INSERT INTO randonnees (nom, description, adresse, popularite, initial_popularite, photo) VALUES (?, ?, ?, ?, ?, ?)', 
    [nom, description, adresse, popularite, popularite, photo], function(err) {
      if (err) {
        console.error('Erreur de base de données:', err);
        res.status(500).send('Erreur de base de données');
        return;
      }
      res.redirect(`/randonnee/${this.lastID}`);
    });
});

app.get('/connexion', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'connexion.html'));
});

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

app.post('/connexion', (req, res) => {
  const { identifiant, mot_de_passe, nouveau_utilisateur } = req.body;

  if (nouveau_utilisateur) {
    db.get('SELECT * FROM utilisateurs WHERE identifiant = ?', [identifiant], (err, row) => {
      if (err) {
        console.error('Erreur de base de données:', err);
        res.status(500).json({ error: 'Erreur de serveur.' });
        return;
      }
      if (row) {
        res.json({ error: 'Identifiant déjà utilisé.' });
      } else {
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


app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ userId: req.session.userId, userIdentifiant: req.session.userIdentifiant });
  } else {
    res.json({ userId: null });
  }
});

app.post('/api/randonnees/:id/note', checkAuth, (req, res) => {
  const randonneeId = req.params.id;
  const utilisateurId = req.session.userId;
  const note = req.body.note;

  db.get('SELECT * FROM notes WHERE randonnee_id = ? AND utilisateur_id = ?', [randonneeId, utilisateurId], (err, row) => {
    if (err) {
      console.error('Erreur de base de données:', err);
      res.status(500).json({ error: 'Erreur de base de données' });
      return;
    }

    if (row) {
      res.json({ error: 'Vous avez déjà noté cette randonnée.' });
    } else {
      db.run('INSERT INTO notes (randonnee_id, utilisateur_id, note) VALUES (?, ?, ?)', [randonneeId, utilisateurId, note], function(err) {
        if (err) {
          console.error('Erreur de base de données:', err);
          res.status(500).json({ error: 'Erreur de base de données' });
          return;
        }

        db.get('SELECT initial_popularite FROM randonnees WHERE id = ?', [randonneeId], (err, randonnee) => {
          if (err) {
            console.error('Erreur de base de données:', err);
            res.status(500).json({ error: 'Erreur de base de données' });
            return;
          }

          db.get('SELECT AVG(note) AS moyenne FROM notes WHERE randonnee_id = ?', [randonneeId], (err, result) => {
            if (err) {
              console.error('Erreur de base de données:', err);
              res.status(500).json({ error: 'Erreur de base de données' });
              return;
            }

            const nouvelleMoyenne = (result.moyenne + randonnee.initial_popularite) / 2;
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
      });
    }
  });
});

app.listen(3000, () => {
  console.log('Serveur démarré sur le port 3000');
});
