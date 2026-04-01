const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

function startLocalServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, req.url === '/' ? 'manual-en.html' : req.url.slice(1));
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
    });
    
    server.listen(8888, 'localhost', () => {
      resolve(server);
    });
  });
}

(async () => {
  let browser;
  let server;
  
  try {
    // Start local server
    server = await startLocalServer();
    console.log('Local server started on http://localhost:8888');
    
    // Wait a bit for server to stabilize
    await new Promise(r => setTimeout(r, 500));
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--single-process'
      ]
    });

    // English manual
    console.log('\nConverting manual-en.html to PDF...');
    const enPage = await browser.newPage();
    
    await enPage.goto('http://localhost:8888/manual-en.html', {
      waitUntil: 'networkidle0',
      timeout: 90000
    });
    
    console.log('Generating PDF...');
    
    await enPage.pdf({
      path: path.resolve(__dirname, 'manual-en.pdf'),
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      scale: 1.0
    });
    
    console.log('✓ manual-en.pdf created');
    await enPage.close();

    // Filipino manual
    console.log('\nConverting manual-fil.html to PDF...');
    const filPage = await browser.newPage();
    
    await filPage.goto('http://localhost:8888/manual-fil.html', {
      waitUntil: 'networkidle0',
      timeout: 90000
    });
    
    console.log('Generating PDF...');
    
    await filPage.pdf({
      path: path.resolve(__dirname, 'manual-fil.pdf'),
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      scale: 1.0
    });
    
    console.log('✓ manual-fil.pdf created');
    await filPage.close();

    console.log('\n✅ Both PDFs completed successfully!');
    console.log(`English: /Users/jmbonnevie/Projects/aunt-sallys/manual-en.pdf`);
    console.log(`Filipino: /Users/jmbonnevie/Projects/aunt-sallys/manual-fil.pdf`);
    
    // Verify
    const enSize = fs.statSync(path.resolve(__dirname, 'manual-en.pdf')).size;
    const filSize = fs.statSync(path.resolve(__dirname, 'manual-fil.pdf')).size;
    
    console.log(`\nFile sizes:`);
    console.log(`  manual-en.pdf: ${(enSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  manual-fil.pdf: ${(filSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();
