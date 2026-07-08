const knex = require('knex');
const path = require('path');

// Check for database URL to determine environment
const pgUrl = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
const isPostgres = !!pgUrl;

const dbConfig = isPostgres ? {
    client: 'pg',
    connection: {
        connectionString: pgUrl,
        ssl: { rejectUnauthorized: false }
    },
    pool: { min: 0, max: 5 },
    acquireConnectionTimeout: 8000
} : {
    client: 'sqlite3',
    connection: {
        filename: path.join(__dirname, '..', 'database.db')
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
            table.string('type').defaultTo('single'); // 'single' or 'list'
            table.integer('list_size').defaultTo(0);
            table.string('collaborator_key');
            table.timestamp('created_at').defaultTo(db.fn.now());
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
        });
    } else {
        // Migration: Add collaborator_key column if it doesn't exist
        const hasCollabKey = await db.schema.hasColumn('raffles', 'collaborator_key');
        if (!hasCollabKey) {
            await db.schema.table('raffles', table => {
                table.string('collaborator_key').defaultTo('');
            });
            // Seed random collaborator keys for existing rows
            const crypto = require('crypto');
            const rows = await db('raffles').select('id');
            for (const r of rows) {
                await db('raffles').where({ id: r.id }).update({
                    collaborator_key: crypto.randomBytes(16).toString('hex')
                });
            }
        }
        
        const hasType = await db.schema.hasColumn('raffles', 'type');
        if (!hasType) {
            await db.schema.table('raffles', table => {
                table.string('type').defaultTo('single');
                table.integer('list_size').defaultTo(0);
            });
        }
    }

    // Recreate tickets table if it has outdated schema (migration helper)
    if (await db.schema.hasTable('tickets') && !await db.schema.hasColumn('tickets', 'seller_id')) {
        await db.schema.dropTable('tickets');
    }

    // Create tickets table
    if (!await db.schema.hasTable('tickets')) {
        await db.schema.createTable('tickets', table => {
            table.string('raffle_id').references('id').inTable('raffles').onDelete('CASCADE');
            table.integer('seller_id').unsigned().notNullable();
            table.integer('number').notNullable();
            table.string('name').defaultTo('');
            table.string('phone').defaultTo('');
            table.boolean('paid').defaultTo(false);
            table.primary(['raffle_id', 'seller_id', 'number']);
        });
    }

    // Recreate draws table if it has outdated schema (migration helper)
    if (await db.schema.hasTable('draws') && !await db.schema.hasColumn('draws', 'seller_id')) {
        await db.schema.dropTable('draws');
    }

    // Create draws table
    if (!await db.schema.hasTable('draws')) {
        await db.schema.createTable('draws', table => {
            table.increments('id').primary();
            table.string('raffle_id').references('id').inTable('raffles').onDelete('CASCADE');
            table.integer('seller_id').unsigned();
            table.string('type').notNullable(); // 'winner' or 'alagua'
            table.integer('number').notNullable();
            table.string('buyer_name').defaultTo('');
            table.string('buyer_phone').defaultTo('');
            table.boolean('buyer_paid').defaultTo(false);
            table.timestamp('timestamp').defaultTo(db.fn.now());
        });
    }

    // Create raffle_collaborators table
    if (!await db.schema.hasTable('raffle_collaborators')) {
        await db.schema.createTable('raffle_collaborators', table => {
            table.string('raffle_id').references('id').inTable('raffles').onDelete('CASCADE');
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            table.primary(['raffle_id', 'user_id']);
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
