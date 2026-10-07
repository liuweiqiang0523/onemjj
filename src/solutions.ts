// Human-edited choices and guidance. No remote recommendation service.
export const solutionsTitle = '自托管方案向导｜OneMJJ';
export const solutionsDescription = '从远程观影、照片文件备份、远程控制三个目标出发，按设备、访问对象与客户端条件选择路线，核对前置步骤、验收和风险。';
const docs = {
 tailscale: {label:'Tailscale 官方安装与私有网络',url:'https://tailscale.com/kb/1017/install'},
 emby: {label:'Emby 官方客户端连接与网络排查',url:'https://emby.media/support/articles/Connectivity.html'},
 plex: {label:'Plex 官方远程访问与播放要求',url:'https://support.plex.tv/articles/200289506-remote-access/'},
 restic: {label:'restic 官方备份与恢复手册',url:'https://restic.readthedocs.io/en/stable/'},
 nextcloud: {label:'Nextcloud 官方管理手册',url:'https://docs.nextcloud.com/server/stable/admin_manual/'},
 rustdesk: {label:'RustDesk 官方自建服务器文档',url:'https://rustdesk.com/docs/en/self-host/'},
 rdp: {label:'Microsoft：远程桌面与版本限制',url:'https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/remotepc/remote-desktop-allow-access'},
 mac: {label:'Apple：打开屏幕共享',url:'https://support.apple.com/guide/mac-help/turn-screen-sharing-on-or-off-mh11848/mac'},
 guacamole: {label:'Apache Guacamole 官方手册',url:'https://guacamole.apache.org/doc/gug/'},
};
interface NetworkRoute { title:string; reason:string; paths:string[]; steps:string[]; checks:string[]; risks:string[]; docs:{label:string;url:string}[] }
export interface Recommendation { title:string; reason:string; alternative:string; steps:string[]; checks:string[]; risks:string[]; docs:{label:string;url:string}[]; tool:string; network?:NetworkRoute }
const luckyRoute:NetworkRoute = {
 title:'家里内网直连 + 外网 Lucky HTTPS 反代',
 reason:'给自己 / 家人多一种网络路线，不替换 Emby 主推、Plex 备选。可安装客户端时，Tailscale 仍是减少公网暴露的选择；只用浏览器时，下方就是主路线的具体 HTTPS 配置。',
 paths:['家里：手机 / 电视 / 浏览器 → 家庭局域网 → Emby 内网地址','外面：手机 / 浏览器 → 域名 HTTPS → Lucky 反向代理 → Emby 内网地址'],
 steps:[
  '先在家里用 Emby 内网地址与普通观影账户试播，固定服务端内网地址；媒体库只向有授权的家人开放。',
  '外网前提：公网 IPv4 + 路由端口映射，或公网 IPv6 + 访问两端 IPv6 可达 + 正确防火墙规则；还需域名、可用监听端口与上传带宽。Lucky 反代不自动解决 CGNAT；DDNS 只更新地址，不负责穿透。没有可达入口就先用内网，或保留 Tailscale / 另评估受控网关。',
  '按官方安装文档核对平台与 CPU 架构，可在受支持的 Linux / 路由器 / NAS 上部署 Lucky，也可用独立常开主机代理媒体服务器。Windows 优先核对官方服务安装方式；Mac 不假定 Docker host 网络或 IPv6 可用，必要时另用受支持主机。',
  '在 Lucky「Web 服务」配置域名反向代理到 Emby 内网地址，启用 TLS，配置有效证书与自动续期并核对日志。公网只放行所需 HTTPS 监听端口；IPv4 映射到 Lucky，IPv6 单独检查地址和防火墙，不把媒体原始端口一并放开。',
  '家里用内网地址，外面用 HTTPS 域名（非标准端口需带端口）；手动切换即可，split DNS / 内外分流只是可选便利配置。Plex 不能照搬 Emby 地址：另行核对自定义服务器 URL、服务器发现、登录及远程播放资格。'
 ],
 checks:[
  '在家庭 Wi-Fi 上用普通账户播放实际影片；关闭 Wi-Fi 后，用移动网络经 HTTPS 域名登录并播放、拖动进度、加载字幕，同时检查 Lucky 访问日志与转码负载。',
  '确认域名解析、证书链和续期验证成功；重启后入口仍可用。用实际电视 / 手机客户端分别测试，不能只看浏览器首页能打开。',
  '普通观影账户不能进入 Emby 管理界面；公网无法打开 Lucky 管理后台或媒体原始端口。外网失败且无访问日志时，先查地址、端口映射与防火墙；入口不可达时回退内网或 Tailscale。'
 ],
 risks:[
  'IPv6-only 入口无法供不支持 IPv6 的外网访问端使用；CGNAT、运营商端口封锁、动态地址及低上传带宽都需实际确认。HTTPS 加密不等于消除公网攻击面。',
  '不要公开 Lucky 16601 管理后台；修改默认凭据、限制管理来源并保持更新。媒体登录使用独立非管理员账户，不共享 Emby 管理账户权限。额外 BasicAuth 可能破坏电视 / 原生客户端登录与播放，启用前先测兼容性。',
  '这是人工编辑的条件路线，未替你实测访客环境；证书续期、软件更新、配置备份和访问日志需持续维护。不用于匿名公共媒体分享。'
 ],
 docs:[{label:'Lucky 官方 Web 服务：反代、TLS 与日志',url:'https://lucky666.cn/docs/modules/web/'},{label:'Lucky 官方安装与配置备份',url:'https://lucky666.cn/docs/install/'},docs.emby,docs.plex]
};
export function recommend(s: Selection): Recommendation {
 const privateClient = s.audience === 'family' && s.client === 'yes';
 const deviceStep = s.device === 'mac' ? 'Mac：检查系统版本、磁盘权限和睡眠设置；需要常开时先确认供电。' : s.device === 'windows' ? 'Windows：核对版本和防火墙规则，使用专用低权限账户；不要关闭整个防火墙。' : 'Linux / NAS：先查 CPU 架构、厂商支持的软件包或容器能力、目录权限与可用内存；不支持时换受支持的常开主机。';
 const networkStep = privateClient ? '在服务端与访问端安装 Tailscale，建立自己的私有网络并限制访问权限；NAS 不支持客户端时，另行按官方子网路由文档配置受支持的网关。Tailscale 需要第三方身份/协调服务，并非完全自托管。' : '先核实外网入口：公网 IPv4 / IPv6、CGNAT、上传带宽和域名均未确认。没有可达入口时，需要另行评估受控网关 / VPS 成本，或先保持局域网使用；不要直接假定能端口转发。';
 const security = '先在局域网跑通，再限制入口与账户权限；不把管理端口直接暴露公网。保持更新、记录恢复方法；这是一条人工编辑路线，不是一键部署，也未替你实测环境。';
 let r: Recommendation;
 if (s.goal === 'movie') r = {
  title: privateClient ? 'Emby + Tailscale 私有观影' : s.audience==='family' ? 'Emby + Lucky HTTPS 浏览器入口' : 'Emby + 受控 HTTPS 浏览器入口',
  reason: privateClient ? '自己和家人可安装客户端，用私有网络访问媒体服务，避免先开放公网端口。' : `${s.audience==='public'?'公共访客不应加入家庭私有网络。':'访问端不安装客户端，不能靠私有 VPN 直接连接；Lucky 是这里可选用的具体 HTTPS 反代方案，见下方双路径卡片。'}Emby 自带网页播放器，但需要你维护安全的 HTTPS 入口。`,
  alternative:'Plex：适合偏好其客户端生态与媒体库体验的人；已有 Emby / Plex 就保留现有库，不必迁移。Plex 的账号、远程播放资格及 Plex Pass / Remote Watch Pass 要按官方当前要求核对；私有组网不等于绕过付费限制。',
  steps:[deviceStep,'安装受设备支持的 Emby Server；只读挂载拥有合法使用权的媒体，创建非管理员观影账号，先本地试播。',networkStep,privateClient?'用私有地址打开网页播放器，按家人分别配置访问权限。':s.audience==='family'?'按下方 Lucky 双路径卡片配置 HTTPS 与账户权限；网络前提不满足时先保持内网使用。':'配置反向代理、有效 TLS 证书、独立账号和访问/速率限制；公共用途先审查版权与分享范围，不公开整个媒体库。'],
  checks:['关闭手机 Wi-Fi，用移动网络登录普通账户，确认能播放一段实际影片。','检查直接播放 / 转码负载、字幕与上传带宽；普通用户不能进入管理后台。'],
  risks:['Emby 的部分客户端播放、硬件转码等功能涉及客户端解锁或 Emby Premiere；Plex 也有播放与订阅限制，购买前按实际设备核对。','中继连接或上传带宽不足可能卡顿；NAS 转码能力不可假定。','公共分享涉及版权、带宽与攻击面；不提供匿名开放媒体站路线。',security], docs:[docs.emby,docs.plex,...(privateClient?[docs.tailscale]:[])],tool:'media', network:s.audience==='family'?luckyRoute:undefined
 };
 else if (s.goal === 'backup') r = privateClient ? {
  title:'restic 加密版本备份', reason:'自己 / 家人可以安装工具时，用可恢复的版本快照保护文件；同步删除不是备份。',
  alternative:'优先图形界面可评估 Kopia；相册浏览可另用 Immich，但相册数据库与原图仍需独立备份。',
  steps:[deviceStep,'安装对应系统的 restic；先选一小份测试目录和独立磁盘 / 异地仓库，安全离线保存仓库密码。手机照片需先通过受支持方式导出到备份目录。','按官方手册初始化仓库、执行一次备份和 check；确认后设置系统定时任务与失败提醒。','设置版本保留策略，先验证恢复再启用清理；本机或同一 NAS 的副本不算异地灾备。'],
  checks:['把一个快照恢复到空目录，核对照片可打开和文件内容完整。','核对定时任务日志和实际新增快照；模拟删除测试文件后仍能从旧快照找回。'],
  risks:['丢失仓库密码无法恢复；加密不能替代离线 / 异地副本。','NAS 的原图目录、应用配置和数据库分别制定一致性备份策略。',security],docs:[docs.restic],tool:'selfhosted'
 } : {
  title:'Nextcloud 浏览器收集 + 独立版本备份',reason:s.audience==='public'?'公共访客只能进入受限文件收集入口，不应获得备份仓库写权限。':'只用浏览器可手动上传照片与文件，但这不是手机后台自动备份。',
  alternative:'NAS 自带文件请求功能可降低维护量，先核对账号、过期时间和权限；仍要为收到的文件做独立版本备份。',
  steps:[deviceStep,'服务端需要受支持的 Linux 环境与数据库；Mac / Windows 优先用受支持的 Linux 虚拟机或另一台 NAS / 主机，不假定原生可装。',networkStep,'配置 HTTPS、配额和上传限制；家人用独立账号，公共访客用限时上传入口，不公开目录列表。','由管理员在服务端为文件、配置和一致性数据库备份制定 restic 任务；先恢复测试再安排保留清理。'],
  checks:['访客用无痕窗口上传测试文件，确认不能看到他人文件或管理界面。','从独立备份恢复一个文件并核对内容；手动上传成功不能证明自动备份有效。'],
  risks:['公开上传会带来滥用、恶意文件和存储费用，需要配额与人工管理。','Nextcloud 同步和回收站不等于独立备份；无客户端不承诺自动照片备份。',security],docs:[docs.nextcloud,docs.restic],tool:'selfhosted'
 };
 else if (s.audience === 'public') r = {
  title:'不开放公共远程控制',reason:'公共访客与个人桌面控制不匹配，不能把家庭电脑做匿名公共控制台。',alternative:'确有演示需求时建立隔离、可重置的实验虚拟机，经身份验证后评估 Guacamole；不要连接个人电脑。',
  steps:[deviceStep,'明确需要控制的是隔离实验机而非日常电脑；使用独立账号和网络。','在明确授权与审计制度前保持关闭；改为“自己 / 家人”可查看私人控制路线。'],checks:['确认公网不能连接桌面端口，匿名用户无控制权限。'],risks:['远程控制可以读取文件、执行程序；公共入口风险不能靠一个密码消除。',security],docs:[docs.guacamole],tool:'selfhosted'
 };
 else if (s.device === 'linux' && s.kind === 'nas') r = {
  title:'NAS 转为后台管理，不提供远程桌面',reason:'没有桌面环境的 NAS / 服务器不能当作普通电脑远程控制；先明确只是管理文件和服务。',alternative:'如确实需要图形桌面，请换有桌面的 Linux / Mac / Windows 主机再重新选择。',steps:[deviceStep,networkStep,s.client==='yes'?'经受控私有网络进入厂商后台，限制到管理员设备。':'浏览器管理优先局域网；外网必须另建带身份验证的受控入口，不直接公开 NAS 管理端口。'],checks:['非授权账户无法打开后台；在允许的设备上能查看状态并退出登录。'],risks:['厂商能力和支持周期不同；不能假定支持 Tailscale 或容器。',security],docs:[docs.tailscale],tool:'selfhosted'
 };
 else {
  const browser = s.client === 'no';
  const nativeMac = s.device === 'mac';
  const rdp = s.device === 'windows' && s.edition === 'pro';
  r = {title:browser?'Guacamole 受控浏览器桌面':nativeMac?'Mac 屏幕共享 + Tailscale':rdp?'Windows RDP + Tailscale':'RustDesk 自建中继与客户端',
   reason:browser?'访问端不安装软件，需要独立浏览器网关，网关并不会自动赋予目标系统远程桌面能力。':nativeMac?'Mac 已有屏幕共享能力，可通过私有网络限制入口。':rdp?'已确认专业版 / 企业版，可使用系统 RDP 服务端，入口仍放在私有网络。':'Windows 家庭版不能作为系统 RDP 服务端；有桌面的 Linux 也需核对显示服务。RustDesk 提供跨平台客户端路线。',
   alternative:browser?'愿意安装客户端时，重新选择私人网络路线以减少网关维护；不愿部署网关则先在局域网使用。':nativeMac||rdp?'需要跨平台统一界面可评估 RustDesk 自建中继；已有受控 VPN 可保留，不必再叠网络。':s.device==='windows'?'如已有合法专业版许可，可升级后使用 RDP + 私有网络；先核对升级费用，不使用家庭版 RDP 破解补丁。':'若发行版支持，可用系统 VNC / RDP 服务端 + 私有网络，先核对 Wayland 与无人值守支持。',
   steps:[deviceStep,browser?'在受支持的 Linux 主机部署 Guacamole 网关；目标端另启用兼容 VNC / RDP，Windows 家庭版需额外受支持的 VNC 服务端，不能直接启用 RDP。':nativeMac?'在系统设置中启用屏幕共享，仅授权指定用户；访问端需兼容的屏幕共享 / VNC 客户端，跨平台先在局域网测试认证兼容性。':rdp?'启用 RDP 与网络级身份验证，仅允许指定账户；家庭版不支持此服务端。':'部署官方 RustDesk ID / 中继服务，在两端安装客户端并配置自建服务器地址与公钥；先核对服务端支持平台和网络入口，可放在双方能连接的私有网络网关。不具备入口时另行评估 VPS / 中继成本，不能只装客户端就声称自托管。',networkStep,browser?'设置有效 HTTPS、多因素身份验证、登录保护和会话权限；不把目标 VNC / RDP 暴露公网。':'先本地测试授权、会话和锁屏行为，再从外网连接；无人值守需额外评估权限与休眠唤醒。'],
   checks:['使用外网授权账号连接，操作一个测试窗口后断开；不授权账号应被拒绝。','重启、锁屏和休眠后分别验证；Mac 屏幕录制 / 辅助功能、Linux Wayland 限制需实际检查。'],
   risks:['网关 / 中继可能需要额外常开 Linux 主机、域名与成本。','远程控制有完整桌面权限；不要公网裸露 3389 / 5900，不共享管理员口令。',security],docs:browser?[docs.guacamole,docs.rdp]:nativeMac?[docs.mac,docs.tailscale]:rdp?[docs.rdp,docs.tailscale]:[docs.rustdesk,docs.tailscale],tool:'selfhosted'};
 }
 return r;
}
const escape = (v: unknown) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const list = (items:string[]) => items.map(text=>`<li>${escape(text)}</li>`).join('');
export function renderResult(s:Selection):string {
 const r=recommend(s);
 const n=r.network;
 const network=n?`<section class="solution-network"><span class="eyebrow">${s.client==='yes'?'额外网络方案 · 按前提选择':'主路线的具体网络配置'}</span><h3>${escape(n.title)}</h3><p>${escape(n.reason)}</p><div class="solution-paths" aria-label="内外网访问路径">${n.paths.map(path=>`<p>${escape(path)}</p>`).join('')}</div><h4>前提与配置步骤</h4><ol>${list(n.steps)}</ol><h4>双路径验收与回退</h4><ul>${list(n.checks)}</ul><div class="solution-risk"><h4>公网风险与维护边界</h4><ul>${list(n.risks)}</ul></div><h4>官方文档</h4><ul>${n.docs.map(d=>`<li><a href="${escape(d.url)}" target="_blank" rel="noopener noreferrer">${escape(d.label)} ↗</a></li>`).join('')}</ul></section>`:'';
 return `<article class="solution-result solution-panel"><span class="eyebrow">推荐路线 · 人工编辑</span><h2>${escape(r.title)}</h2><p>${escape(r.reason)}</p><p class="solution-summary">${Object.entries(s).filter(([,v])=>v!==undefined).map(([k,v])=>escape((choices[k as keyof typeof choices] as Record<string,string>)[v])).join(' · ')}</p><section><h3>为什么 / 备选</h3><p>${escape(r.alternative)}</p></section><section><h3>前置条件与步骤</h3><ol>${list(r.steps)}</ol></section><section><h3>怎么验收</h3><ul>${list(r.checks)}</ul></section><section class="solution-risk"><h3>风险与边界</h3><ul>${list(r.risks)}</ul></section><section><h3>继续阅读</h3><ul>${r.docs.map(d=>`<li><a href="${escape(d.url)}" target="_blank" rel="noopener noreferrer">${escape(d.label)} ↗</a></li>`).join('')}<li><a href="/tools/${r.tool}/" data-route>站内相关工具与原有指南 →</a></li></ul></section>${network}</article>`;
}
function fields(s:Partial<Selection>):(keyof typeof choices)[] {
 return ['goal','device',...(s.goal==='remote'&&s.device==='windows'?['edition' as const]:[]),...(s.goal==='remote'&&s.device==='linux'?['kind' as const]:[]),'audience','client'];
}
const fieldLabels = {goal:'先选一个目标',device:'家里的服务端设备',audience:'谁会访问？',client:'访问端能安装客户端吗？',kind:'这是哪种 Linux / NAS？',edition:'Windows 是哪个版本？'};
export function renderSolutions(params = new URLSearchParams(), draft:Partial<Selection> = {}, interactive = false):string {
 const valid=parseChoices(params);
 const s=valid ?? draft;
 const keys=fields(s);
 const index=keys.findIndex(k=>!s[k]);
 const field=keys[index<0?keys.length-1:index];
 const result=valid?renderResult(valid):'';
 const chooser=`<div class="solution-panel"><p class="solution-step">${index+1} / ${keys.length} · ${fieldLabels[field]}</p><h2>${fieldLabels[field]}</h2><div class="solution-choices">${Object.entries(choices[field]).map(([value,label])=>`<button type="button" data-choice="${value}" data-field="${field}"><b>${label}</b><small>${field==='goal'?({movie:'把合法媒体库留在家里，先确认播放和远程入口。',backup:'保护原图和文件，重点是独立副本与恢复验证。',remote:'控制自己的桌面，区分系统版本与访问权限。'} as Record<string,string>)[value]:field==='device'?'设备能力会影响安装与维护方式':field==='client'?'仅指访问端；服务端仍需安装与配置':'选择符合真实环境的条件'}</small></button>`).join('')}</div>${index>0?'<button class="ghost-link" type="button" data-solution-back>返回上一步</button>':''}</div>`;
 return `<section class="solutions"><header><span class="eyebrow">OneMJJ / 从需求到路线</span><h1 tabindex="-1">${valid?'你的方案路线':'你想做什么？'}</h1><p>${solutionsDescription}</p><p class="solution-note">无需 OneMJJ 账号 · 无 AI 推荐 · 向导不增加跟踪或保存设备信息。分享只包含选择枚举，不包含 IP、口令或文件路径。本站已有广告与 CDN 日志详见<a href="/privacy/" data-route>隐私政策</a>。</p></header>${result||chooser}${interactive?`<div class="solution-actions">${valid?'<button class="primary-link" type="button" data-solution-copy>复制方案链接</button><button class="ghost-link" type="button" data-solution-edit>修改选择</button>':''}<button class="ghost-link" type="button" data-solution-reset>重新开始</button><a class="ghost-link" href="/" data-route>返回首页</a></div><p role="status">${params.size&&!valid?'分享链接无效或已过期，请重新选择。':''}</p>${valid?`<label class="solution-share">方案链接<input aria-label="方案链接" readonly value="${escape(new URL(solutionPath(valid),window.location.origin).href)}"></label>`:''}`:`<p>启用 JavaScript 可使用卡片选择${valid?'；当前路线可直接阅读。':'；下方为可直接阅读的路线示例。'}</p>`}${!interactive&&!valid?`<h2>三个目标的起点</h2>${(['movie','backup','remote'] as const).map(goal=>`<h3>${choices.goal[goal]}</h3>${renderResult({goal,device:'mac',audience:'family',client:'yes'})}`).join('')}`:''}</section>`;
}
export function bindSolutions(rerender:()=>void):void {
 const current=parseChoices(new URLSearchParams(location.search));
 const draft:Partial<Selection>=current??history.state?.solutionDraft??{};
 const update=(s:Partial<Selection>,complete=true)=>{
  const keys=fields(s);const clean=Object.fromEntries(keys.filter(k=>s[k]).map(k=>[k,s[k]]));
  const valid=complete?parseChoices(new URLSearchParams(clean as Record<string,string>)):null;
  history.pushState({solutionDraft:clean},'',valid?solutionPath(valid):'/solutions/');rerender();
  document.querySelector<HTMLElement>('.solutions h1')?.focus();
 };
 document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b=>b.addEventListener('click',()=>update({...draft,[b.dataset.field!]:b.dataset.choice})));
 document.querySelector('[data-solution-back]')?.addEventListener('click',()=>{
  const keys=fields(draft);const last=keys.filter(k=>draft[k]).at(-1);const s={...draft};if(last)delete s[last];update(s,false);
 });
 document.querySelector('[data-solution-reset]')?.addEventListener('click',()=>update({},false));
 document.querySelector('[data-solution-edit]')?.addEventListener('click',()=>{const s={...draft};delete s.client;update(s,false);});
 document.querySelector('[data-solution-copy]')?.addEventListener('click',async()=>{
  const status=document.querySelector<HTMLElement>('.solutions [role="status"]')!;
  try {if(!current||!navigator.clipboard)throw new Error('Unavailable');await navigator.clipboard.writeText(new URL(solutionPath(current),location.origin).href);status.textContent='已复制方案链接';}
  catch {status.textContent='复制失败，请手动复制下方方案链接';document.querySelector<HTMLInputElement>('.solution-share input')?.select();}
 });
}
export const choices = {
 goal: { movie: '🎬 远程看家里的电影', backup: '📷 备份照片和文件', remote: '🖥️ 远程控制电脑' },
 device: { mac: 'Mac', windows: 'Windows', linux: 'Linux 或 NAS' },
 audience: { family: '自己 / 家人', public: '公共访客' },
 client: { yes: '可以安装客户端', no: '只用浏览器' },
 kind: { linux: '有桌面的 Linux', nas: 'NAS / 无桌面服务器' },
 edition: { home: 'Windows 家庭版 / 不确定', pro: 'Windows 专业版 / 企业版' },
} as const;
export type Selection = { goal: keyof typeof choices.goal; device: keyof typeof choices.device; audience: keyof typeof choices.audience; client: keyof typeof choices.client; kind?: keyof typeof choices.kind; edition?: keyof typeof choices.edition };
export function parseChoices(params: URLSearchParams): Selection | null {
 const keys = ['goal', 'device', 'audience', 'client'];
 if (params.get('goal') === 'remote' && params.get('device') === 'linux') keys.push('kind');
 if (params.get('goal') === 'remote' && params.get('device') === 'windows') keys.push('edition');
 if ([...params.keys()].some(key => !keys.includes(key))) return null;
 for (const key of keys) if (params.getAll(key).length !== 1 || !Object.hasOwn(choices[key as keyof typeof choices], params.get(key)!)) return null;
 return Object.fromEntries(keys.map(key => [key, params.get(key)])) as Selection;
}
export function solutionPath(selection: Selection): string {
 const params = new URLSearchParams(Object.entries(selection));
 const valid = parseChoices(params);
 if (!valid) throw new Error('Invalid solution choices');
 return '/solutions/?' + new URLSearchParams(Object.entries(valid)).toString();
}
