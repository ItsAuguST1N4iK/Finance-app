# start-expo.ps1 - detect LAN IP and start Expo for physical devices (Expo Go)

param(
    [switch]$Clear,
    [ValidateSet('lan', 'tunnel', 'localhost')]
    [string]$HostMode = 'lan'
)

$wifiIP = $null

foreach ($alias in @('Wi-Fi', 'WLAN', 'Wireless Network Connection')) {
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias $alias -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } |
        Select-Object -First 1).IPAddress
    if ($wifiIP) { break }
}

if (-not $wifiIP) {
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' -and
            $_.IPAddress -notmatch '^169\.'
        } |
        Select-Object -First 1).IPAddress
}

if ($HostMode -eq 'lan') {
    if (-not $wifiIP) {
        Write-Host ""
        Write-Host "  Could not detect LAN IP. Falling back to tunnel mode." -ForegroundColor Yellow
        Write-Host "  Phone and PC must be on the same Wi-Fi for LAN mode." -ForegroundColor Yellow
        Write-Host ""
        $HostMode = 'tunnel'
    } else {
        $env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiIP
        Write-Host ""
        Write-Host "  LAN IP for Expo Go : $wifiIP" -ForegroundColor Green
        Write-Host "  QR URL should be exp://${wifiIP}:8081 (NOT 127.0.0.1)" -ForegroundColor Cyan
        Write-Host "  Phone must be on the same Wi-Fi network." -ForegroundColor Cyan
        Write-Host ""
    }
}

$expoArgs = @('expo', 'start', '--host', $HostMode)
if ($Clear) { $expoArgs += '--clear' }

npx @expoArgs
