# OpenCode 工具映射

本文档将 Claude Code 工具名称映射到 OpenCode 等效工具，以便在 OpenCode 环境中工作。

## 工具映射表

| Claude Code 工具 | OpenCode 等效工具 | 说明 |
|----------------|-----------------|------|
| `TodoWrite` | `todowrite` | 任务列表管理 |
| `Task` (子代理) | OpenCode 原生子代理系统 | 并行任务处理 |
| `Skill` | OpenCode 原生 `skill` 工具 | 技能加载 |
| `Read` | `read` | 文件读取 |
| `Write` | `write` | 文件写入 |
| `Edit` | `edit` | 文件编辑 |
| `Bash` | `bash` | 命令执行 |
| `Glob` | `glob` | 文件模式匹配 |
| `Grep` | `grep` | 内容搜索 |

## 使用说明

在 OpenCode 中工作时：

1. **任务管理**: 使用 `todowrite` 而非 `TodoWrite`
2. **技能加载**: 使用 OpenCode 的 `skill` 工具加载技能 (如 `brainstorming`, `systematic-debugging`)
3. **子代理**: 使用 `@mention` 触发 OpenCode 子代理系统
4. **其他工具**: 直接使用对应名称

## 技能使用

OpenCode 提供以下常用技能：

- `brainstorming` - 创造性工作前使用
- `systematic-debugging` - Bug/测试失败时使用
- `test-driven-development` - 实现功能前使用
- `verification-before-completion` - 完成任务前验证

更多技能可用 `/skill list` 查看。