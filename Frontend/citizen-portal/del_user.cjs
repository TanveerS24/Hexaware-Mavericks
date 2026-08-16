const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres.qmodhgbjhqkveaihtwmg:Tanveer2401@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => {
    return client.query("DELETE FROM users WHERE email = 'nmokshasai7@gmail.com';");
}).then(() => {
    console.log('User deleted successfully');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
