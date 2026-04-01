const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');

const options = {
  format: 'A4',
  orientation: 'portrait',
  type: 'pdf',
  quality: '95',
  timeout: 120000,
  border: '0'
};

function convertFile(htmlPath, pdfPath, filename) {
  return new Promise((resolve, reject) => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    pdf.create(html, options).toFile(pdfPath, (err, result) => {
      if (err) {
        console.log(`✗ ${filename}: ${err.message}`);
        reject(err);
      } else {
        const size = (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2);
        console.log(`✓ ${filename} created (${size} MB)`);
        resolve(result);
      }
    });
  });
}

async function main() {
  try {
    console.log('Converting HTML files to PDF...\n');
    
    const enHtmlPath = path.join(__dirname, 'manual-en.html');
    const enPdfPath = path.join(__dirname, 'manual-en.pdf');
    
    const filHtmlPath = path.join(__dirname, 'manual-fil.html');
    const filPdfPath = path.join(__dirname, 'manual-fil.pdf');
    
    console.log('Converting English manual...');
    await convertFile(enHtmlPath, enPdfPath, 'manual-en.pdf');
    
    console.log('\nConverting Filipino manual...');
    await convertFile(filHtmlPath, filPdfPath, 'manual-fil.pdf');
    
    console.log('\n✅ Both PDFs completed successfully!');
    console.log(`English: ${enPdfPath}`);
    console.log(`Filipino: ${filPdfPath}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
