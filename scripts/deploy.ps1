# 一键部署脚本（本机 PowerShell）
# 用法：.\scripts\deploy.ps1 -Server "user@服务器IP" [-RemoteDir /var/www/qhelper]
# 前置：本机能 SSH 免密（或愿意每次输密码）登录服务器；服务器已按 docs/deploy-self-hosted.md 配好 nginx
param(
    [Parameter(Mandatory = $true)][string]$Server,
    [string]$RemoteDir = "/var/www/qhelper",
    [string]$Archive = "/tmp/qhelper-dist.tar.gz"
)

$ErrorActionPreference = "Stop"

Write-Host "==> 1/4 构建" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "build 失败" }

Write-Host "==> 2/4 打包" -ForegroundColor Cyan
if (Test-Path dist.tar.gz) { Remove-Item dist.tar.gz }
tar -czf dist.tar.gz -C dist .

Write-Host "==> 3/4 上传到 $Server" -ForegroundColor Cyan
scp dist.tar.gz "${Server}:${Archive}"
if ($LASTEXITCODE -ne 0) { throw "scp 失败" }

Write-Host "==> 4/4 服务器解压覆盖" -ForegroundColor Cyan
$remote = "set -e; mkdir -p $RemoteDir; tar -xzf $Archive -C $RemoteDir; rm -f $Archive"
ssh $Server $remote
if ($LASTEXITCODE -ne 0) { throw "远端解压失败" }

Remove-Item dist.tar.gz
Write-Host "✓ 部署完成。验证：curl -sI https://你的域名/manifest.webmanifest" -ForegroundColor Green
