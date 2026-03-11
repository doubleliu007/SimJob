# SimJob - 趣味模拟面试

一个面向求职者的趣味性网站，通过 AI 多角色扮演模拟真实的面试场景。

## 功能

1. **简历筛选讨论** - 多位公司高管和 HR 角色讨论你的简历，每位都有独特性格
2. **部门领导面试** - _开发中_
3. **董事长面试** - _开发中_

## 技术栈

- React 18 + TypeScript + Vite
- TailwindCSS v4
- Zustand (状态管理)
- OpenAI JS SDK (兼容第三方中转站)

## 使用方式

```bash
npm install
npm run dev
```

打开 http://localhost:5173，在设置页配置你的 API Key、Base URL 和模型名称即可开始。

## 注意事项

- 纯前端运行，数据不会上传到任何服务器
- 需要 OpenAI 兼容的 API 接口（支持第三方中转站）
- 对话记录保存在浏览器 localStorage 中
