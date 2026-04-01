import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_VBIYZSC9nUX5@ep-fragrant-violet-a1a9ir2v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

// Find arton branch + org
const [branch] = await sql`SELECT id, name FROM branches WHERE slug = 'arton' LIMIT 1`;
console.log('Branch:', branch?.id, branch?.name);

const [org] = await sql`SELECT id FROM organizations LIMIT 1`;
console.log('Org:', org?.id);

// Check if exists
const [existing] = await sql`SELECT id FROM users WHERE email = 'driver.arton@auntsallys.ph' LIMIT 1`;
if (existing) {
  console.log('Driver already exists! ID:', existing.id);
  await sql.end();
  process.exit(0);
}

// Create
const hash = await bcrypt.hash('Password123!', 10);
const [user] = await sql`
  INSERT INTO users (email, password_hash, first_name, last_name, role, org_id, branch_id, is_active)
  VALUES ('driver.arton@auntsallys.ph', ${hash}, 'Arton', 'Driver', 'driver', ${org.id}, ${branch.id}, true)
  RETURNING id, email, role, branch_id
`;
console.log('Created:', user);

await sql.end();
