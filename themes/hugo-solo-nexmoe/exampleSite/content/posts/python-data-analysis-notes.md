---
title: "用 pandas 完成一次小型数据分析"
date: 2026-10-06T19:30:00+08:00
draft: false
description: "从一份徒步记录 CSV 出发，完成数据读取、清洗、分组统计和结果导出。"
cover: "images/post2.jpg"
categories: ["数据分析"]
tags: ["Python", "pandas"]
toc: true
---

小型数据分析最重要的不是复杂模型，而是让输入、清洗规则和输出都可以复现。

## 准备数据

```bash
python -m pip install pandas
```

创建 `hiking.csv`：

```csv
date,route,distance_km,duration_min
2026-09-06,西山环线,8.4,150
2026-09-13,湖畔步道,6.2,95
2026-09-20,森林穿越,,180
2026-09-27,山脊路线,not-recorded,210
2026-10-04,西山环线,9.1,165
```

## 读取与清洗

```python
from pathlib import Path

import pandas as pd

source = Path("hiking.csv")
output = Path("route-summary.csv")

df = pd.read_csv(source, parse_dates=["date"])
df["distance_km"] = pd.to_numeric(df["distance_km"], errors="coerce")
df["duration_min"] = pd.to_numeric(df["duration_min"], errors="coerce")

clean = df.dropna(subset=["route", "distance_km", "duration_min"]).copy()
clean = clean[(clean["distance_km"] > 0) & (clean["duration_min"] > 0)]
clean["pace_min_per_km"] = clean["duration_min"] / clean["distance_km"]

summary = (
    clean.groupby("route", as_index=False)
    .agg(
        trips=("route", "size"),
        total_km=("distance_km", "sum"),
        average_pace=("pace_min_per_km", "mean"),
    )
    .sort_values("total_km", ascending=False)
)
summary[["total_km", "average_pace"]] = summary[
    ["total_km", "average_pace"]
].round(1)
summary.to_csv(output, index=False)

print(summary.to_string(index=False))
print(f"有效记录：{len(clean)}/{len(df)}")
print(f"结果已写入：{output.resolve()}")
```

`errors="coerce"` 把无法转换的值设为缺失值，随后统一过滤，避免错误数据混入统计。

## 检查异常记录

```python
invalid = df[df[["distance_km", "duration_min"]].isna().any(axis=1)]
if not invalid.empty:
    print("以下记录需要补充：")
    print(invalid.to_string(index=False))
```

## 小结

一次可复现的分析通常包含四步：保留原始输入、明确转换规则、检查异常记录、输出可复用结果。图表和模型可以稍后增加，可靠的数据基础应该先完成。
