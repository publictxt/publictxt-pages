# Full build pipeline: sync -> hashtags -> hugo -> pagefind
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

if (-not (Test-Path -LiteralPath $Source -PathType Container)) {
    throw "Source directory not found: '$Source'. Use -Source <path>, e.g. .\scripts\build.ps1 -Source C:\repo\txt"
}

python scripts/sync_content.py $Source build/content
python scripts/extract_hashtags.py build/content

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
hugo @hugoArgs

if (Get-Command pagefind -ErrorAction SilentlyContinue) {
    pagefind --site public
} else {
    npx pagefind --site public
}
