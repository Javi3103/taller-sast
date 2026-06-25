const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Configuración insegura
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Base de datos
const db = new sqlite3.Database(path.join(__dirname, '../database.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL,
    category_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);
  // Datos de ejemplo
  db.run(`INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Electrónica')`);
  db.run(`INSERT OR IGNORE INTO categories (id, name) VALUES (2, 'Ropa')`);
  db.run(`INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (1, 'Smartphone', 299.99, 1)`);
  db.run(`INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (2, 'Camiseta', 19.99, 2)`);
});

// ========== CATEGORÍAS (VULNERABLES) ==========

// Listar todas las categorías (se mostrarán sin escapar en el frontend -> XSS almacenado)
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// VULNERABLE A SQL INJECTION en búsqueda de categorías
app.get('/api/categories/search', (req, res) => {
  const searchTerm = req.query.name || '';
  // Concatenación directa -> SQLi
  const query = `SELECT * FROM categories WHERE name LIKE '%${searchTerm}%'`;
  console.log('[SQLi Categories]', query);
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Crear categoría (el nombre se guarda sin sanitizar -> XSS almacenado)
app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO categories (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

// Actualizar categoría
app.put('/api/categories/:id', (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  db.run('UPDATE categories SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Eliminar categoría
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM categories WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ========== PRODUCTOS (VULNERABILIDADES) ==========

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// SQL Injection en productos (ya existente)
app.get('/api/products/search', (req, res) => {
  const searchTerm = req.query.name || '';
  const query = `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`;
  console.log('[SQLi Products]', query);
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/products', (req, res) => {
  const { name, description, price, category_id } = req.body;
  db.run(
    'INSERT INTO products (name, description, price, category_id) VALUES (?, ?, ?, ?)',
    [name, description, price, category_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, description, price, category_id });
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { name, description, price, category_id } = req.body;
  const { id } = req.params;
  db.run(
    'UPDATE products SET name = ?, description = ?, price = ?, category_id = ? WHERE id = ?',
    [name, description, price, category_id, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ========== COMMAND INJECTION (peligroso, solo para demostración) ==========
// Endpoint que ejecuta cualquier comando del sistema
app.get('/api/exec', (req, res) => {
  const cmd = req.query.cmd || '';
  // MUY PELIGROSO: ejecuta directamente el comando
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.json({ command: cmd, error: error.message, stderr });
    }
    res.json({ command: cmd, stdout, stderr });
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor VULNERABLE corriendo en http://localhost:${PORT}`);
  console.log('⚠️  Inyecciones SQL, XSS y Command Injection habilitadas para pruebas educativas');
});