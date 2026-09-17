import os
import re
import html
import markdown

skripsi_dir = r"c:\A_main_code\all-my-projek\A-TA\skripsi"
md_path = os.path.join(skripsi_dir, "skripsi-lengkap.md")
html_path = os.path.join(skripsi_dir, "skripsi-lengkap.html")

# List of files in order
files_in_order = [
    "00-front-matter.md",
    "01-bab-i-pendahuluan.md",
    "02-bab-ii-tinjauan-pustaka.md",
    "03-bab-iii-metode-penelitian.md",
    "04-bab-iv-hasil-pembahasan.md",
    "05-bab-v-penutup.md",
    "06-daftar-pustaka.md",
    "07-daftar-riwayat-hidup.md",
    "08-lampiran.md"
]

# Concatenate all files
full_md = []
for fname in files_in_order:
    fpath = os.path.join(skripsi_dir, fname)
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read().strip()
            full_md.append(content)
            full_md.append("\n\n---\n\n")

combined_text = "".join(full_md)

# Save combined markdown
with open(md_path, "w", encoding="utf-8") as f:
    f.write(combined_text)

print(f"Combined markdown saved to {md_path} ({len(combined_text)} characters)")

# Pre-process mermaid code blocks into unique placeholders so markdown parser won't touch them
mermaid_blocks = {}
def save_mermaid(match):
    idx = len(mermaid_blocks)
    placeholder = f"<!--MERMAID_PLACEHOLDER_{idx}-->"
    raw_code = match.group(1).strip()
    mermaid_blocks[placeholder] = f'<div class="mermaid">\n{raw_code}\n</div>'
    return f"\n\n{placeholder}\n\n"

text = re.sub(r"```mermaid(.*?)```", save_mermaid, combined_text, flags=re.DOTALL)

# Add page break markers cleanly
# In our markdown files, each major section is already separated by \n\n---\n\n
text = re.sub(r"\n\s*---\s*\n", r"\n\n<div class='page-break'></div>\n\n", text)
text = re.sub(r"\n# (BAB [IVX]+)", r"\n\n<div class='page-break'></div>\n\n# \1", text)

# Eliminate any duplicate page breaks that create empty pages
text = re.sub(r"(<div class='page-break'></div>\s*){2,}", r"<div class='page-break'></div>\n", text)

# Convert Markdown to HTML
html_body = markdown.markdown(text, extensions=['tables', 'fenced_code', 'toc'])

# Clean up any page-breaks that were accidentally wrapped in paragraph tags
html_body = html_body.replace("<p><div class='page-break'></div></p>", "<div class='page-break'></div>")
html_body = re.sub(r"(<div class='page-break'></div>\s*){2,}", r"<div class='page-break'></div>\n", html_body)

# Restore mermaid divs
for placeholder, div_html in mermaid_blocks.items():
    html_body = html_body.replace(f"<p>{placeholder}</p>", div_html)
    html_body = html_body.replace(placeholder, div_html)

html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Skripsi A-TA - Adam Wahyu Kurniawan</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {{
      mermaid.initialize({{
        startOnLoad: true,
        theme: 'neutral',
        flowchart: {{ useMaxWidth: true, htmlLabels: true, curve: 'basis' }},
        sequence: {{ useMaxWidth: true, showSequenceNumbers: true }}
      }});
    }});
  </script>
  <style>
    @page {{
      size: A4;
      margin: 4cm 3cm 3cm 4cm;
      @bottom-right {{
        content: counter(page);
      }}
    }}
    body {{
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000000;
      background: #f8fafc;
      margin: 0;
      padding: 0;
    }}
    @media screen {{
      body {{
        background: #f1f5f9;
        padding: 30px 10px;
      }}
      .skripsi-container {{
        max-width: 820px;
        margin: 0 auto;
        padding: 50px 60px;
        background: #ffffff;
        box-shadow: 0 4px 25px rgba(0, 0, 0, 0.07);
        border: 1px solid #e2e8f0;
      }}
      .page-break {{
        page-break-before: always;
        break-before: page;
        margin: 35px 0 25px 0;
        border-top: 1px dashed #94a3b8;
        position: relative;
      }}
      .page-break::after {{
        content: "--- PEMISAH HALAMAN CETAK ---";
        display: block;
        text-align: center;
        font-size: 8.5pt;
        color: #94a3b8;
        background: #ffffff;
        width: 250px;
        margin: -10px auto 0 auto;
      }}
    }}
    @media print {{
      body {{
        background: #ffffff;
        padding: 0;
      }}
      .skripsi-container {{
        max-width: 100%;
        padding: 0;
        box-shadow: none;
        border: none;
      }}
      .page-break {{
        page-break-before: always;
        break-before: page;
        height: 0;
        margin: 0;
        padding: 0;
        border: none;
      }}
    }}
    h1 {{
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      color: #000000;
      margin-top: 15px;
      margin-bottom: 15px;
      line-height: 1.3;
    }}
    h2 {{
      font-size: 12pt;
      font-weight: bold;
      color: #000000;
      margin-top: 16px;
      margin-bottom: 8px;
    }}
    h3 {{
      font-size: 12pt;
      font-weight: bold;
      color: #000000;
      margin-top: 14px;
      margin-bottom: 6px;
    }}
    h4 {{
      font-size: 12pt;
      font-weight: bold;
      color: #000000;
      margin-top: 12px;
      margin-bottom: 4px;
    }}
    p {{
      text-align: justify;
      margin-top: 0;
      margin-bottom: 8px;
      text-indent: 1.25cm;
    }}
    p.no-indent, .no-indent p {{
      text-indent: 0;
    }}
    ul, ol {{
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 1.25cm;
    }}
    li {{
      margin-bottom: 5px;
      text-align: justify;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 20px 0;
      font-size: 10.5pt;
      background-color: #ffffff;
    }}
    th, td {{
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
    }}
    th {{
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: bold;
      text-align: center;
    }}
    tr:nth-child(even) td {{
      background-color: #f8fafc;
    }}
    blockquote {{
      margin: 14px 0;
      padding: 10px 16px;
      background-color: #f0fdf4;
      border-left: 4px solid #16a34a;
      color: #14532d;
      font-size: 10.5pt;
      border-radius: 0 6px 6px 0;
    }}
    pre {{
      background-color: #0f172a;
      color: #e2e8f0;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9.5pt;
      overflow-x: auto;
      margin: 14px 0;
      line-height: 1.4;
    }}
    code {{
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 10pt;
    }}
    pre code {{
      background-color: transparent;
      color: inherit;
      padding: 0;
    }}
    hr {{
      border: none;
      border-top: 2px solid #cbd5e1;
      margin: 30px 0;
    }}
    .mermaid {{
      text-align: center;
      margin: 20px auto;
      background-color: #ffffff;
      padding: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }}
    .daftar-pustaka p {{
      text-indent: -1.25cm;
      padding-left: 1.25cm;
      margin-bottom: 12px;
      text-align: justify;
    }}
  </style>
</head>
<body>
<div class="skripsi-container">
{html_body}
</div>
</body>
</html>
"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML generated successfully! File size:", len(html_content))
