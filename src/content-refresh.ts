/** Narrow, idempotent migration of known historical copy in KV; preserve unrelated admin edits. */
import { promoteWeekly } from './weekly';
const replacements: Record<string, string> = {"本月真实观察：WorkBuddy 的 hy3（腾讯混元）白嫖额度续到 8 月底，实测可用。": "历史观察（2026 年 8 月）：当时记录 WorkBuddy 的 hy3（腾讯混元）临时额度延续至 2026-08-31；该日期现已过期。本次仅修正文案，未复核当前额度或可用性，不应据此判断现在仍可免费使用。", "密码登录的机器在公网上活不过一个扫描周期。": "公网 SSH 密码认证容易遭遇扫描与暴力尝试；弱密码、缺少限速和及时更新会增加失陷风险。切换前先确认密钥登录可用，保留恢复入口。", "没有异地备份的数据等于没有数据。": "只有本地副本时，设备故障、误删或勒索可能同时损坏原件与备份；建议保留隔离的异地副本，并验证恢复。", "结论：这类公益中转普遍有客户端指纹或地域门槛，不是配置能绕的。": "这是当时几条访问路径的失败记录，不能据此推断所有公益中转的机制，也未复核当前服务状态。", "改一行文案推上去就上线": "页面代码由 CI 部署；内容读取优先使用 KV，修改打包默认数据不会自动覆盖 KV"};
export function refreshPublicContent<T extends Record<string, any>>(input: T): T {
 const data = promoteWeekly(structuredClone(input));
 const ai = data.tools?.find((t: any) => t.id === 'ai-api');
 if (ai) {
  if (ai.desc === 'Sub2API / 模型检测 / Prompt') ai.desc = '模型目录 / API 检测 / 代码助手';
  if (ai.body === '放中转、模型可用性、Codex/Claude/Gemini 相关工具。') ai.body = '公开模型目录、效果参考和代码助手入口。模型列表可见不代表请求可用。OpenAI 模型列表需要鉴权；下方 Python 3 示例以隐藏输入读取密钥，不把密钥写进命令历史或进程参数，不打印密钥，也不启用调试日志。仅向官方 HTTPS 地址发送，运行前确认环境、账户权限和费用。';
  ai.commands = ai.commands?.map((c: string) => c === 'curl -s https://api.openai.com/v1/models' ? "python3 -c 'import getpass,json,urllib.request; key=getpass.getpass(\"OpenAI API key (hidden): \" ); req=urllib.request.Request(\"https://api.openai.com/v1/models\",headers={\"Authorization\":\"Bearer \"+key}); data=json.load(urllib.request.urlopen(req,timeout=30)); print(\"\\n\".join(m[\"id\"] for m in data[\"data\"]))'" : c);
 }
 for (const note of data.notes ?? []) for (const [old, value] of Object.entries(replacements)) note.body = note.body.replaceAll(old, value);
 for (const link of [...(data.heroLinks ?? []), ...(data.probe ? [data.probe] : [])]) {
  if (['乱写のBlog', '瞎记录のBlog'].includes(link.label)) link.label = '个人博客 · ' + link.label + ' ↗';
  if (link.label === '没🐔の探针') link.label = '服务探针 · 没🐔の探针 ↗';
 }
 return data;
}
