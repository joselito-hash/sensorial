# Paso 2 de la limpieza del instalador falso "EdgeUpdSvc" (29/10/2026).
# Lo UNICO que cambia: quita de Windows Defender las 2 exclusiones que puso el malware:
#   - proceso  'FirefoxSetup.exe'
#   - carpeta  'C:\Users\Public\dEplOYradF423F\'
# Todo lo demas solo se lee. El resultado se guarda en "limpieza-admin.txt" junto a este archivo.

$out = Join-Path $PSScriptRoot 'limpieza-admin.txt'
function Section($t) { "`r`n=== $t ===" }

$r = & {
  Section 'Es administrador'
  ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  Section 'Exclusiones de Defender ANTES'
  $p = Get-MpPreference
  "Rutas:       " + ($p.ExclusionPath -join ' ; ')
  "Procesos:    " + ($p.ExclusionProcess -join ' ; ')
  "Extensiones: " + ($p.ExclusionExtension -join ' ; ')
  "IPs:         " + ($p.ExclusionIpAddress -join ' ; ')

  Section 'Quitando las exclusiones del malware'
  try {
    Remove-MpPreference -ExclusionProcess 'FirefoxSetup.exe' -ErrorAction Stop
    "Quitada exclusion de proceso FirefoxSetup.exe"
  } catch { "Proceso: $($_.Exception.Message)" }
  foreach ($ruta in 'C:\Users\Public\dEplOYradF423F\', 'C:\Users\Public\dEplOYradF423F') {
    try { Remove-MpPreference -ExclusionPath $ruta -ErrorAction Stop; "Quitada exclusion de ruta $ruta" } catch { "Ruta ${ruta}: $($_.Exception.Message)" }
  }

  Section 'Exclusiones de Defender DESPUES'
  $p = Get-MpPreference
  "Rutas:       " + ($p.ExclusionPath -join ' ; ')
  "Procesos:    " + ($p.ExclusionProcess -join ' ; ')

  Section 'Estado de Defender (que no lo hayan apagado)'
  $s = Get-MpComputerStatus
  "Antivirus activo:        $($s.AntivirusEnabled)"
  "Proteccion en tiempo real: $($s.RealTimeProtectionEnabled)"
  "Proteccion contra alteraciones: $($s.IsTamperProtected)"
  "DisableRealtimeMonitoring: $($p.DisableRealtimeMonitoring)"
  "DisableBehaviorMonitoring: $($p.DisableBehaviorMonitoring)"
  "DisableIOAVProtection:     $($p.DisableIOAVProtection)"
  "SubmitSamplesConsent:      $($p.SubmitSamplesConsent)"
  "MAPSReporting:             $($p.MAPSReporting)"

  Section 'Archivos de tareas programadas modificados desde el 29/10 00:30'
  Get-ChildItem C:\Windows\System32\Tasks -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge [datetime]'2026-10-29 00:30:00' } |
    Select-Object LastWriteTime, FullName | Format-Table -AutoSize | Out-String -Width 400

  Section 'Tareas cuyo XML menciona el malware'
  Get-ChildItem C:\Windows\System32\Tasks -Recurse -File -Force -ErrorAction SilentlyContinue |
    Select-String -Pattern 'Firefox|dEplOY|Users\\Public|snoaslo|vercel' -List -ErrorAction SilentlyContinue |
    ForEach-Object { "$($_.Path): $($_.Line.Trim())" }

  Section 'Tareas ocultas (sin descriptor de seguridad) en el registro'
  Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree' -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.GetValue('Id') -and -not $_.GetValue('SD') } |
    ForEach-Object { $_.Name -replace '^.*\\Tree', '' }
}

$r | Out-File $out -Encoding utf8
"Listo. Resultado guardado en: $out"
