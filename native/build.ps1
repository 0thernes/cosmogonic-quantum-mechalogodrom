# Convenience build for the native reliquary engine (Windows + MinGW-w64 / WinLibs).
# Puts the WinLibs GCC toolchain on PATH if present, then configures + builds.
# Usage:  pwsh native/build.ps1            (Release)
#         pwsh native/build.ps1 -Shot      (build, then render a plate + hero BMP)
param([switch]$Shot)
$ErrorActionPreference = 'Stop'

# Best-effort: find a WinLibs MinGW install from winget and prepend its bin.
$pkgRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
if (Test-Path $pkgRoot) {
  $gpp = Get-ChildItem $pkgRoot -Recurse -Filter g++.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($gpp) { $env:Path = "$(Split-Path $gpp.FullName);$env:Path"; Write-Host "Toolchain: $($gpp.FullName)" }
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$gen = if (Get-Command mingw32-make -ErrorAction SilentlyContinue) { 'MinGW Makefiles' } else { $null }

if ($gen) { cmake -S $here -B "$here/build" -G $gen -DCMAKE_BUILD_TYPE=Release }
else      { cmake -S $here -B "$here/build" -DCMAKE_BUILD_TYPE=Release }
cmake --build "$here/build" -j 4

if ($Shot) {
  $exe = "$here/build/cqm_native.exe"
  & $exe "--shot=$here/build/plate.bmp" "--w1600x900"
  & $exe "--shot=$here/build/hero.bmp" "--hero" "--w1600x900"
  Write-Host "Wrote plate.bmp + hero.bmp in $here/build"
}
