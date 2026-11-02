# Embed fonts (Black Han Sans, IBM Plex Sans KR) into the deck so it looks the same on a PC without them. Needs PowerPoint.
# (Windows PowerShell 5 reads this file as ANSI, so no Korean in code: the deck is the only .pptx in this folder.)
param([string]$File = (Get-ChildItem $PSScriptRoot -Filter '*.pptx' | Select-Object -First 1).FullName)
$pp = New-Object -ComObject PowerPoint.Application
$p = $pp.Presentations.Open($File, $false, $false, $false)
$tmp = Join-Path $env:TEMP 'deck_embed.pptx'
$p.SaveAs($tmp, 24, -1)   # 24 = pptx, -1 = embed TrueType fonts
$p.Close(); $pp.Quit()
Move-Item $tmp $File -Force
Write-Output "fonts embedded: $File"
