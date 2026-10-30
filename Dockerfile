# syntax=docker/dockerfile:1

# ---------- build ----------
FROM hugomods/hugo:0.165.0 AS build

WORKDIR /src
COPY . .

# 主题以 git submodule 提供，缺失时直接失败，避免产出无样式站点
RUN test -f themes/hugo-solo-nexmoe/theme.toml \
    || (echo "themes/hugo-solo-nexmoe 缺失：请先执行 git submodule update --init --recursive" >&2; exit 1)

RUN hugo --gc --minify --cleanDestinationDir

# ---------- runtime ----------
FROM nginx:1.30-alpine

COPY deploy/nginx/blog.conf /etc/nginx/snippets/blog.conf
COPY deploy/nginx/templates/ /etc/nginx/blog-templates/
COPY deploy/entrypoint.d/10-ssl.sh /docker-entrypoint.d/10-ssl.sh
RUN chmod +x /docker-entrypoint.d/10-ssl.sh

COPY --from=build /src/public/ /usr/share/nginx/html/

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
