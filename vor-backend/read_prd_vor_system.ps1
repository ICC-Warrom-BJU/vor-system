Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead('c:\Users\LENOVO\vor\vor-backend\PRD_VOR_System.docx')
$entry = $zip.GetEntry('word/document.xml')
$sr = $entry.Open()
$reader = New-Object IO.StreamReader($sr)
$xml = $reader.ReadToEnd()
$reader.Close()
$sr.Close()
$zip.Dispose()
$matches = [regex]::Matches($xml, '<w:t[^>]*>(.*?)</w:t>')
$text = ($matches | ForEach-Object { $_.Groups[1].Value }) -join ''
$text.Substring(0, [math]::Min(4000, $text.Length))
