# 修复提示词中 JSON 格式矛盾问题

## Context

用户报告 AI 返回的响应包含 markdown 代码块标记（```json），导致 JSON.parse 失败。

问题根源：`src/lib/prompts/analysis.md` 中第54行要求"不要包含在markdown代码块中，直接输出JSON字符串"，但第56-82行却用 markdown 代码块包裹了 JSON 示例。这种矛盾导致 AI 模仿了带代码块的格式。

## Plan

### 步骤 1: 修复提示词文件

**文件**: `src/lib/prompts/analysis.md`

将第54-82行的内容修改为：

```markdown
## 输出格式
**必须且仅输出**以下完全合法的JSON对象字符串。不要包含在markdown代码块中，直接输出JSON字符串。

{
  "problem": {
    "title": "string",
    "time_limit": "string",
    "memory_limit": "string",
    "description": "string",
    "input_format": "string",
    "output_format": "string",
    "input_sample": "string",
    "output_sample": "string",
    "notes": "string"
  },
  "code": {
    "language": "string",
    "original_code": "string"
  },
  "modified_code": "string",
  "modification_analysis": [
    {
      "original_snippet": "string",
      "modified_snippet": "string",
      "explanation": "string"
    }
  ]
}
```

即：移除示例外的 ```json 和 ``` 标记，使示例与指令一致。

## Verification

修复后：
1. 重新部署项目
2. 发起新的代码分析请求
3. 确认响应能正常被 JSON.parse 解析，不再出现 "Unexpected token '`'" 错误
