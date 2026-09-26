# 自有服务器部署指南（nginx）

目标：把 QHelper PWA（`dist/` 目录）部署到你的云服务器，获得公网 HTTPS 地址，供鸿蒙手机浏览器「添加至桌面」使用。

## 前置条件

- 云服务器可 SSH 登录，有公网 IP（或已解析到它的域名）
- 已安装 nginx（没有的话：Ubuntu/Debian `sudo apt install nginx`；CentOS `sudo yum install nginx`）
- **HTTPS 必需**（Service Worker 与「添加至桌面」的硬要求）。有域名用 Let's Encrypt 免费证书（见下）；纯 IP 没有证书就无法 HTTPS，SW 会失效——强烈建议绑域名

## 第 1 步：本机构建并上传

在本机（C:\WorkSpace\QHelper）执行：

```powershell
npm run build
# 打包 dist 目录成 tar， scp 到服务器（替换 user 和 server 地址）
tar -czf dist.tar.gz -C dist .
scp dist.tar.gz user@你的服务器IP:/tmp/
```

## 第 2 步：服务器上解压

SSH 到服务器后：

```bash
sudo mkdir -p /var/www/qhelper
sudo tar -xzf /tmp/dist.tar.gz -C /var/www/qhelper
sudo chown -R www-data:www-data /var/www/qhelper   # CentOS 是 nginx:nginx
```

## 第 3 步：nginx 站点配置

创建 `/etc/nginx/sites-available/qhelper`（CentOS 放 `/etc/nginx/conf.d/qhelper.conf`）：

```nginx
server {
    listen 80;
    server_name 你的域名;        # 没域名就填服务器公网 IP

    root /var/www/qhelper;
    index index.html;

    # SPA 回退：所有找不到的路径回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service Worker：不缓存 SW 自身，保证更新即时生效
    location = /sw.js {
        add_header Cache-Control "no-cache";
    }

    # manifest
    location = /manifest.webmanifest {
        types { } default_type "application/manifest+json";
        add_header Cache-Control "public, max-age=3600";
    }

    # 带哈希的静态资源：长缓存
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 图标：中缓存（换图标时改 URL 的 ?v= 已处理击穿）
    location ~* \.(png|svg)$ {
        add_header Cache-Control "public, max-age=86400";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

启用站点并重载：

```bash
sudo ln -s /etc/nginx/sites-available/qhelper /etc/nginx/sites-enabled/   # CentOS 跳过
sudo nginx -t && sudo systemctl reload nginx
```

## 第 4 步：HTTPS（强烈建议）

有域名的话用 certbot 一键搞定：

```bash
sudo apt install certbot python3-certbot-nginx   # CentOS: sudo yum install certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

证书自动续期、80→443 跳转都会配好。

> 若只能用纯 IP（没有域名），HTTP 下 SW 不可用、应用退化为普通网页（功能都在，只是没有离线缓存和添加至桌面的完整体验）。建议花几十块买个域名，或用免费的 DuckDNS 子域名。

## 第 5 步：验证

浏览器访问 `https://你的域名/`，然后在本机或服务器上：

```bash
curl -sI https://你的域名/manifest.webmanifest | head -3     # 200 + application/manifest+json
curl -sI https://你的域名/sw.js | head -3                    # 200
curl -s https://你的域名/ | grep -o 'apple-touch-icon[^"]*'  # 引用存在
```

三项通过即部署成功。

## 第 6 步：鸿蒙手机使用

1. 华为浏览器打开 `https://你的域名/`
2. 首次加载完成后即可断网测试（SW 已缓存）
3. ∷ 菜单 → **添加至桌面** → 命名「QHelper」→ 桌面出现爱心图标
4. **备份习惯**：设置 → 导出全部数据（手机浏览器存储相对脆弱，定期导出）

## 更新部署

以后每次发新版：本机 `npm run build` → `tar` → `scp` → 服务器 `tar -xzf` 覆盖即可（SW autoUpdate 会自动拉新版本）。也可以把这几步写成一键脚本。
