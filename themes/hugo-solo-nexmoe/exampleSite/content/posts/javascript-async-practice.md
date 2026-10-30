---
title: "JavaScript 异步请求的可靠写法"
date: 2026-10-09T20:00:00+08:00
draft: false
description: "用 async/await 封装一个包含状态检查、超时控制和明确错误类型的 JSON 请求函数。"
cover: "images/post1.jpg"
categories: ["前端开发"]
tags: ["JavaScript", "异步编程"]
toc: true
---

`async/await` 能让异步流程更清晰，但 `fetch` 遇到 HTTP 404 时不会自动抛错，请求也不会自动超时。

## 定义错误类型

```javascript
class HttpError extends Error {
    constructor(response) {
        super(`HTTP ${response.status} ${response.statusText}`);
        this.name = "HttpError";
        this.status = response.status;
    }
}

class TimeoutError extends Error {
    constructor(timeout) {
        super(`请求超过 ${timeout}ms`);
        this.name = "TimeoutError";
    }
}
```

## 封装 JSON 请求

```javascript
async function fetchJSON(url, { timeout = 5000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new HttpError(response);
        return await response.json();
    } catch (error) {
        if (error.name === "AbortError") throw new TimeoutError(timeout);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}
```

`response.ok` 把 HTTP 错误转为可处理的异常，`AbortController` 提供超时能力，`finally` 确保定时器一定被清理。

## 调用与分类处理

下面的代码可在现代浏览器控制台运行：

```javascript
async function loadPost() {
    try {
        const post = await fetchJSON(
            "https://jsonplaceholder.typicode.com/posts/1",
            { timeout: 3000 },
        );
        console.log(post.title);
    } catch (error) {
        if (error instanceof HttpError) {
            console.error("服务返回错误：", error.status);
        } else if (error instanceof TimeoutError) {
            console.error("网络响应过慢：", error.message);
        } else {
            console.error("请求失败：", error.message);
        }
    }
}

loadPost();
```

## 进一步改进

- 只对可安全重试的请求增加重试。
- 在界面上区分加载中、无数据和失败状态。
- 不向用户直接展示可能包含敏感信息的原始异常。
- 组件卸载时主动终止不再需要的请求。

> 可靠的异步代码不是消灭错误，而是让每一种失败都有清晰的出口。
