$ErrorActionPreference = "Stop"

# Configuration
$EnvPath = Join-Path $PSScriptRoot "..\.env"
$BackupDir = Join-Path $PSScriptRoot "..\backups"
$DateStr = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "ascit_backup_$DateStr.sql"

# Read .env variables
$EnvVars = @{}
Get-Content $EnvPath | Where-Object { $_ -match "^([^#=]+)=(.*)$" } | ForEach-Object {
    $Name = $Matches[1].Trim()
    $Value = $Matches[2].Trim('"', "'", " ")
    $EnvVars[$Name] = $Value
}

$PgBinDir = $EnvVars["FLYENV_POSTGRES_BIN_DIR"]
$DbUrl = $EnvVars["DATABASE_URL"]

if (-not $PgBinDir -or -not (Test-Path $PgBinDir)) {
    Write-Host "Warning: FLYENV_POSTGRES_BIN_DIR is not set or invalid in .env" -ForegroundColor Yellow
    # Try default PATH
    $PgDump = "pg_dump.exe"
} else {
    $PgDump = Join-Path $PgBinDir "pg_dump.exe"
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Starting backup to $BackupFile ..." -ForegroundColor Cyan
& $PgDump --dbname=$DbUrl --file=$BackupFile --clean --if-exists

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully: $BackupFile" -ForegroundColor Green
    
    # Cleanup old backups (keep last 7 days)
    Get-ChildItem -Path $BackupDir -Filter "*.sql" | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
    Write-Host "Old backups cleaned up (kept last 7 days)." -ForegroundColor Green
} else {
    Write-Host "Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
