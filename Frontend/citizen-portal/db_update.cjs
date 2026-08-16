const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres.qmodhgbjhqkveaihtwmg:Tanveer2401@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to Supabase!");

        // Helper to run query and catch duplicate column/table errors gracefully
        const runSql = async (query) => {
            try {
                await client.query(query);
                console.log("Success:", query.split('\n')[0].substring(0, 50) + "...");
            } catch (err) {
                // Ignore "column already exists" or "relation already exists"
                if (err.code === '42701' || err.code === '42P07') {
                    console.log("Already exists, skipping:", query.split('\n')[0].substring(0, 50) + "...");
                } else {
                    console.error("Error executing:", query);
                    console.error(err.message);
                }
            }
        };

        // 002
        await runSql(`ALTER TABLE users ADD COLUMN address VARCHAR(500);`);
        await runSql(`ALTER TABLE users ADD COLUMN area VARCHAR(255);`);
        await runSql(`ALTER TABLE users ADD COLUMN city VARCHAR(100);`);
        await runSql(`ALTER TABLE users ADD COLUMN state VARCHAR(100);`);
        await runSql(`ALTER TABLE users ADD COLUMN postal_code VARCHAR(20);`);
        await runSql(`ALTER TABLE users ADD COLUMN latitude FLOAT;`);
        await runSql(`ALTER TABLE users ADD COLUMN longitude FLOAT;`);

        // 003
        await runSql(`ALTER TABLE issues ADD COLUMN source VARCHAR(50);`);

        await runSql(`
            CREATE TABLE emergency_contacts (
                id SERIAL PRIMARY KEY,
                service_type VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone_number VARCHAR(50) NOT NULL,
                area VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(100),
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                updated_at TIMESTAMP WITH TIME ZONE
            );
        `);
        await runSql(`CREATE INDEX ix_emergency_contacts_id ON emergency_contacts (id);`);
        await runSql(`CREATE INDEX ix_emergency_contacts_service_type ON emergency_contacts (service_type);`);
        await runSql(`CREATE INDEX ix_emergency_contacts_city ON emergency_contacts (city);`);

        await runSql(`
            CREATE TABLE user_consents (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                accepted_terms BOOLEAN NOT NULL,
                accepted_privacy BOOLEAN NOT NULL,
                accepted_audio_processing BOOLEAN NOT NULL,
                accepted_ai_processing BOOLEAN NOT NULL,
                ip_address VARCHAR(50),
                user_agent VARCHAR(500),
                consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            );
        `);
        await runSql(`CREATE INDEX ix_user_consents_id ON user_consents (id);`);
        await runSql(`CREATE INDEX ix_user_consents_user_id ON user_consents (user_id);`);

        console.log("All Database Updates Completed Successfully!");
    } catch (err) {
        console.error("Connection error:", err.message);
    } finally {
        await client.end();
    }
}

run();
