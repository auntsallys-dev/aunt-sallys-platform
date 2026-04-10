import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const DATABASE_URL = 'postgresql://neondb_owner:npg_VBIYZSC9nUX5@ep-fragrant-violet-a1a9ir2v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const RESEND_API_KEY = 're_EPGaiPhp_GJdZFCAacmatpXqtu1qi347b';

const sql = neon(DATABASE_URL);
const resend = new Resend(RESEND_API_KEY);

// Check customers with emails
const customers = await sql`
  SELECT id, first_name, last_name, email, email_order_updates 
  FROM customers 
  WHERE email IS NOT NULL 
  LIMIT 10
`;
console.log('Customers with emails:', JSON.stringify(customers, null, 2));

// Check how many have emailOrderUpdates = true
const optedIn = await sql`
  SELECT COUNT(*) as count FROM customers WHERE email IS NOT NULL AND email_order_updates = true
`;
console.log('Opted in:', optedIn[0].count);

// Send a direct test email to verify Resend is working
console.log('\nSending test email via Resend...');
const result = await resend.emails.send({
  from: "Aunt Sally's Laundry <noreply@auntsallyslaundry.com>",
  to: ['jmbonnevie@gmail.com'],
  subject: "Test: Aunt Sally's Email System Check",
  html: `<h1>Email system test</h1><p>This is a test from Overseer. If you got this, Resend is working. Time: ${new Date().toISOString()}</p>`,
});
console.log('Resend result:', JSON.stringify(result, null, 2));
