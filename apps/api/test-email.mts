// @ts-ignore
import postgres from '/Users/jmbonnevie/Projects/aunt-sallys/node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/src/index.js';
// @ts-ignore
import { Resend } from '/Users/jmbonnevie/Projects/aunt-sallys/node_modules/.pnpm/resend@6.10.0/node_modules/resend/dist/index.mjs';

const DATABASE_URL = 'postgresql://neondb_owner:npg_VBIYZSC9nUX5@ep-fragrant-violet-a1a9ir2v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const RESEND_API_KEY = 're_EPGaiPhp_GJdZFCAacmatpXqtu1qi347b';

const sql = postgres(DATABASE_URL, { ssl: 'require' });
const resend = new Resend(RESEND_API_KEY);

// Check customers with emails
console.log('--- DB Check ---');
const customers = await sql`
  SELECT id, first_name, last_name, email, email_order_updates 
  FROM customers 
  WHERE email IS NOT NULL 
  LIMIT 10
`;
console.log(`Customers with email: ${customers.length}`);
customers.forEach((c: any) => {
  console.log(`  ${c.first_name} ${c.last_name} | ${c.email} | opted_in=${c.email_order_updates}`);
});

const [{ count }] = await sql`SELECT COUNT(*) as count FROM customers WHERE email IS NOT NULL AND email_order_updates = true`;
console.log(`\nOpted-in count: ${count}`);

await sql.end();

// Send test email directly via Resend
console.log('\n--- Resend Test ---');
const result = await resend.emails.send({
  from: "Aunt Sally's Laundry <noreply@auntsallyslaundry.com>",
  to: ['jmbonnevie@gmail.com'],
  subject: "✅ Email System Test — Aunt Sally's",
  html: `
    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px">
      <h2 style="color:#0ABAB5">Email system is working!</h2>
      <p>This is a live test from Overseer. Resend + auntsallyslaundry.com domain are confirmed.</p>
      <p style="color:#6b7280;font-size:13px">Sent at: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT</p>
    </div>
  `,
});

if (result.error) {
  console.error('❌ Resend error:', result.error);
} else {
  console.log('✅ Email sent! ID:', result.data?.id);
}
