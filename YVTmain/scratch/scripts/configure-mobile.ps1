param(
  [Parameter(Mandatory = $true)]
  [string]$ApiUrl
)

$uri = [Uri]$ApiUrl
if ($uri.Scheme -ne "https") {
  throw "The production API URL must use HTTPS."
}

$indexPath = Join-Path $PSScriptRoot "..\frontend\index.html"
$content = Get-Content $indexPath -Raw
$content = $content -replace '(<meta name="triptrail-api-url" content=")[^"]*(")', "`$1$ApiUrl`$2"
Set-Content -Path $indexPath -Value $content -NoNewline

Push-Location (Join-Path $PSScriptRoot "..")
try {
  npx cap sync
  if ($LASTEXITCODE -ne 0) {
    throw "Capacitor synchronization failed."
  }
} finally {
  Pop-Location
}
