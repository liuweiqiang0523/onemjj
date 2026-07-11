let data = null;
let currentTool = 0;

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function showMessage(target, text, error = false) {
  target.textContent = text;
  target.className = text ? `status${error ? ' err' : ''}` : '';
}

const msg = (text, error = false) => showMessage($('#msg'), text, error);
const loginMsg = (text, error = false) => showMessage($('#loginMsg'), text, error);

async function api(action, payload = {}) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-onemjj-admin': '1' },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({ ok: false, error: 'BAD_RESPONSE' }));
  if (!response.ok || !result.ok) throw new Error(result.error || '请求失败');
  return result;
}

async function load() {
  const response = await fetch('/api/data', { cache: 'no-store' });
  if (!response.ok) throw new Error('DATA_UNAVAILABLE');
  data = await response.json();
  renderAll();
}

function showAdmin() {
  $('#login').classList.add('hidden');
  $('#admin').classList.remove('hidden');
}

function showLogin() {
  $('#admin').classList.add('hidden');
  $('#login').classList.remove('hidden');
}

async function doLogin(event) {
  event.preventDefault();
  const button = $('#loginBtn');
  button.disabled = true;
  loginMsg('正在验证…');
  try {
    await api('login', { username: $('#username').value.trim(), password: $('#password').value });
    $('#password').value = '';
    showAdmin();
    await load();
    loginMsg('');
  } catch (error) {
    const message = error.message === 'TOO_MANY_ATTEMPTS' ? '尝试次数过多，请 15 分钟后再试。' : '用户名或密码不正确。';
    loginMsg(message, true);
  } finally {
    button.disabled = false;
  }
}

function input(id, label, value = '', type = 'text') {
  return `<label>${escapeHtml(label)}<input id="${escapeHtml(id)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" /></label>`;
}

function textarea(id, label, value = '') {
  return `<label>${escapeHtml(label)}<textarea id="${escapeHtml(id)}">${escapeHtml(value)}</textarea></label>`;
}

const collectLines = value => value.split('\n').map(line => line.trim()).filter(Boolean);
const linksText = links => (links || []).map(link => `${link.label}|${link.url}|${link.note || ''}`).join('\n');

function parseLinks(value) {
  return collectLines(value).map(line => {
    const [label, url, note] = line.split('|').map(part => part?.trim());
    return { label: label || url, url, note: note || '' };
  }).filter(link => link.label && link.url);
}

function renderTools() {
  $('#toolList').innerHTML = data.tools.map((tool, index) => `<div class="row"><div><b>${escapeHtml(tool.icon)} ${escapeHtml(tool.name)}</b><small>${escapeHtml(tool.category)} · ${escapeHtml(tool.desc)}</small></div><div><button type="button" class="ghost" data-edit-tool="${index}">编辑</button><button type="button" class="danger" data-delete-tool="${index}">删除</button></div></div>`).join('');
  if (data.tools.length) editTool(Math.min(currentTool, data.tools.length - 1));
  else $('#toolForm').innerHTML = '<p>还没有工具，点击“新增工具”开始。</p>';
}

function editTool(index) {
  currentTool = index;
  const tool = data.tools[index] || {};
  $('#toolForm').innerHTML = `<div class="grid">${input('t_id', 'ID', tool.id || `tool-${Date.now()}`)}${input('t_icon', '图标', tool.icon || '🔗')}${input('t_name', '名称', tool.name)}${input('t_cat', '分类', tool.category)}${input('t_desc', '短说明', tool.desc)}${input('t_badge', '角标', tool.badge)}</div>${textarea('t_body', '详情说明', tool.body)}${textarea('t_links', '链接，每行：标题|URL|备注', linksText(tool.links))}${textarea('t_cmds', '命令，每行一条', (tool.commands || []).join('\n'))}<div class="actions"><button type="button" id="applyTool">应用到列表</button></div>`;
  $('#applyTool').addEventListener('click', saveTool);
}

function saveTool() {
  const tool = {
    id: $('#t_id').value.trim(), icon: $('#t_icon').value.trim() || '🔗', name: $('#t_name').value.trim(),
    category: $('#t_cat').value.trim() || 'Other', desc: $('#t_desc').value.trim(),
    badge: $('#t_badge').value.trim() || undefined, body: $('#t_body').value.trim(),
    links: parseLinks($('#t_links').value), commands: collectLines($('#t_cmds').value),
  };
  data.tools[currentTool] = tool;
  syncJson();
  renderTools();
  msg('已应用到预览数据，记得点击右上角“保存发布”。');
}

function renderScripts() {
  $('#scriptList').innerHTML = data.scripts.map((script, index) => `<div class="row"><div><b>${escapeHtml(script.title)}</b><small class="mono">${escapeHtml(script.cmd)}</small></div><div><button type="button" class="ghost" data-edit-script="${index}">编辑</button><button type="button" class="danger" data-delete-script="${index}">删除</button></div></div>`).join('');
}

function editScript(index) {
  const script = data.scripts[index];
  const title = prompt('脚本标题', script.title); if (title === null) return;
  const cmd = prompt('命令', script.cmd); if (cmd === null) return;
  const sourceUrl = prompt('来源 URL（可留空）', script.source?.url || ''); if (sourceUrl === null) return;
  data.scripts[index] = { title, cmd, ...(sourceUrl.trim() ? { source: { label: '查看来源', url: sourceUrl.trim() } } : {}) };
  syncJson(); renderScripts();
}

function renderNotes() {
  $('#noteList').innerHTML = data.notes.map((note, index) => `<div class="row"><div><b>${escapeHtml(note.tag)}｜${escapeHtml(note.title)}</b><small>${escapeHtml(note.body)}</small></div><div><button type="button" class="ghost" data-edit-note="${index}">编辑</button><button type="button" class="danger" data-delete-note="${index}">删除</button></div></div>`).join('');
}

function editNote(index) {
  const note = data.notes[index];
  const tag = prompt('标签', note.tag); if (tag === null) return;
  const title = prompt('标题', note.title); if (title === null) return;
  const body = prompt('内容', note.body); if (body === null) return;
  data.notes[index] = { tag, title, body };
  syncJson(); renderNotes();
}

function syncJson() { $('#jsonEdit').value = JSON.stringify(data, null, 2); }
function renderAll() { renderTools(); renderScripts(); renderNotes(); syncJson(); }

$('#loginForm').addEventListener('submit', doLogin);
$('#logoutBtn').addEventListener('click', async () => { try { await api('logout'); } finally { data = null; showLogin(); } });
$('#toolList').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.editTool !== undefined) editTool(Number(button.dataset.editTool));
  if (button.dataset.deleteTool !== undefined && confirm('删除这个工具？')) { data.tools.splice(Number(button.dataset.deleteTool), 1); currentTool = 0; syncJson(); renderTools(); }
});
$('#scriptList').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.editScript !== undefined) editScript(Number(button.dataset.editScript));
  if (button.dataset.deleteScript !== undefined && confirm('删除这个脚本？')) { data.scripts.splice(Number(button.dataset.deleteScript), 1); syncJson(); renderScripts(); }
});
$('#noteList').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.editNote !== undefined) editNote(Number(button.dataset.editNote));
  if (button.dataset.deleteNote !== undefined && confirm('删除这张卡片？')) { data.notes.splice(Number(button.dataset.deleteNote), 1); syncJson(); renderNotes(); }
});
$$('.tab').forEach(button => button.addEventListener('click', () => {
  $$('.tab').forEach(tab => tab.classList.remove('active')); button.classList.add('active');
  ['tools', 'scripts', 'notes', 'json'].forEach(id => $(`#${id}Panel`).classList.toggle('hidden', button.dataset.tab !== id));
}));
$('#newTool').addEventListener('click', () => { data.tools.push({ id: `tool-${Date.now()}`, name: '新工具', desc: '说明', icon: '🔗', category: 'Other', body: '详情说明', links: [] }); currentTool = data.tools.length - 1; syncJson(); renderTools(); });
$('#newScript').addEventListener('click', () => { data.scripts.push({ title: '新脚本', cmd: 'echo hello' }); syncJson(); renderScripts(); });
$('#newNote').addEventListener('click', () => { data.notes.push({ tag: '新标签', title: '新标题', body: '新内容' }); syncJson(); renderNotes(); });
$('#saveBtn').addEventListener('click', async () => {
  const button = $('#saveBtn'); button.disabled = true;
  try {
    if (!$('#jsonPanel').classList.contains('hidden')) data = JSON.parse($('#jsonEdit').value);
    const result = await api('save', { data });
    msg(`保存成功 · ${new Date(result.savedAt).toLocaleString('zh-CN')}`);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') { showLogin(); loginMsg('登录已过期，请重新登录。', true); }
    else msg(`保存失败：${error.message}`, true);
  } finally { button.disabled = false; }
});

(async () => {
  try { await api('session'); showAdmin(); await load(); }
  catch { showLogin(); }
})();
