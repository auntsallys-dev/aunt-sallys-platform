const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    headless: 'shell'
  });
  
  // Use existing page with cookies
  const page = await browser.newPage();
  
  // Copy cookies from the host browser session
  await page.goto('https://claude.ai', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  const result = await page.evaluate(async () => {
    const r = await fetch('/api/organizations/080fd4e8-44cb-4be5-9564-df71a32c66b2/chat_conversations/b5f43602-81be-41ea-bc7e-19035fedc956?tree=True&rendering_mode=messages&render_all_tools=true');
    const d = await r.json();
    const msgs = d.chat_messages || [];
    const normalUI = (msgs[45].content||[])[4]?.input?.file_text || '';
    const proDash = (msgs[59].content||[])[3]?.input?.file_text || '';
    return { normalUI, proDash };
  });
  
  fs.writeFileSync('/tmp/wdf-normal-ui.jsx', result.normalUI);
  fs.writeFileSync('/tmp/wdf-pro-dashboard.jsx', result.proDash);
  console.log('normal ui:', result.normalUI.length, 'pro dash:', result.proDash.length);
  await browser.close();
})().catch(e => console.error(e.message));
