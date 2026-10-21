export const pasteId = 'n7Kp2xQm'

export const examples = [
  {
    language: 'json', label: 'JSON',
    content: `{
  "name": "Paste 示例服务",
  "port": 3000,
  "logging": {
    "level": "info",
    "pretty": false
  },
  "allowedOrigins": [
    "https://example.com"
  ],
  "description": "保留缩进、中文和原始换行"
}
`,
  },
  {
    language: 'sql', label: 'SQL',
    content: `-- 查询最近创建的分享，不执行任何写入
SELECT
  id,
  language,
  created_at
FROM pastes
WHERE created_at >= '2026-10-01'
ORDER BY created_at DESC
LIMIT 20;
`,
  },
  {
    language: 'yaml', label: 'YAML 配置',
    content: `# 示例服务配置
services:
  paste:
    image: paste:latest
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - paste_data:/app/data

volumes:
  paste_data:
`,
  },
  {
    language: 'nginx', label: 'Nginx 配置',
    content: `# 本地反向代理示例
server {
    listen 80;
    server_name paste.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
`,
  },
  {
    language: 'plaintext', label: '纯文本',
    content: '交接说明\r\n\r\n  保留这一行前的两个空格。\r\n特殊字符：<>&\r\n长行示例：https://example.com/docs/configuration?environment=development&format=original&preserveWhitespace=true\r\n',
  },
]

export const scenarios = [
  ['ready', '已领取'], ['protected', '需要密码'], ['limited', '尚未领取'],
  ['last', '最后一次'], ['unlimited', '不限次数'], ['expired', '已过期'], ['destroyed', '次数用尽'],
] as const
export type Scenario = typeof scenarios[number][0]

export function initialAccess(scenario: Scenario) {
  return {
    scenario,
    remaining: scenario === 'unlimited' ? null : scenario === 'last' ? 1 : scenario === 'limited' ? 3 : scenario === 'destroyed' ? 0 : 2,
    claimed: scenario === 'ready' || scenario === 'unlimited',
  }
}
