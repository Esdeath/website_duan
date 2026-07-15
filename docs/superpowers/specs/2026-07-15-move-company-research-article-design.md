# 公司研究文章专题归类设计

## 目标

将《段永平如何研究一家公司：从产品、年报到企业文化》归入“公司与人物”专题模块。

## 方案

- 将文章文件从 `content/dao/investment-logic/` 移动到 `content/dao/company-people/`。
- 将 frontmatter 的 `category` 从 `投资问答录` 修改为 `公司与人物`。
- 保留文章正文、`slug` 和 `order` 不变，确保既有文章链接不变。
- 不修改首页分类配置，因为“公司与人物”已经存在于分类顺序和元数据中。

## 验证标准

- 原路径不存在，目标路径存在。
- 文章 frontmatter 的标题、slug、order 和 category 正确。
- `slug` 在内容集合中仍然唯一。
- Git diff 只包含设计记录和这篇文章的路径/category 变更，不包含正文改写。
