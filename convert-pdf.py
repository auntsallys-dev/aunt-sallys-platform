#!/usr/bin/env python3

from weasyprint import HTML, CSS
import os
import sys

def convert_to_pdf(html_file, pdf_file):
    """Convert HTML file to PDF using WeasyPrint"""
    try:
        html_path = os.path.abspath(html_file)
        pdf_path = os.path.abspath(pdf_file)
        
        print(f"Converting {html_file}...")
        print(f"  Input:  {html_path}")
        print(f"  Output: {pdf_path}")
        
        HTML(html_path).write_pdf(pdf_path)
        
        # Check file size
        file_size = os.path.getsize(pdf_path) / (1024 * 1024)
        print(f"✓ {os.path.basename(pdf_file)} created ({file_size:.2f} MB)")
        return True
        
    except Exception as e:
        print(f"✗ Error converting {html_file}: {e}")
        return False

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Convert English manual
    en_html = os.path.join(base_dir, 'manual-en.html')
    en_pdf = os.path.join(base_dir, 'manual-en.pdf')
    
    success_en = convert_to_pdf(en_html, en_pdf)
    
    print()
    
    # Convert Filipino manual
    fil_html = os.path.join(base_dir, 'manual-fil.html')
    fil_pdf = os.path.join(base_dir, 'manual-fil.pdf')
    
    success_fil = convert_to_pdf(fil_html, fil_pdf)
    
    print()
    
    if success_en and success_fil:
        print("✅ Both PDFs completed successfully!")
        print(f"English: {en_pdf}")
        print(f"Filipino: {fil_pdf}")
        return 0
    else:
        print("❌ One or more conversions failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
