import evidence from './link-evidence.json';
import { escapeHtml as esc, type Heading } from './markdown';
const aliases: Record<string,string> = { network:'回程 三网 延迟 丢包', 'vps-check':'回程 测速 YABS', media:'115 PT 媒体 Emby', 'ai-api':'模型中转 网关 大模型 API', selfhosted:'自托管 内网 穿透' };
export function matchesSearch(item: object, query:string):boolean {
 const text=JSON.stringify(item)+' '+(aliases[('id' in item ? String(item.id) : '')]??'');
 return text.toLocaleLowerCase('zh-CN').includes(query.trim().toLocaleLowerCase('zh-CN'));
}
const environments:Record<string,string>={ 'vps-check':'自有或授权 VPS；脚本通常要求 Linux，具体发行版与版本 unknown', network:'浏览器；回程检测需授权网络与 Linux，线路结果仅代表检测时点', 'net-tools':'浏览器；DNS/TLS 排障需核对域名控制权', selfhosted:'自有服务器、域名与网络；按上游文档核对容器与系统版本', media:'自有或合法授权媒体环境；115/PT 权限与限额按服务方规则', 'ai-api':'浏览器查看公开模型信息；API 兼容、模型权限与版本 unknown', scripts:'自有测试环境；Linux/容器/反向代理版本按具体项目核对', wiki:'浏览器阅读；历史经验不代表当前优惠与政策', status:'自有服务器或授权监控目标；具体部署版本 unknown' };
export function renderVerification(tool:{id:string;links?:{url:string;label?:string}[]}):string {
 const record=evidence[tool.id as keyof typeof evidence];
 const checks=tool.links?.map(l=>({link:l,check:record?.sources.find(s=>s.url===l.url)}))??[];
 return `<section class="verification" aria-label="核验信息"><h2>核验信息</h2><p><b>范围与状态：</b>仅公开链接 HTTP 只读检查；链接能打开不等于命令运行、模型调用或部署完成。未执行脚本、未调用付费模型、未测试生产服务。实际运行状态：unknown（未实测）。</p><p><b>适用环境：</b>${esc(environments[tool.id]??'unknown；请按上游文档核对')}。</p><p><b>费用：</b>阅读公开资料不代表服务免费；订阅、API、流量与 VPS 费用以供应商规则为准，具体费用 unknown。</p><p><b>风险：</b>脚本可修改系统或删除数据；网络检测须授权；媒体注意版权与账号规则；API 不要泄露凭据。原指南安全提醒仍适用。</p><ul>${checks.map(({link,check})=>`<li><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label??link.url)}</a> · 核验日期：${esc(check?.checkedAt??'unknown')} · ${check ? `${esc(check.result==='reachable'?'公开链接可达（非功能实测）':check.result==='suspected-unavailable'?'疑似失效，待人工复核':'待人工核验')}；HTTP ${esc('status' in check?check.status:'unknown')}`:'unknown（尚无该地址核验记录）'}</li>`).join('')}</ul><p>来源：本页当前公开链接与只读报告；403、验证码、timeout 不判定为坏链。定期检查报告仅供人工复核，不自动改文案。</p></section>`;
}
export function renderFeedback(title:string,url:string):string {
 const text=`OneMJJ 内容反馈\n页面：${title}\n地址：${url}\n问题链接或段落：\n网络环境与观察日期：\n问题现象与建议：\n（请勿附上密钥、Session 或个人敏感数据）`;
 const mail=`mailto:liuweiqiang0523@gmail.com?subject=${encodeURIComponent('OneMJJ 内容反馈：'+title)}&body=${encodeURIComponent(text)}`;
 return `<section class="feedback" aria-label="内容反馈"><h2>内容反馈</h2><p>无需注册，使用本站<a href="/contact/" data-route>公开联系邮箱</a>。邮件客户端不会自动发送。</p><a class="ghost-link" href="${esc(mail)}">邮件反馈（预填页面）</a> <button type="button" data-copy="${esc(text)}">复制反馈模板</button><details><summary>查看反馈模板</summary><pre>${esc(text)}</pre></details></section>`;
}
export function renderPostEvidence(post:{slug:string;date?:string;content?:string;origin?:string}):string {
 const maintenance=post.slug==='teledeck-one-session-one-runtime';
 const version=maintenance?'0.7.15（仅 2026-10-05 补记）；7 月历史版本以正文为准':'unknown（正文未明确可追溯版本号；请核对当前上游文档）';
 return `<aside class="post-evidence" aria-label="文章时效信息"><p><b>首次发布：</b>${esc(post.date??'unknown')}（保留归档原日期；原始发布平台时间未独立复核）。</p><p><b>实质更新：</b>${maintenance?'2026-10-05 维护补记；来源为正文同名章节，站内补记归档于 2026-10-06':'unknown（无明确实质更新记录；不以同步或站点部署日期冒充）'}。</p><p><b>安全审校：</b>2026-10-07，仅静态及离线检查，未执行付费模型或生产部署。</p><p><b>适用版本：</b>${esc(version)}。</p><p>来源：本站公开文章归档与正文；历史运行记录不代表当前重新实测。</p></aside>`;
}
export function renderToc(headings:Heading[]):string {
 const toc=headings.filter(h=>h.level===2);return toc.length>2?`<nav class="post-toc" aria-label="本页目录"><b>本页内容</b><ol>${toc.map(h=>`<li><a href="#${esc(h.id)}">${esc(h.text)}</a></li>`).join('')}</ol></nav>`:'';
}
