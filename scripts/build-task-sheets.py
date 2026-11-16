"""Regenerate only the current task sheets from the exact website wording."""
from pathlib import Path
import json,subprocess,sys,shutil
from xml.sax.saxutils import escape
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'_vendor'))
import fitz
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,KeepTogether
pdfmetrics.registerFont(TTFont('Malgun',r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBold',r'C:\Windows\Fonts\malgunbd.ttf'))
extract="const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);vm.runInNewContext(fs.readFileSync('public/study-additions.js','utf8'),c);process.stdout.write(JSON.stringify({tasks:c.window.STUDY_TASKS,copy:c.window.STUDY_ADDITIONS}));"
for lang in ['ko','en']:
    source='public/'+('en/' if lang=='en' else '')+'tasks.js'
    data=json.loads(subprocess.check_output(['node','-e',extract,source],cwd=ROOT).decode('utf-8'))
    out=ROOT/'public/materials'/('en' if lang=='en' else '')
    mirror=ROOT.parent/'실험준비_v2'/'문구개정_20261117'/lang
    mirror.mkdir(parents=True,exist_ok=True)
    title_style=ParagraphStyle('title',fontName='MalgunBold',fontSize=19,leading=27,spaceAfter=20)
    body=ParagraphStyle('body',fontName='Malgun',fontSize=10.5,leading=18,spaceAfter=14,wordWrap='CJK' if lang=='ko' else None)
    heading=ParagraphStyle('heading',parent=body,fontName='MalgunBold',spaceBefore=8,spaceAfter=8)
    small=ParagraphStyle('small',parent=body,fontSize=9,leading=15,spaceAfter=6,textColor='#42536b')
    for key,(title,paragraphs) in data['tasks'].items():
        guide=data['copy'][lang]['materials'][key]
        story=[Paragraph(escape(title),title_style)]+[Paragraph(escape(p),body) for p in paragraphs]
        group=[Paragraph(escape(data['copy'][lang]['heading']+(' · '+guide['set'] if guide['set'] else '')),heading)]
        group += [Paragraph(escape(item),small) for item in guide['items']]
        if guide['where']:group.append(Paragraph(escape(guide['where']),small))
        story.append(KeepTogether(group))
        file=out/(key+'.pdf')
        SimpleDocTemplate(str(file),pagesize=(595.28,841.89),leftMargin=48,rightMargin=48,topMargin=44,bottomMargin=44,title=title,author='').build(story)
        with fitz.open(file) as doc:
            assert len(doc)==1,(lang,key,len(doc))
            text=' '.join(page.get_text() for page in doc)
            assert title in text and guide['items'][0].replace(' · ',' ')[:8] in text.replace(' · ',' '),(lang,key)
            assert '\ufffd' not in text
        shutil.copy2(file,mirror/file.name)
print('Updated 10 current task PDFs and dated Korean/English copies. Working documents unchanged.')
