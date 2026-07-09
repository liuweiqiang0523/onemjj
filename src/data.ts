export type Tool = { name: string; desc: string; icon: string; category: string; url: string; badge?: string; private?: boolean };
export const tools: Tool[] = [
  { name: 'VPS 检测', desc: 'Ping / 回程 / 解锁 / YABS', icon: '🖥️', category: 'VPS', url: '#tools', badge: '常用' },
  { name: '三网延迟', desc: '广东移动/联通/电信 TCPing', icon: '📶', category: 'Network', url: '#tools', badge: '待接入' },
  { name: '网络工具', desc: 'DNS / Whois / TLS / 端口', icon: '🌐', category: 'Network', url: '#tools' },
  { name: '自托管入口', desc: 'Vaultwarden / Emby / qB / msgo', icon: '🏠', category: 'Selfhosted', url: '#private', private: true },
  { name: 'PT & 媒体', desc: '刷流 / 整理 / 115 / Emby', icon: '🎞️', category: 'Media', url: '#tools' },
  { name: 'AI & API', desc: 'Sub2API / 模型检测 / Prompt', icon: '🤖', category: 'AI', url: '#tools' },
  { name: '常用脚本', desc: 'Docker / Nginx / SSH 自救', icon: '📜', category: 'Scripts', url: '#scripts' },
  { name: 'MJJ 笔记', desc: '传家宝 / 坑商 / 黑五记录', icon: '📒', category: 'Wiki', url: '#wiki' },
  { name: '状态页', desc: 'Mac mini / Oracle / LAX', icon: '📡', category: 'Status', url: '#status', badge: '计划' },
];
export const scripts = [
  { title: 'YABS 跑分', cmd: 'curl -sL yabs.sh | bash' },
  { title: 'Bench.sh', cmd: 'curl -Lso- bench.sh | bash' },
  { title: 'Docker 状态', cmd: 'docker compose ps && docker stats --no-stream' },
  { title: '端口占用', cmd: 'sudo lsof -iTCP -sTCP:LISTEN -n -P' },
];
export const notes = [
  { tag: '传家宝观察', title: 'KS / 10G / 年付鸡行情', body: '记录哪些是真香，哪些只是群友一喊你就上头。' },
  { tag: '生存手册', title: '新手 MJJ 如何少踩坑', body: 'SSH、安全、备份、反代、解锁、回程，一页一坑。' },
  { tag: '低维护原则', title: '能上 Pages 就不上 VPS', body: '静态优先、配置文件优先、少数据库、少手工 Web 控制台。' },
];
