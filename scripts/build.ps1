# Full build pipeline: sync -> hugo -> pagefind
# Usage: .\scripts\build.ps1 [-Source <repo dir>] [-BaseUrl https://host/] [-Serve]
# The source's settings/site.toml (sync copies it to build/) overlays hugo.toml.
[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$Source = "example/txt",
    [string]$BaseUrl = $env:HUGO_BASEURL,
    [switch]$Serve
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

# search.js is written against this Pagefind's JS API; bump both together.
$PagefindVersion = "1.5.2"

# "Stop" doesn't cover native commands in Windows PowerShell 5.1: check each exit code,
# or a failed sync still builds and indexes a partial site.
function Invoke-Step {
    & $args[0] @($args | Select-Object -Skip 1)
    if ($LASTEXITCODE -ne 0) { throw "$($args[0]) failed (exit $LASTEXITCODE)" }
}

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Source directory not found: '$Source'. Use -Source <path>, e.g. .\scripts\build.ps1 -Source C:\repo\txt"
}

Invoke-Step python scripts/sync_content.py $Source build/content

$config = if (Test-Path build/site.toml) { "hugo.toml,build/site.toml" } else { "hugo.toml" }

if ($Serve) {
    # -M keeps the live-reload render in memory so it never overwrites public/'s
    # built HTML with dev-mode markup; --renderStaticToDisk is what still lets
    # the server see Pagefind's index, which pagefind writes straight into
    # public/ after a full build and which -M alone would hide (Hugo's own
    # content/static/assets pipeline never touches it either way).
    hugo server -D -M --renderStaticToDisk --config $config
    exit
}

$hugoArgs = @("--minify", "--config", $config)
if ($BaseUrl) { $hugoArgs += @("-b", $BaseUrl) }

# Hugo does not remove stale pages from a previous build
if (Test-Path public) { Remove-Item -Recurse -Force public }
Invoke-Step hugo @hugoArgs

if (Get-Command pagefind -ErrorAction SilentlyContinue) {
    $found = ((pagefind --version) -split " ")[1]
    if ($found -ne $PagefindVersion) { Write-Warning "pagefind $found on PATH; this site pins $PagefindVersion" }
    Invoke-Step pagefind --site public
} else {
    Invoke-Step npx --yes "pagefind@$PagefindVersion" --site public
}
