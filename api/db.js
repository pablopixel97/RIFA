const knex = require('knex');
const path = require('path');

// Check for database URL to determine environment
const pgUrl = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
const isPostgres = !!pgUrl;

const dbConfig = isPostgres ? {
    client: 'pg',
    connection: {
        connectionString: pgUrl,
        ssl: { rejectUnauthorized: false } // Required for Vercel Postgres / Neon SQL
    }
} : {
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, '..', 'database.db') // Root folder database.db file
    },
    useNullAsDefault: true
};

const db = knex(dbConfig);

// Initialize DB schema tables
async function initDb() {
    // Enable foreign keys for SQLite
    if (!isPostgres) {
        await db.raw('PRAGMA foreign_keys = ON');
    }

    // Create users table
    if (!await db.schema.hasTable('users')) {
        await db.schema.createTable('users', table => {
            table.increments('id').primary();
            table.string('email').unique().notNullable();
            table.string('name').defaultTo('');
            table.string('password_hash').notNullable();
            table.timestamp('created_at').defaultTo(db.fn.now());
        });
    } else {
        // Add name column if it doesn't exist (migration for existing DBs)
        const hasName = await db.schema.hasColumn('users', 'name');
        if (!hasName) {
            await db.schema.table('users', table => {
                table.string('name').defaultTo('');
            });
        }
    }

    // Create raffles table
    if (!await db.schema.hasTable('raffles')) {
        await db.schema.createTable('raffles', table => {
            table.string('id').primary();
            table.string('title').notNullable();
            table.integer('size').notNullable();
            table.string('draw_date');
            table.integer('ticket_price').defaultTo(5000);
            table.timestamp('created_at').defaultTo(db.fn.now());
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
        });
    }

    // Create tickets table
    if (!await db.schema.hasTable('tickets')) {
        await db.schema.createTable('tickets', table => {
            table.string('raffle_id').references('id').inTable('raffles').onDelete('CASCADE');
            table.integer('number').notNullable();
            table.string('name').defaultTo('');
            table.string('phone').defaultTo('');
            table.boolean('paid').defaultTo(false);
            table.primary(['raffle_id', 'number']);
        });
    }

    // Create draws table
    if (!await db.schema.hasTable('draws')) {
        await db.schema.createTable('draws', table => {
            table.increments('id').primary();
            table.string('raffle_id').references('id').inTable('raffles').onDelete('CASCADE');
            table.string('type').notNullable(); // 'winner' or 'alagua'
            table.integer('number').notNullable();
            table.string('buyer_name').defaultTo('');
            table.string('buyer_phone').defaultTo('');
            table.boolean('buyer_paid').defaultTo(false);
            table.timestamp('timestamp').defaultTo(db.fn.now());
        });
    }

    // Seed default administrator if users table is empty
    const bcrypt = require('bcryptjs');
    const userCount = await db('users').count('id as count').first();
    const count = parseInt(userCount.count || 0, 10);
    if (count === 0) {
        const defaultEmail = 'admin@rifa.com';
        const defaultPassword = 'admin123';
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(defaultPassword, salt);
        
        await db('users').insert({
            email: defaultEmail,
            name: 'Administrador',
            password_hash: hash
        });
        console.log("Default admin account created: admin@rifa.com / admin123");
    }
}

module.exports = {
    db,
    initDb,
    isPostgres
};
