# 部署验证脚本（本机 PowerShell）
# 用法：.\scripts\verify-deploy.ps1 -Url "https://你的域名"
param(
    [Parameter(Mandatory = $true)][string]$Url
)

$ErrorActionPreference = "Stop"
$Url = $Url.TrimEnd('/')
$fail = 0

function Check($name, $ok, $detail) {
    if ($ok) { Write-Host "✓ $name $detail" -ForegroundColor Green }
    else { Write-Host "✗ $name $detail" -ForegroundColor Red; $script:fail++ }
}

Write-Host "验证 $Url ..." -ForegroundColor Cyan

# 1. 首页
try {
    $homeResp = Invoke-WebRequest -Uri "$Url/" -UseBasicParsing
    Check "首页" ($homeResp.StatusCode -eq 200) "($($homeResp.StatusCode))"
    $hasManifest = $homeResp.Content -match 'manifest\.webmanifest'
    $hasTouchIcon = $homeResp.Content -match 'apple-touch-icon'
    $hasTheme = $homeResp.Content -match 'theme-color'
    Check "index 引用 manifest" $hasManifest ""
    Check "index 引用 apple-touch-icon" $hasTouchIcon ""
    Check "index 引用 theme-color" $hasTheme ""
} catch {
    Check "首页" $false "无法访问：$($_.Exception.Message)"
}

# 2. manifest
try {
    $m = Invoke-WebRequest -Uri "$Url/manifest.webmanifest" -UseBasicParsing
    $ct = $m.Headers['Content-Type']
    Check "manifest 200" ($m.StatusCode -eq 200) "Content-Type: $ct"
    Check "manifest MIME 正确" ($ct -match 'manifest') "（应为 application/manifest+json）"
    $json = [Text.Encoding]::UTF8.GetString($m.Content) | ConvertFrom-Json
    Check "manifest name" ($json.name -match 'QHelper') "($($json.name))"
    Check "manifest icons" ($json.icons.Count -ge 2) "($($json.icons.Count) 个)"
} catch {
    Check "manifest" $false "无法访问：$($_.Exception.Message)"
}

# 3. Service Worker
try {
    $sw = Invoke-WebRequest -Uri "$Url/sw.js" -UseBasicParsing
    Check "sw.js 200" ($sw.StatusCode -eq 200) ""
} catch {
    Check "sw.js" $false "无法访问（SW 是离线+安装的硬前提）"
}

# 4. 图标
foreach ($icon in @('icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'apple-touch-icon.png', 'favicon.svg')) {
    try {
        $r = Invoke-WebRequest -Uri "$Url/$icon" -UseBasicParsing -Method Head
        Check "图标 $icon" ($r.StatusCode -eq 200) ""
    } catch {
        Check "图标 $icon" $false "无法访问"
    }
}

# 5. HTTPS 检查
Check "HTTPS" ($Url -match '^https://') "（SW 与添加至桌面强制要求）"

Write-Host ""
if ($fail -eq 0) {
    Write-Host "✓ 全部通过！鸿蒙手机：华为浏览器打开 → ∷ → 添加至桌面" -ForegroundColor Green
} else {
    Write-Host "✗ $fail 项未通过，对照 docs/deploy-self-hosted.md 排查" -ForegroundColor Red
}
