import os
import re
import zipfile
import html
from xml.sax.saxutils import escape

skripsi_dir = r"c:\A_main_code\all-my-projek\A-TA\skripsi"
docx_path = os.path.join(skripsi_dir, "skripsi-lengkap.docx")

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

def clean_xml_text(text):
    if not text:
        return ""
    # Strip HTML tags if any
    text = re.sub(r"<[^>]+>", "", text)
    return escape(text)

def make_run(text, bold=False, italic=False, size_pt=12):
    rPr = []
    rPr.append('<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>')
    if bold:
        rPr.append('<w:b/>')
    if italic:
        rPr.append('<w:i/>')
    if size_pt:
        half_pts = int(size_pt * 2)
        rPr.append(f'<w:sz w:val="{half_pts}"/>')
        rPr.append(f'<w:szCs w:val="{half_pts}"/>')
    
    rPr_str = f"<w:rPr>{''.join(rPr)}</w:rPr>" if rPr else ""
    return f'<w:r>{rPr_str}<w:t xml:space="preserve">{clean_xml_text(text)}</w:t></w:r>'

def parse_markdown_inlines(line, default_bold=False, default_italic=False, size_pt=12):
    runs = []
    # Pattern to tokenize bold (**), italic (*), and code (`)
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', line)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**'):
            inner = token[2:-2]
            runs.append(make_run(inner, bold=True, italic=default_italic, size_pt=size_pt))
        elif token.startswith('*') and token.endswith('*') and len(token) > 1:
            inner = token[1:-1]
            runs.append(make_run(inner, bold=default_bold, italic=True, size_pt=size_pt))
        elif token.startswith('`') and token.endswith('`'):
            inner = token[1:-1]
            runs.append(make_run(inner, bold=default_bold, italic=default_italic, size_pt=size_pt))
        else:
            runs.append(make_run(token, bold=default_bold, italic=default_italic, size_pt=size_pt))
    return "".join(runs)

def make_p(inlines_xml, align="both", indent=True, space_after=120, space_before=0, line_spacing=360):
    pPr = []
    if align == "center":
        pPr.append('<w:jc w:val="center"/>')
    elif align == "right":
        pPr.append('<w:jc w:val="right"/>')
    elif align == "both":
        pPr.append('<w:jc w:val="both"/>')
    else:
        pPr.append('<w:jc w:val="left"/>')
        
    pPr.append(f'<w:spacing w:before="{space_before}" w:after="{space_after}" w:line="{line_spacing}" w:lineRule="auto"/>')
    
    if indent and align == "both":
        # 1.25 cm = 709 dxa
        pPr.append('<w:ind w:firstLine="709"/>')
    else:
        pPr.append('<w:ind w:firstLine="0"/>')
        
    pPr_str = f"<w:pPr>{''.join(pPr)}</w:pPr>"
    return f"<w:p>{pPr_str}{inlines_xml}</w:p>"

def make_heading(text, level=1):
    clean_t = text.strip("# \t\r\n")
    if level == 1:
        # BAB / Major Heading: Center, 14pt, Bold, Uppercase
        run = make_run(clean_t.upper(), bold=True, size_pt=14)
        return make_p(run, align="center", indent=False, space_before=240, space_after=240, line_spacing=360)
    elif level == 2:
        # Subbab A. : Left, 12pt, Bold
        run = make_run(clean_t, bold=True, size_pt=12)
        return make_p(run, align="left", indent=False, space_before=200, space_after=100, line_spacing=360)
    elif level == 3:
        run = make_run(clean_t, bold=True, size_pt=12)
        return make_p(run, align="left", indent=False, space_before=160, space_after=80, line_spacing=360)
    else:
        run = make_run(clean_t, bold=True, size_pt=12)
        return make_p(run, align="left", indent=False, space_before=120, space_after=60, line_spacing=360)

def make_page_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

def make_table_row(cells, is_header=False):
    tc_xmls = []
    for c in cells:
        c_text = c.strip()
        inlines = parse_markdown_inlines(c_text, default_bold=is_header, size_pt=10.5)
        p_xml = make_p(inlines, align="center" if is_header else "left", indent=False, space_after=60, space_before=60, line_spacing=240)
        
        shd = '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' if is_header else ""
        tc_xml = f"""<w:tc>
          <w:tcPr>
            {shd}
            <w:tcMar>
              <w:top w:w="120" w:type="dxa"/>
              <w:left w:w="160" w:type="dxa"/>
              <w:bottom w:w="120" w:type="dxa"/>
              <w:right w:w="160" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          {p_xml}
        </w:tc>"""
        tc_xmls.append(tc_xml)
    return f"<w:tr>{''.join(tc_xmls)}</w:tr>"

def make_table(rows_data):
    if not rows_data:
        return ""
    tr_xmls = []
    for idx, row in enumerate(rows_data):
        tr_xmls.append(make_table_row(row, is_header=(idx == 0)))
        
    return f"""<w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      {''.join(tr_xmls)}
    </w:tbl>"""

# Read and parse files into Word body XML
body_elements = []

for file_idx, fname in enumerate(files_in_order):
    fpath = os.path.join(skripsi_dir, fname)
    if not os.path.exists(fpath):
        continue
    
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    in_table = False
    table_rows = []
    in_code_block = False
    code_block_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Check code block (mermaid or others)
        if line.startswith("```"):
            if in_code_block:
                in_code_block = False
                # Format code block as centered boxed note
                code_text = "\n".join(code_block_lines[:15]) # cap lines
                code_run = make_run(f"[DIAGRAM MODEL]:\n{code_text}", italic=True, size_pt=9.5)
                body_elements.append(make_p(code_run, align="center", indent=False, space_after=120, space_before=120))
                code_block_lines = []
            else:
                in_code_block = True
                code_block_lines = []
            i += 1
            continue
            
        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue
            
        # Check page break markdown divider
        if re.match(r"^---+$", line):
            if in_table and table_rows:
                body_elements.append(make_table(table_rows))
                table_rows = []
                in_table = False
            body_elements.append(make_page_break())
            i += 1
            continue
            
        # Check Markdown table row
        if line.startswith("|") and line.endswith("|"):
            in_table = True
            raw_cells = [c.strip() for c in line.split("|")[1:-1]]
            # Check if separator row like |:---|:---|
            if all(re.match(r"^:?-+:?$", c) for c in raw_cells):
                i += 1
                continue
            table_rows.append(raw_cells)
            i += 1
            continue
        else:
            if in_table and table_rows:
                body_elements.append(make_table(table_rows))
                table_rows = []
                in_table = False
                
        # Empty line
        if not line:
            i += 1
            continue
            
        # Headings
        if line.startswith("# "):
            body_elements.append(make_heading(line, level=1))
        elif line.startswith("## "):
            body_elements.append(make_heading(line, level=2))
        elif line.startswith("### "):
            body_elements.append(make_heading(line, level=3))
        elif line.startswith("#### "):
            body_elements.append(make_heading(line, level=4))
        # Bullet list
        elif line.startswith("- ") or line.startswith("* "):
            bullet_text = line[2:].strip()
            inlines = parse_markdown_inlines(bullet_text)
            bullet_run = make_run("•  ", bold=True)
            body_elements.append(make_p(bullet_run + inlines, align="both", indent=False, space_after=80, space_before=40))
        # Numbered list
        elif re.match(r"^\d+\.\s+", line):
            m = re.match(r"^(\d+\.\s+)(.*)$", line)
            num_str = m.group(1)
            item_text = m.group(2)
            inlines = parse_markdown_inlines(item_text)
            num_run = make_run(num_str, bold=True)
            body_elements.append(make_p(num_run + inlines, align="both", indent=False, space_after=80, space_before=40))
        # Regular paragraph
        else:
            inlines = parse_markdown_inlines(line)
            # Detect centered notes or captions
            is_caption = line.startswith("*Gambar") or line.startswith("*Tabel") or line.startswith("*Sumber")
            if is_caption:
                body_elements.append(make_p(inlines, align="center", indent=False, space_after=120, space_before=40))
            else:
                body_elements.append(make_p(inlines, align="both", indent=True, space_after=120, space_before=0))
                
        i += 1
        
    if in_table and table_rows:
        body_elements.append(make_table(table_rows))
        table_rows = []
        in_table = False
        
    # Append page break between major files
    if file_idx < len(files_in_order) - 1:
        body_elements.append(make_page_break())

# Section Properties: A4 + UNINDRA Margins (Top 4cm, Left 4cm, Bottom 3cm, Right 3cm)
sectPr = """<w:sectPr>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="2268" w:right="1701" w:bottom="1701" w:left="2268" w:header="720" w:footer="720" w:gutter="0"/>
  <w:cols w:space="720"/>
  <w:docGrid w:linePitch="360"/>
</w:sectPr>"""

document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    {''.join(body_elements)}
    {sectPr}
  </w:body>
</w:document>"""

# Styles XML
styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:eastAsia="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
        <w:lang w:val="id-ID"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>"""

# Settings XML
settings_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>"""

# Content Types XML
content_types_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>"""

# Package Relationships XML
rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

# Document Relationships XML
doc_rels_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>"""

# Package into .docx zip
with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("[Content_Types].xml", content_types_xml)
    zf.writestr("_rels/.rels", rels_xml)
    zf.writestr("word/_rels/document.xml.rels", doc_rels_xml)
    zf.writestr("word/styles.xml", styles_xml)
    zf.writestr("word/settings.xml", settings_xml)
    zf.writestr("word/document.xml", document_xml)

file_size = os.path.getsize(docx_path)
print(f"SUKSES! File Word resmi berhasil digenerate: {docx_path} ({file_size} bytes)")
