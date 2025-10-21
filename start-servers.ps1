# Web Scraper Pro - Reliable Server Starter
# This script ensures servers start correctly from any directory

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   Web Scraper Pro - Starting Servers" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Navigate to the script's directory
Set-Location $ScriptDir

Write-Host "Current directory: $PWD" -ForegroundColor Yellow
Write-Host ""

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found in '$PWD'." -ForegroundColor Red
    Write-Host "Please ensure you are running this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found package.json" -ForegroundColor Green
Write-Host ""

# Kill any existing Node processes
Write-Host "Stopping any existing Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Starting servers using cmd to ensure compatibility..." -ForegroundColor Yellow
Write-Host ""

# Use cmd to run npm (most reliable method)
cmd /c "npm run dev"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start servers." -ForegroundColor Red
    exit 1
}
