# ============================================================
# OPPENGROK LAUNCHER
# Z:Drive / Vibe Coded AI / CLAUDECODE / Cosmogonic Quantum Mechalogodrom
#
# 4 Windows Terminal windows
# 10 tabs per window
# Each tab runs the command defined in $tabCommand (cwd = this repo)
# Visible tab title: ☢️ OPPENGROK 
# Uses REAL Windows Snap via atomic Win+Arrow chords
# Preserves the known-working snap logic
#
# NOTE: This repo path contains [ ] and spaces.
# The -d argument is always double-quoted so Windows Terminal accepts it.
#
# Workspace is resolved relative to this script (scripts/ lives inside the repo root).
# This makes the launcher survive moves/renames of the Vibe Coded AI tree.
# ============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspace = Split-Path -Parent $scriptDir   # repo root

$windowCount   = 4
$tabsPerWindow = 10

# Command executed in every tab.
# Must be provided as separate tokens for the argument array.
# If plain "grok" is not found, change this (examples below).
# Examples:
#   @("cmd", "/k", "grok")
#   @("pwsh", "-NoExit", "-Command", "grok")
#   @("cmd", "/k", "bun", "--bun", "grok")
$tabCommand = @("cmd", "/k", "grok")

# Emoji-safe visible tab title
$nuclearEmoji   = [char]::ConvertFromUtf32(0x2622) + [char]0xFE0F
$explosionEmoji = [char]::ConvertFromUtf32(0x1F4A5)
$visibleTabTitle = "$nuclearEmoji OPPENGROK $explosionEmoji"

# We no longer embed invisible markers in titles (they often get stripped by WT).
# Instead we detect "newly appeared" windows that match the visible title after each launch.
# This is more reliable across machines.

# Choose monitor strategy:
# "Primary" = Windows main display
# "Largest" = largest detected display, useful for your 43 inch LG TV
# "Index"   = manually choose by index
$monitorMode = "Largest"
$targetMonitorIndex = 0

Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class Win32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int X,
        int Y,
        int cx,
        int cy,
        uint uFlags
    );

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@

function Get-TargetScreen {
    $screens = [System.Windows.Forms.Screen]::AllScreens

    Write-Host "`nDetected monitors:" -ForegroundColor Cyan

    for ($i = 0; $i -lt $screens.Count; $i++) {
        $s = $screens[$i]
        $area = $s.Bounds.Width * $s.Bounds.Height

        Write-Host "[$i] Device=$($s.DeviceName) Primary=$($s.Primary) Bounds=$($s.Bounds) Area=$area"
    }

    switch ($monitorMode) {
        "Primary" {
            return [System.Windows.Forms.Screen]::PrimaryScreen
        }

        "Largest" {
            return $screens |
                Sort-Object { $_.Bounds.Width * $_.Bounds.Height } -Descending |
                Select-Object -First 1
        }

        "Index" {
            if ($targetMonitorIndex -ge $screens.Count) {
                throw "Monitor index $targetMonitorIndex does not exist. Detected monitors: $($screens.Count)"
            }

            return $screens[$targetMonitorIndex]
        }

        default {
            throw "Unknown monitor mode: $monitorMode"
        }
    }
}

function Get-WindowByTitleContains {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TitleFragment
    )

    $matches = New-Object System.Collections.Generic.List[IntPtr]

    $callback = {
        param([IntPtr]$hWnd, [IntPtr]$lParam)

        if ([Win32]::IsWindowVisible($hWnd)) {
            $sb = New-Object System.Text.StringBuilder 1024
            [void][Win32]::GetWindowText($hWnd, $sb, $sb.Capacity)

            $title = $sb.ToString()

            if ($title -like "*$TitleFragment*") {
                $matches.Add($hWnd)
            }
        }

        return $true
    }

    [void][Win32]::EnumWindows($callback, [IntPtr]::Zero)

    if ($matches.Count -gt 0) {
        return $matches[0]
    }

    return [IntPtr]::Zero
}

function Wait-WindowByTitleContains {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TitleFragment,

        [int]$TimeoutSeconds = 25
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    do {
        $hWnd = Get-WindowByTitleContains -TitleFragment $TitleFragment

        if ($hWnd -ne [IntPtr]::Zero) {
            return $hWnd
        }

        Start-Sleep -Milliseconds 250
    }
    while ((Get-Date) -lt $deadline)

    return [IntPtr]::Zero
}

# --- New reliable detection (no invisible chars in title) ---

function Get-WindowsMatchingTitle {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Fragment
    )

    $result = New-Object System.Collections.Generic.List[IntPtr]

    $callback = {
        param([IntPtr]$hWnd, [IntPtr]$lParam)

        if ([Win32]::IsWindowVisible($hWnd)) {
            $sb = New-Object System.Text.StringBuilder 1024
            [void][Win32]::GetWindowText($hWnd, $sb, $sb.Capacity)
            $title = $sb.ToString()

            if ($title -like "*$Fragment*") {
                $result.Add($hWnd)
            }
        }

        return $true
    }

    [void][Win32]::EnumWindows($callback, [IntPtr]::Zero)
    return $result
}

function Wait-NewWindowMatchingTitle {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Fragment,

        [IntPtr[]]$Exclude = @(),

        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    do {
        $current = Get-WindowsMatchingTitle -Fragment $Fragment

        foreach ($h in $current) {
            if ($h -notin $Exclude) {
                return $h
            }
        }

        Start-Sleep -Milliseconds 300
    }
    while ((Get-Date) -lt $deadline)

    return [IntPtr]::Zero
}

function Focus-WindowHard {
    param(
        [Parameter(Mandatory = $true)]
        [IntPtr]$Hwnd
    )

    # SW_RESTORE = 9
    [void][Win32]::ShowWindow($Hwnd, 9)

    Start-Sleep -Milliseconds 150

    [Win32]::SwitchToThisWindow($Hwnd, $true)
    [void][Win32]::SetForegroundWindow($Hwnd)

    Start-Sleep -Milliseconds 250
}

function Tap-Key {
    param(
        [Parameter(Mandatory = $true)]
        [byte]$Vk
    )

    $KEYEVENTF_KEYUP = 0x0002

    [Win32]::keybd_event($Vk, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 35
    [Win32]::keybd_event($Vk, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 35
}

function Send-AtomicWinArrowSnap {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("TopLeft", "TopRight", "BottomLeft", "BottomRight")]
        [string]$Quadrant
    )

    $VK_LWIN   = 0x5B
    $VK_LEFT   = 0x25
    $VK_UP     = 0x26
    $VK_RIGHT  = 0x27
    $VK_DOWN   = 0x28
    $VK_ESCAPE = 0x1B

    $KEYEVENTF_KEYUP = 0x0002

    $firstArrow = $null
    $secondArrow = $null

    switch ($Quadrant) {
        "TopLeft" {
            $firstArrow = $VK_LEFT
            $secondArrow = $VK_UP
        }

        "TopRight" {
            $firstArrow = $VK_RIGHT
            $secondArrow = $VK_UP
        }

        "BottomLeft" {
            $firstArrow = $VK_LEFT
            $secondArrow = $VK_DOWN
        }

        "BottomRight" {
            $firstArrow = $VK_RIGHT
            $secondArrow = $VK_DOWN
        }
    }

    # Hold Windows key so Snap Assist does not get a chance to hijack between arrows.
    [Win32]::keybd_event([byte]$VK_LWIN, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 60

    Tap-Key -Vk ([byte]$firstArrow)
    Start-Sleep -Milliseconds 60

    Tap-Key -Vk ([byte]$secondArrow)
    Start-Sleep -Milliseconds 60

    [Win32]::keybd_event([byte]$VK_LWIN, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)

    Start-Sleep -Milliseconds 250

    # Dismiss any Snap Assist ghost UI if it appears.
    Tap-Key -Vk ([byte]$VK_ESCAPE)
}

function Native-SnapWindowToQuadrant {
    param(
        [Parameter(Mandatory = $true)]
        [IntPtr]$Hwnd,

        [Parameter(Mandatory = $true)]
        [ValidateSet("TopLeft", "TopRight", "BottomLeft", "BottomRight")]
        [string]$Quadrant,

        [Parameter(Mandatory = $true)]
        [System.Windows.Forms.Screen]$Screen
    )

    $bounds = $Screen.Bounds

    # Put window clearly on the target monitor first.
    # This determines which monitor Windows Snap will operate on.
    $preWidth  = [int]($bounds.Width * 0.55)
    $preHeight = [int]($bounds.Height * 0.55)

    $preX = [int]($bounds.X + (($bounds.Width - $preWidth) / 2))
    $preY = [int]($bounds.Y + (($bounds.Height - $preHeight) / 2))

    $SWP_SHOWWINDOW = 0x0040

    [void][Win32]::SetWindowPos(
        $Hwnd,
        [IntPtr]::Zero,
        $preX,
        $preY,
        $preWidth,
        $preHeight,
        $SWP_SHOWWINDOW
    )

    Start-Sleep -Milliseconds 300

    Focus-WindowHard -Hwnd $Hwnd

    Send-AtomicWinArrowSnap -Quadrant $Quadrant

    Start-Sleep -Milliseconds 400
}

$targetScreen = Get-TargetScreen

Write-Host "`nUsing target monitor:" -ForegroundColor Green
Write-Host "Device:  $($targetScreen.DeviceName)"
Write-Host "Primary: $($targetScreen.Primary)"
Write-Host "Bounds:  $($targetScreen.Bounds)"
Write-Host ""

# Basic sanity checks
if (-not (Test-Path -LiteralPath $workspace)) {
    Write-Warning "Workspace directory does not exist: $workspace"
    Write-Warning "Tabs will still be created but may start in the wrong place."
}

$wtExe = Get-Command wt.exe -ErrorAction SilentlyContinue
if (-not $wtExe) {
    Write-Warning "wt.exe not found in PATH. Windows Terminal may not be installed or not added to PATH."
}

Write-Host "Each tab will run: $($tabCommand -join ' ')" -ForegroundColor DarkCyan
Write-Host "Starting directory for tabs: $workspace" -ForegroundColor DarkCyan
Write-Host "Detection fragment: OPPENGROK (for finding the windows to snap)" -ForegroundColor DarkCyan
Write-Host ""

$quadrants = @(
    "TopLeft",
    "TopRight",
    "BottomLeft",
    "BottomRight"
)

for ($w = 1; $w -le $windowCount; $w++) {

    # The visible tab title remains: ☢️ OPPENGROK 
    # We identify the newly-created window by appearance, not by marker in the title.

    # Build argument array properly.
    # Passing one giant string to Start-Process -ArgumentList causes WT to mis-parse
    # the "cmd /k grok" part.
    $wtArgs = @("-w", "-1")

    for ($t = 1; $t -le $tabsPerWindow; $t++) {
        # Clean title for every tab (no markers).
        $tabTitle = $visibleTabTitle

        if ($t -gt 1) {
            $wtArgs += ";"
        }

        # Each "nt" subcommand + its options + the program to run as separate tokens.
        $wtArgs += @(
            "nt",
            "--title", $tabTitle,
            "--suppressApplicationTitle",
            "-d", $workspace
        )
        $wtArgs += $tabCommand
    }

    # Use a simple reliable fragment for detection (the emoji can be finicky in GetWindowText).
    $detectFragment = "OPPENGROK"
    $launchTime = Get-Date

    $before = Get-WindowsMatchingTitle -Fragment $detectFragment

    Start-Process -FilePath "wt.exe" -ArgumentList $wtArgs

    # Give the new window + 10 tabs a moment to materialize.
    Start-Sleep -Milliseconds 600

    $hWnd = Wait-NewWindowMatchingTitle -Fragment $detectFragment -Exclude $before -TimeoutSeconds 30

    # Fallback: find a recently started WindowsTerminal / wt process main window.
    if ($hWnd -eq [IntPtr]::Zero) {
        Start-Sleep -Milliseconds 300
        $recent = Get-Process | Where-Object {
            ($_.ProcessName -like "*Terminal*" -or $_.ProcessName -eq "wt") -and
            $_.StartTime -and $_.StartTime -gt $launchTime
        } | Sort-Object StartTime -Descending | Select-Object -First 1

        if ($recent -and $recent.MainWindowHandle -ne 0 -and $recent.MainWindowHandle -ne [IntPtr]::Zero) {
            $hWnd = $recent.MainWindowHandle
            Write-Host "  (Used process fallback to locate window)" -ForegroundColor DarkGray
        }
    }

    if ($hWnd -eq [IntPtr]::Zero) {
        Write-Warning "Could not auto-detect OPPENGROK window $w for snapping (title detection or permissions)."
        Write-Host "  The 10 tabs should still have been created. Snap manually with Win+Arrow if needed." -ForegroundColor Yellow
        continue
    }

    $quadrant = $quadrants[$w - 1]

    Write-Host "Native snapping OPPENGROK window $w -> $quadrant" -ForegroundColor Green

    Native-SnapWindowToQuadrant `
        -Hwnd $hWnd `
        -Quadrant $quadrant `
        -Screen $targetScreen

    # Slower pacing reduces "group or resource is not in the correct state" errors
    # from Windows Terminal when rapidly creating multiple new windows.
    Start-Sleep -Milliseconds 950
}

Write-Host "`nBOOM: 4 windows x 10 OPPENGROK tabs each, native-snapped by Windows itself." -ForegroundColor Green
Write-Host "Workspace: $workspace" -ForegroundColor Cyan
