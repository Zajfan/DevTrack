param(
    [Parameter(Mandatory = $true)]
    [string] $PackageDirectory
)

$ErrorActionPreference = 'Stop'
$package = Get-ChildItem -Path $PackageDirectory -Filter '*_windows_x64.msi' | Select-Object -First 1
if (-not $package) { throw "No Windows x64 MSI package found in $PackageDirectory" }

$installCode = Start-Process msiexec.exe -ArgumentList @('/i', $package.FullName, '/qn', '/norestart') -Wait -PassThru
if ($installCode.ExitCode -notin @(0, 3010)) { throw "MSI installation failed with exit code $($installCode.ExitCode)" }

$uninstallRoots = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$installed = Get-ItemProperty $uninstallRoots -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like '*DevTrack*' -and $_.WindowsInstaller -eq 1 } |
    Select-Object -First 1
if (-not $installed) { throw 'DevTrack MSI installation did not register in Windows uninstall metadata' }

$exe = $null
$searchDirs = @($installed.InstallLocation, "$env:LOCALAPPDATA\Programs\DevTrack", "$env:ProgramFiles\DevTrack") |
    Where-Object { $_ -and (Test-Path $_) }
foreach ($dir in $searchDirs) {
    $candidate = Join-Path $dir 'devtrack-desktop.exe'
    if (Test-Path $candidate) { $exe = $candidate; break }
}
if (-not $exe) { throw "Could not find devtrack-desktop.exe in installed locations: $($searchDirs -join ', ')" }

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class WindowProbe {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr extra);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

try {
    $app = Start-Process -FilePath $exe -PassThru
    $deadline = (Get-Date).AddSeconds(45)
    $windowTitle = $null
    do {
        Start-Sleep -Seconds 2
        if ($app.HasExited) { throw "DevTrack exited during startup with code $($app.ExitCode)" }
        $null = [WindowProbe]::EnumWindows({
            param($window, $extra)
            if (-not [WindowProbe]::IsWindowVisible($window)) { return $true }
            [uint32]$owner = 0
            $null = [WindowProbe]::GetWindowThreadProcessId($window, [ref]$owner)
            if ($owner -ne $app.Id) { return $true }
            $length = [WindowProbe]::GetWindowTextLength($window)
            if ($length -gt 0) {
                $text = New-Object System.Text.StringBuilder ($length + 1)
                $null = [WindowProbe]::GetWindowText($window, $text, $text.Capacity)
                if ($text.ToString() -match 'DevTrack') { $script:windowTitle = $text.ToString(); return $false }
            }
            return $true
        }, [IntPtr]::Zero)
    } while (-not $windowTitle -and (Get-Date) -lt $deadline)
    if (-not $windowTitle) { throw 'DevTrack started but did not show a visible DevTrack window within 45 seconds' }
    Write-Host "Installed and launched $exe; visible window: $windowTitle"
} finally {
    Get-Process devtrack-desktop -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    $productCode = [regex]::Match([string]$installed.PSChildName, '^\{[0-9A-Fa-f-]{36}\}$').Value
    if ($productCode) {
        $uninstall = Start-Process msiexec.exe -ArgumentList @('/x', $productCode, '/qn', '/norestart') -Wait -PassThru
        if ($uninstall.ExitCode -notin @(0, 1605, 3010)) { throw "MSI cleanup failed with exit code $($uninstall.ExitCode)" }
    }
}
