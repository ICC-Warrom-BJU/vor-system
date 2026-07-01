import zipfile
import re

path = 'PRD_VOR_System.docx'
with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')
texts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', xml)
print(''.join(texts))
