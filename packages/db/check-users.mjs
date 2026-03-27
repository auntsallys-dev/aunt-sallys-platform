import postgres from 'postgres';
const sql = postgres('postgresql://neondb_owner:npg_VBIYZSC9nUX5@ep-fragrant-violet-a1a9ir2v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
const users = await sql`SELECT email, role, first_name, last_name FROM users WHERE role != 'customer' ORDER BY role`;
console.log(JSON.stringify(users, null, 2));
await sql.end();
