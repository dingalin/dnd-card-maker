"""
Extract spell names from Hebrew D&D 5e SRD PDF
"""
from PyPDF2 import PdfReader
import re

pdf_path = "docs/dnd5_srd_hebrew.pdf"
reader = PdfReader(pdf_path)

print(f"Total pages: {len(reader.pages)}")

# Extract all text to a file
output = []
for i in range(len(reader.pages)):
    page = reader.pages[i]
    text = page.extract_text()
    if text:
        output.append(f"\n=== Page {i+1} ===\n")
        output.append(text)

# Save to file with UTF-8 encoding
with open("docs/srd_text.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print("Saved to docs/srd_text.txt")
