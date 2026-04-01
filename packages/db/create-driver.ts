import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

const [branch] = await sql`SELECT id, name FROM branches WHERE slug = 'arton' LIMIT 1`;
console.log('Branch:', branch?.id, branch?.name);

const [org] = await sql`SELECT id FROM organizations LIMIT 1`;
console.log('Org:', org?.id);

const [existing] = await sql`SELECT id, email FROM users WHERE email = 'driver.arton@auntsallys.ph' LIMIT 1`;
if (existing) {
  console.log('Already exists:', existing.email);
  await sql.end();
  process.exit(0);
}

const hash = await bcrypt.hash('Arton2026!', 10);
const [user] = await sql`
  INSERT INTO users (email, password_hash, first_name, last_name, role, org_id, branch_id, is_active)
  VALUES ('driver.arton@auntsallys.ph', ${hash}, 'Arton', 'Driver', 'driver', ${org.id}, ${branch.id}, true)
  RETURNING id, email, role, branch_id
`;
console.log('✅ Created driver:', user.email, '| Branch:', user.branch_id);
await sql.end();
