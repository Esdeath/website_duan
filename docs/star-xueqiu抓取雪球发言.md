# star-xueqiu：抓取雪球发言 使用说明

`star-xueqiu` 是本仓库的一个**项目级 skill**，用于抓取雪球（xueqiu.com）某个用户的时间线发言，并整理成可归档的 Markdown / CSV。默认目标是本站主角 **段永平**（雪球昵称「大道无形我有型」，user_id `1247347556`），也可抓任意公开用户。

- 技能位置：`.claude/skills/star-xueqiu/`
- 核心脚本：`scripts/scrape.mjs`（抓取）、`scripts/format.mjs`（整理）
- 产物目录：`raw/xueqiu/`（已被 `.gitignore` 忽略，不提交、不上线）

---

## 一、它解决了什么问题

雪球做了三层反抓取，普通 `curl` / 网页抓取工具都拿不到数据，所以才需要这个 skill：

1. **WAF + 滑块验证**：直接请求会命中阿里云 WAF 的 JS 挑战；朴素的无头浏览器会被弹「滑动验证页面」。脚本用无头 Chromium + 反检测参数（伪装 `navigator.webdriver`、`plugins`、`languages` 等）绕过，之后页面自身的 JS 会替我们对接口请求签名（`md5__1038` 参数）。
2. **登录墙**：时间线接口 `v4/statuses/user_timeline.json?...&page=N` 每页 20 条，但**匿名只能看第 1 页**；翻第 2 页起返回 `error_code 10022「请登录雪球查看更多内容」`。要往前翻必须带登录 Cookie。
3. **Cookie 是加密的**：macOS 上 Chrome 的 Cookie 用登录钥匙串里的密钥 AES 加密。脚本会拷贝 Cookie 库、读钥匙串密钥、解密出 `xueqiu.com` 的登录 Cookie 再注入浏览器。读钥匙串会弹一个系统授权框——**需要你点「允许」**，这一步就是你的授权。

---

## 二、前置条件

- **macOS + Google Chrome，且已在 Chrome 里登录雪球**（默认读 `Default` 配置文件）。
  - 不登录也能用，但**只能拿到最新约 20 条**。
- 在**仓库根目录**运行脚本，以便解析到项目自带的 `node_modules/puppeteer`。若从未装过依赖，先 `npm i`。
- 运行时会弹钥匙串授权框，记得点「允许」（可选「始终允许」，之后不再弹）。

> 说明：抓取用的是你本机 Chrome 的实时登录态。Cookie 属于敏感凭证，脚本用完即删拷贝出的 Cookie 库，**不会写进仓库、不会外传**。抓完如有顾虑，可在雪球「设置 → 账号安全 → 退出登录」使其失效。

---

## 三、快速开始

最常见的两步：**抓取 → 整理**。

```bash
# 1. 抓取：默认段永平、过去 3 个月，输出原始 JSON 到 raw/xueqiu/1247347556.raw.json
node .claude/skills/star-xueqiu/scripts/scrape.mjs --months=3

# 2. 整理：生成 Markdown + CSV（段永平本人的话前缀「段永平：」）
node .claude/skills/star-xueqiu/scripts/format.mjs --in=raw/xueqiu/1247347556.raw.json
```

`scrape.mjs` 会把进度打到 stderr，最后在 stdout 输出一行 `OUT=<路径> COUNT=<条数>`。
`format.mjs` 默认在输入文件旁边生成同名的 `.md` 和 `.csv`。

在与 Claude 的对话里，你通常**不用记这些命令**——直接说「抓一下段永平最近三个月的发言」「获取大道无形我有型最近 20 条动态」之类，就会自动触发这个 skill。

---

## 四、常见场景

| 需求 | 命令 |
|------|------|
| 最近 3 条 / 20 条（无需登录） | `scrape.mjs --pages=1` 后取前 N 条 |
| 过去一周 / 一个月 | `scrape.mjs --months=1`（一周可先按 1 个月抓再筛日期） |
| 过去三个月（需登录） | `scrape.mjs --months=3` |
| 抓别的雪球用户 | `scrape.mjs --user-id=<数字ID> --pages=2` |
| 指定固定页数 | `scrape.mjs --pages=10`（10 页≈200 条，忽略日期） |

> 拿某人的 user_id：打开他的雪球主页，地址栏 `xueqiu.com/u/<数字>` 里的数字就是。

---

## 五、参数说明

### scrape.mjs

| 参数 | 默认值 | 含义 |
|------|--------|------|
| `--user-id=<id>` | `1247347556`（段永平） | 雪球数字用户 id |
| `--months=<n>` | `3` | 往前抓多少个月 |
| `--pages=<n>` | 无 | 固定抓 N 页（20 条/页），设置后忽略 `--months` |
| `--out=<path>` | `raw/xueqiu/<id>.raw.json` | 原始 JSON 输出路径 |
| `--chrome-profile=<name>` | `Default` | 登录所在的 Chrome 配置文件 |
| `--anonymous` | 关闭 | 跳过 Cookie 解密，只取最新约 20 条 |

### format.mjs

| 参数 | 默认值 | 含义 |
|------|--------|------|
| `--in=<raw.json>` | 必填 | scrape.mjs 的输出 |
| `--out-md` / `--out-csv` | 输入文件旁 | 覆盖输出路径 |
| `--speaker=<name>` | 段永平（id 1247347556）否则账号昵称 | 归属前缀 |

---

## 六、输出格式：归属是重点

段永平**本人的话**统一以 `段永平：` 开头；被他回复或转发的他人内容标为 `【引用/被回复 @某某】`。这样作者归属永不含糊——因为这些素材要喂给段永平内容站，**弄错归属是不可接受的**。

Markdown 单条示例：

```
### 2026-05-07 22:10 · iPad · 赞4396 转120 评88
link: https://xueqiu.com/1247347556/387543201

段永平：$泡泡玛特(09992)$ 我把我的神华都换了泡泡玛特了……将来有机会我还会再回来的。I'll be back

> 【引用/被回复 @某某】……（网友原话）
```

CSV 字段：`datetime, source, speaker, likes, retweets, replies, url, text, quoted`，可直接导入表格做统计（按月计数、按点赞排序等）。

在对话里直接展示结果时，也遵循同样的 `段永平：原文` 约定。

---

## 七、素材存放约定

抓取结果是**原始素材，不是站点内容**：统一放 `raw/xueqiu/`。该目录已被 `.gitignore` 的 `raw/` 规则忽略，**不会被提交、也不会进 `npm run generate` 的上线产物**。

**不要**把抓来的发言直接丢进 `content/dao/`。把精选发言整理成正式文章是另一件需要慎重的事——要补齐必填 frontmatter（`title / slug / description / seoTitle / seoDescription`）、保证 `slug` 全局唯一、放对分区目录（详见根目录 `CLAUDE.md`）。这一步应当由人确认，不自动进行。

---

## 八、排错

- **标题是「滑动验证页面」/ 报「hit WAF/CAPTCHA wall」**：偶发的风控。重跑一次即可；若持续，可能需要非无头（headful）真实会话——调试时把脚本里的 `headless: 'new'` 去掉观察。
- **`logged-in: false` 或翻到第 1 页就停**：选中的 Chrome 配置文件没登录。用下面的命令找出含 `xq_a_token` 的那个 profile，再用 `--chrome-profile` 指定：
  ```bash
  for p in Default "Profile 1" "Profile 2"; do
    db="$HOME/Library/Application Support/Google/Chrome/$p/Cookies"; [ -f "$db" ] || continue
    cp "$db" /tmp/_c.db; echo "$p:"; sqlite3 /tmp/_c.db \
      "SELECT name FROM cookies WHERE host_key LIKE '%xueqiu.com%' AND name='xq_a_token';"; rm -f /tmp/_c.db
  done
  ```
- **没弹钥匙串授权框 / 访问被拒**：必须点「允许」；重跑一次。
- **非 macOS 或用的不是 Chrome**：Cookie 解密会被跳过（等同匿名，只有最新约 20 条）。替代方案：让用户手动粘贴浏览器里的 `Cookie` 请求头，改写注入逻辑。
- **本地 markdown 很多时 generate 内存溢出**：与本 skill 无关，是站点构建的老问题，用 `NODE_OPTIONS=--max-old-space-size=8192 npm run generate`。

---

## 九、相关

- 技能定义与更详细的内部说明：`.claude/skills/star-xueqiu/SKILL.md`
- 项目总览与新增文章规范：根目录 `CLAUDE.md`
- 一次完整抓取的产物示例：`raw/xueqiu/`（段永平过去三个月 545 条）
