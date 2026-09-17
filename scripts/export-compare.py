"""Render an editable PaperLex draft as native translated/original paired pages."""
import json, sys, re
import pymupdf as fitz

source, draft_file, destination = sys.argv[1:4]
draft = json.load(open(draft_file, encoding='utf-8'))
original, translated = fitz.open(source), fitz.open(source)
cjk = fitz.Font('cjk')
overflow, preserved = [], 0
for spec in draft['pages']:
    index = spec['number'] - 1
    page = translated[index]
    if page.rotation:
        page.remove_rotation()
    page_rect = page.rect
    ready = []
    source_words = page.get_text('words')
    for b in spec['blocks']:
        if not b.get('text') or b.get('keepOriginal'):
            continue
        # Formula-only blocks retain their original glyphs and positioning.
        if re.search(r'[=∑∫≤≥∀∈]', b['source']) and len(re.findall(r'[A-Za-z]{3,}', b['source'])) < 4:
            preserved += 1
            continue
        rect = fitz.Rect(b['x'], b['y'], b['x'] + b['width'], b['y'] + b['height']) & page_rect
        if rect.is_empty:
            continue
        # Remove glyphs, not the image / vector objects behind or around them.
        for word in source_words:
            wr = fitz.Rect(word[:4])
            center = fitz.Point((wr.x0+wr.x1)/2, (wr.y0+wr.y1)/2)
            if center in rect:
                page.add_redact_annot(wr, fill=False, cross_out=False)
        ready.append((b, rect))
    page.apply_redactions(images=0, graphics=0, text=0)
    page.insert_font(fontname='PaperLexCJK', fontbuffer=cjk.buffer)
    for b, rect in ready:
        # Extend only into free vertical space; text and drawing bounds stop growth.
        bottom = min(page_rect.height - 20, rect.y1 + 30)
        for other in spec['blocks']:
            if other['id'] != b['id'] and other['y'] >= rect.y1 - 1 and other['x'] < rect.x1 and other['x']+other['width'] > rect.x0:
                bottom = min(bottom, other['y'] - 2)
        for image in page.get_image_info():
            obstacle = fitz.Rect(image['bbox'])
            if obstacle.y0 >= rect.y1 and obstacle.x0 < rect.x1 and obstacle.x1 > rect.x0:
                bottom = min(bottom, obstacle.y0 - 2)
        for drawing in page.get_drawings():
            obstacle = drawing['rect']
            if obstacle.y0 >= rect.y1 and obstacle.x0 < rect.x1 and obstacle.x1 > rect.x0:
                bottom = min(bottom, obstacle.y0 - 2)
        rect.y1 = max(rect.y1, bottom)
        size = min(18, max(8, b.get('fontSize', 10)))
        fitted = False
        while size >= 7:
            shape = page.new_shape()
            spare = shape.insert_textbox(rect, b['text'], fontname='PaperLexCJK', fontsize=size, lineheight=1.3)
            if spare >= 0:
                shape.commit()
                fitted = True
                break
            size -= .25
        if not fitted:
            overflow.append((spec['number'], b['source'], b['text']))
            page.insert_text((rect.x0, rect.y0 + 8), '译文过长，见末尾校对页', fontname='PaperLexCJK', fontsize=7)

out = fitz.open()
for i in range(len(original)):
    rect = original[i].rect
    page = out.new_page(width=rect.width*2, height=rect.height)
    page.show_pdf_page(fitz.Rect(0, 0, rect.width, rect.height), translated, i)
    page.show_pdf_page(fitz.Rect(rect.width, 0, rect.width*2, rect.height), original, i)
if overflow:
    # Full text is retained even when the source page has no safe free space.
    html = '<h1>超长译文校对页</h1>'
    import html as html_module
    for number, en, zh in overflow:
        html += '<h2>原文第 %s 页</h2><p>%s</p><p>%s</p>' % (number, html_module.escape(en), html_module.escape(zh))
    story = fitz.Story(html=html, user_css='body{font-size:11pt;line-height:1.6;font-family:sans-serif;}')
    import io
    buffer = io.BytesIO()
    writer = fitz.DocumentWriter(buffer)
    more = True
    while more:
        device = writer.begin_page(fitz.Rect(0, 0, 595, 842))
        more, _ = story.place(fitz.Rect(35, 35, 560, 807))
        story.draw(device)
        writer.end_page()
    writer.close()
    appendix = fitz.open(stream=buffer.getvalue(), filetype='pdf')
    out.insert_pdf(appendix)
out.subset_fonts()
out.save(destination, garbage=4, deflate=True)
print(json.dumps({'pages': len(original), 'overflow': len(overflow), 'preservedFormulas': preserved}))
