const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initDb, isPostgres } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'rifa_app_secret_key_12345'; // Simple JWT secret key

app.use(cors());
app.use(express.json());

// Serve static frontend files from parent directory (only needed for local dev fallback)
app.use(express.static(path.join(__dirname, '..')));

// JWT Verification Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Acceso no autorizado' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = user;
    });
}

// Database lazy initialization helper to avoid race conditions on Serverless cold starts
let dbInitialized = false;
let dbInitPromise = null;

async function ensureDb() {
    if (dbInitialized) return;
    if (!dbInitPromise) {
        dbInitPromise = initDb().then(() => {
            dbInitialized = true;
        }).catch(err => {
            dbInitPromise = null;
            throw err;
        });
    }
    return dbInitPromise;
}

async function checkDbInit(req, res, next) {
    // Skip db initialization for diagnostic route
    if (req.path === '/api/debug-env') {
        return next();
    }
    try {
        await ensureDb();
        next();
    } catch (err) {
        console.error("Database initialization failed during request:", err);
        res.status(500).json({ error: "La base de datos se está inicializando o falló. Reintenta." });
    }
}

// Register DB initialization check globally for all routes
app.use(checkDbInit);

// === AUTHENTICATION ENDPOINTS ===

// Register
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }
    
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    try {
        const [insertedUser] = await db('users').insert({
            email,
            name: name || '',
            password_hash: hash
        }).returning('id');
        
        const userId = typeof insertedUser === 'object' ? insertedUser.id : insertedUser;
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, email, name: name || email });
    } catch (err) {
        if (err.message.includes('UNIQUE') || err.message.includes('unique')) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }
    
    try {
        const user = await db('users').where({ email }).first();
        if (!user) return res.status(400).json({ error: 'Credenciales inválidas' });
        
        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Credenciales inválidas' });
        
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, email: user.email, name: user.name || user.email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/debug-env', async (req, res) => {
    const connUrl = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const info = {
        has_neon: !!process.env.NEON_DATABASE_URL,
        has_postgres: !!process.env.POSTGRES_URL,
        has_database: !!process.env.DATABASE_URL,
        isPostgres,
        dbInitialized,
        pg_url_prefix: connUrl ? connUrl.substring(0, 40) + '...' : null
    };
    
    // Try a real DB query with 5s timeout
    try {
        const result = await Promise.race([
            db.raw('SELECT 1 as ok'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timed out after 5s')), 5000))
        ]);
        info.db_connected = true;
        info.db_result = result.rows ? result.rows[0] : result[0];
    } catch (err) {
        info.db_connected = false;
        info.db_error = err.message;
    }
    
    // Check if tables exist
    try {
        const hasUsers = await db.schema.hasTable('users');
        const hasRaffles = await db.schema.hasTable('raffles');
        info.tables = { users: hasUsers, raffles: hasRaffles };
    } catch (err) {
        info.tables_error = err.message;
    }
    
    res.json(info);
});


// Get current profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ id: req.user.id, email: req.user.email });
});

// === RAFFLE MANAGEMENT ENDPOINTS ===

// Get all raffles
app.get('/api/raffles', authenticateToken, async (req, res) => {
    try {
        // Return raffles belonging to this user with computed ticket statistics
        const rows = await db('raffles as r')
            .select('r.*')
            .select(db.raw(`(SELECT COUNT(*) FROM tickets t WHERE t.raffle_id = r.id AND (t.name != '' OR t.phone != '')) AS sold_count`))
            .select(db.raw(`(SELECT COUNT(*) FROM tickets t WHERE t.raffle_id = r.id AND t.paid = ${isPostgres ? 'true' : '1'}) AS paid_count`))
            .where('r.user_id', req.user.id)
            .orderBy('r.created_at', 'desc');
            
        // Map postgres raw count results (which might return as strings/BigInt) to standard integers
        const formattedRows = rows.map(r => ({
            ...r,
            sold_count: parseInt(r.sold_count || 0, 10),
            paid_count: parseInt(r.paid_count || 0, 10)
        }));
        
        res.json(formattedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar las rifas' });
    }
});

// Create raffle
app.post('/api/raffles', authenticateToken, async (req, res) => {
    const { id, title, size, drawDate, ticketPrice } = req.body;
    if (!id || !title || !size) {
        return res.status(400).json({ error: 'Datos de la rifa incompletos' });
    }
    
    try {
        await db('raffles').insert({
            id,
            title,
            size,
            draw_date: drawDate,
            ticket_price: ticketPrice || 5000,
            user_id: req.user.id
        });
        
        // Initialize empty tickets
        const tickets = [];
        for (let i = 1; i <= size; i++) {
            tickets.push({
                raffle_id: id,
                number: i,
                name: '',
                phone: '',
                paid: false
            });
        }
        
        // Insert tickets in chunks of 100
        await db.batchInsert('tickets', tickets, 100);
        
        res.status(201).json({ message: 'Rifa creada exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la rifa' });
    }
});

// Update raffle settings
app.put('/api/raffles/:id', authenticateToken, async (req, res) => {
    const { title, drawDate, ticketPrice, size } = req.body;
    const raffleId = req.params.id;
    
    try {
        const row = await db('raffles').select('size').where({ id: raffleId, user_id: req.user.id }).first();
        if (!row) return res.status(404).json({ error: 'Rifa no encontrada' });
        
        const oldSize = row.size;
        const newSize = size !== undefined ? parseInt(size, 10) : oldSize;
        
        await db('raffles').where({ id: raffleId, user_id: req.user.id }).update({
            title,
            draw_date: drawDate,
            ticket_price: ticketPrice,
            size: newSize
        });
        
        if (newSize < oldSize) {
            // Delete excess tickets
            await db('tickets').where('raffle_id', raffleId).andWhere('number', '>', newSize).del();
        } else if (newSize > oldSize) {
            // Bulk insert new tickets
            const newTickets = [];
            for (let i = oldSize + 1; i <= newSize; i++) {
                newTickets.push({
                    raffle_id: raffleId,
                    number: i,
                    name: '',
                    phone: '',
                    paid: false
                });
            }
            await db.batchInsert('tickets', newTickets, 100);
        }
        
        res.json({ message: 'Rifa actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar la rifa' });
    }
});

// Delete raffle
app.delete('/api/raffles/:id', authenticateToken, async (req, res) => {
    try {
        await db('raffles').where({ id: req.params.id, user_id: req.user.id }).del();
        res.json({ message: 'Rifa eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar la rifa' });
    }
});

// Get tickets for a raffle
app.get('/api/raffles/:id/numbers', authenticateToken, async (req, res) => {
    const raffleId = req.params.id;
    
    try {
        const raffle = await db('raffles').select('size').where({ id: raffleId, user_id: req.user.id }).first();
        if (!raffle) return res.status(404).json({ error: 'Rifa no encontrada' });
        
        const tickets = await db('tickets').where('raffle_id', raffleId).orderBy('number', 'asc');
        const draws = await db('draws').where('raffle_id', raffleId).orderBy('timestamp', 'asc');
        
        // Construct numbers object matching the frontend structure
        const numbers = {};
        tickets.forEach(t => {
            numbers[t.number] = {
                number: t.number,
                name: t.name,
                phone: t.phone,
                paid: t.paid === 1 || t.paid === true
            };
        });
        
        // Format draws matching frontend structure
        const drawsFormatted = draws.map(d => ({
            type: d.type,
            number: d.number,
            buyer: {
                name: d.buyer_name,
                phone: d.buyer_phone,
                paid: d.buyer_paid === 1 || d.buyer_paid === true
            },
            timestamp: d.timestamp
        }));
        
        res.json({
            numbers,
            draws: drawsFormatted
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar números' });
    }
});

// Update ticket (Edit Buyer)
app.put('/api/tickets/:raffleId/:number', authenticateToken, async (req, res) => {
    const { raffleId, number } = req.params;
    const { name, phone, paid } = req.body;
    
    try {
        const raffle = await db('raffles').select('id').where({ id: raffleId, user_id: req.user.id }).first();
        if (!raffle) return res.status(403).json({ error: 'Acceso denegado' });
        
        await db('tickets').where({ raffle_id: raffleId, number }).update({
            name: name || '',
            phone: phone || '',
            paid: paid ? true : false
        });
        
        res.json({ message: 'Casillero guardado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar el casillero' });
    }
});

// Draw a winner / al agua
app.post('/api/raffles/:id/draws', authenticateToken, async (req, res) => {
    const raffleId = req.params.id;
    const { type, number, buyer } = req.body;
    
    try {
        const raffle = await db('raffles').select('id').where({ id: raffleId, user_id: req.user.id }).first();
        if (!raffle) return res.status(403).json({ error: 'Acceso denegado' });
        
        await db('draws').insert({
            raffle_id: raffleId,
            type,
            number,
            buyer_name: buyer.name || '',
            buyer_phone: buyer.phone || '',
            buyer_paid: buyer.paid ? true : false
        });
        
        res.status(201).json({ message: 'Sorteo registrado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar el sorteo' });
    }
});

// Bulk import tickets (used during Excel upload or Old data migration)
app.post('/api/raffles/:id/import', authenticateToken, async (req, res) => {
    const raffleId = req.params.id;
    const { ticketsList } = req.body; // Array of { number, name, phone, paid }
    
    if (!ticketsList || !Array.isArray(ticketsList)) {
        return res.status(400).json({ error: 'Lista de números no válida' });
    }
    
    try {
        const raffle = await db('raffles').select('id').where({ id: raffleId, user_id: req.user.id }).first();
        if (!raffle) return res.status(403).json({ error: 'Acceso denegado' });
        
        // Execute inside transaction for atomicity and speed
        await db.transaction(async trx => {
            for (const t of ticketsList) {
                await trx('tickets')
                    .where({ raffle_id: raffleId, number: t.number })
                    .update({
                        name: t.name || '',
                        phone: t.phone || '',
                        paid: t.paid ? true : false
                    });
            }
        });
        
        res.json({ message: 'Datos importados exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al importar datos en bloque' });
    }
});

// Initialize database and start Express server (only starts listener if not running on Vercel as serverless function)
if (process.env.NODE_ENV !== 'test') {
    initDb().then(() => {
        // Vercel serverless environment starts app via handler export, so we only listen on local development.
        if (process.env.VERCEL) {
            console.log("Database initialized inside Vercel environment.");
        } else {
            app.listen(PORT, () => {
                console.log(`Server started on http://localhost:${PORT}`);
            });
        }
    }).catch(err => {
        console.error("Failed to initialize database:", err);
    });
}

// Export Express app for Vercel Serverless environment
module.exports = app;
