#!/bin/sh
# 容器启动时根据证书与环境变量生成 Nginx 站点配置：
#   SSL_ENABLED=auto|true|false（默认 auto：检测到证书即启用 HTTPS）
#   SSL_CERT_PATH / SSL_KEY_PATH：证书与私钥路径
#   SERVER_NAME：server_name，默认 _
set -eu

log() { echo "[nginx-ssl] $*"; }

SSL_ENABLED="${SSL_ENABLED:-auto}"
SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/nginx/certs/fullchain.pem}"
SSL_KEY_PATH="${SSL_KEY_PATH:-/etc/nginx/certs/privkey.pem}"
SERVER_NAME="${SERVER_NAME:-_}"

case "$SSL_ENABLED" in
    auto)
        if [ -s "$SSL_CERT_PATH" ] && [ -s "$SSL_KEY_PATH" ]; then
            mode=https
        else
            mode=http
        fi
        ;;
    true|1|yes)
        mode=https
        ;;
    false|0|no)
        mode=http
        ;;
    *)
        log "invalid SSL_ENABLED=$SSL_ENABLED (expected auto|true|false)"
        exit 1
        ;;
esac

if [ "$mode" = https ]; then
    [ -s "$SSL_CERT_PATH" ] || { log "certificate not found: $SSL_CERT_PATH"; exit 1; }
    [ -s "$SSL_KEY_PATH" ] || { log "private key not found: $SSL_KEY_PATH"; exit 1; }
fi

export SERVER_NAME SSL_CERT_PATH SSL_KEY_PATH
envsubst '${SERVER_NAME} ${SSL_CERT_PATH} ${SSL_KEY_PATH}' \
    < "/etc/nginx/blog-templates/${mode}.conf.template" \
    > /etc/nginx/conf.d/default.conf

nginx -t
log "mode=$mode server_name=$SERVER_NAME"
