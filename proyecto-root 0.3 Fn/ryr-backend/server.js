const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer'); 
require('dotenv').config();

// 1. PRIMERO CREAMOS LA APLICACIÓN (Esto debe ir antes que cualquier app.use)
const app = express();

// 2. CONFIGURAMOS LOS MIDDLEWARES (Los "porteros")
app.use(cors());
app.use(express.json());
// Hacemos pública la carpeta uploads para que React pueda ver las imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. CONEXIÓN A LA BASE DE DATOS
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// 4. CONFIGURACIÓN DE MULTER (Subida de archivos)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

// ==========================================
// 5. RUTAS DE LA API
// ==========================================

// LEER DATOS PRINCIPALES (Administrador)
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LEER DATOS (Usuario Individual)
app.get('/api/tasks/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await pool.query('SELECT * FROM tasks WHERE LOWER(solicitante) = LOWER($1) ORDER BY id DESC', [email]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GUARDAR NUEVA SOLICITUD (Con archivos)
app.post('/api/tasks', upload.single('archivo'), async (req, res) => {
  try {
    const { area, actividad, prioridad, solicitante, fechaAsignacion, estado } = req.body;
    
    // Si subió archivo, armamos la URL
    const archivoUrl = req.file ? `http://localhost:3000/uploads/${req.file.filename}` : null;

    let notasIniciales = "";
    if (archivoUrl) {
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      notasIniciales = `[Usuario - ${timeString}]: 📎 Evidencia adjunta: ${archivoUrl}`;
    }

    const query = `
        INSERT INTO tasks (area, actividad, prioridad, solicitante, fecha_asignacion, estado, notas)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `;
    const values = [area, actividad, prioridad, solicitante, fechaAsignacion, estado, notasIniciales];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error en POST /api/tasks:", error);
    res.status(500).json({ error: "Error al guardar la tarea" });
  }
});

// ACTUALIZAR REGISTRO (Admin y Chat)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { area, actividad, prioridad, estado, encargado, fechaPactada, fechaFinalizacion, notas } = req.body;
        const query = `
            UPDATE tasks 
            SET area = $1, actividad = $2, prioridad = $3, estado = $4, encargado = $5, fecha_pactada = $6, fecha_finalizacion = $7, notas = $8
            WHERE id = $9 RETURNING *
        `;
        const values = [area, actividad, prioridad, estado, encargado, fechaPactada, fechaFinalizacion, notas, id];
        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ELIMINAR REGISTRO
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ success: true, message: "Registro eliminado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ARCHIVAR COMPLETADAS / RECHAZADAS
app.post('/api/tasks/archive', async (req, res) => {
    try {
        await pool.query(`
            INSERT INTO history_tasks (area, actividad, prioridad, estado, encargado, fecha_asignacion, fecha_pactada, fecha_finalizacion, notas, solicitante)
            SELECT area, actividad, prioridad, estado, encargado, fecha_asignacion, fecha_pactada, fecha_finalizacion, notas, solicitante 
            FROM tasks WHERE estado IN ('Completada', 'Rechazada')
        `);
        const result = await pool.query(`DELETE FROM tasks WHERE estado IN ('Completada', 'Rechazada') RETURNING *`);
        res.json({ archivedCount: result.rowCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LEER HISTÓRICO
app.get('/api/tasks/history', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM history_tasks ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend de MIP PLANS corriendo en puerto ${PORT}`));