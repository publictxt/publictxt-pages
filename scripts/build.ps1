# Full build pipeline: sync -> hashtags -> hugo -> pagefind
# Usage: .\scripts\build.ps1 [-Source <repo dir>] [-BaseUrl https://host/] [-Serve]
param(
    [string]$Source = "example/txt",
    [string]$BaseUrl = $env:HUGO_BASEURL,
    [switch]$Serve
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

python scripts/sync_content.py $Source build/content
python scripts/extract_hashtags.py build/content

if ($Serve) {
    hugo server -D
    exit
}

$hugoArgs = @("--minify")
if ($BaseUrl) { $hugoArgs += @("-b", $BaseUrl) }

# Hugo does not remove stale pages from a previous build
if (Test-Path public) { Remove-Item -Recurse -Force public }
hugo @hugoArgs

if (Get-Command pagefind -ErrorAction SilentlyContinue) {
    pagefind --site public
} else {
    npx pagefind --site public
}
