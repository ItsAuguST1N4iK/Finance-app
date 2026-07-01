# start-expo.ps1 — Detect real Wi-Fi IP (ignore Hamachi / Radmin VPN) and start Expo Go

$wifiIP = $null

# Try Wi-Fi adapter directly
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue).IPAddress

# Fallback: first DHCP IPv4 that is not VPN / APIPA
if (-not $wifiIP) {
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.PrefixOrigin -eq 'Dhcp' -and
            $_.IPAddress -notmatch '^169\.' -and
            $_.IPAddress -notmatch '^25\.'  -and
            $_.IPAddress -notmatch '^26\.'
        } |
        Select-Object -First 1).IPAddress
}

if (-not $wifiIP) {
    Write-Error "Could not detect Wi-Fi IP. Set REACT_NATIVE_PACKAGER_HOSTNAME manually."
    exit 1
}

Write-Host ""
Write-Host "  LAN IP for Expo Go : $wifiIP" -ForegroundColor Green
Write-Host "  Make sure your phone is on the same Wi-Fi network." -ForegroundColor Cyan
Write-Host ""

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiIP
npx expo start --clear
