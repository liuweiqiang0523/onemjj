function validString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function validUrl(value: unknown) {
  if (!validString(value, 2048)) return false;
  try {
    return ['https:', 'http:'].includes(new URL(value as string).protocol);
  } catch {
    return false;
  }
}

export function validData(data: any) {
  if (!data || !Array.isArray(data.tools) || !Array.isArray(data.scripts) || !Array.isArray(data.notes)) return false;
  if (data.tools.length > 100 || data.scripts.length > 100 || data.notes.length > 100) return false;
  const toolsValid = data.tools.every((tool: any) => tool
    && validString(tool.id, 80)
    && validString(tool.name, 120)
    && validString(tool.category, 80)
    && validString(tool.desc, 300)
    && validString(tool.body, 3000)
    && Array.isArray(tool.links)
    && tool.links.length <= 40
    && tool.links.every((link: any) => validString(link?.label, 160) && validUrl(link?.url))
    && (!tool.commands || (Array.isArray(tool.commands) && tool.commands.length <= 30 && tool.commands.every((command: unknown) => validString(command, 2000)))));
  const scriptsValid = data.scripts.every((script: any) => script
    && validString(script.title, 160)
    && validString(script.cmd, 2000)
    && (!script.source || (validString(script.source.label, 160) && validUrl(script.source.url))));
  const notesValid = data.notes.every((note: any) => note
    && validString(note.tag, 80)
    && validString(note.title, 200)
    && validString(note.body, 5000));
  const probeValid = !data.probe || (validString(data.probe?.label, 160) && validUrl(data.probe?.url));
  const heroLinksValid = !data.heroLinks || (Array.isArray(data.heroLinks)
    && data.heroLinks.length <= 20
    && data.heroLinks.every((link: any) => validString(link?.label, 160) && validUrl(link?.url)));
  return toolsValid && scriptsValid && notesValid && probeValid && heroLinksValid
 && (data.weekly === undefined || validWeekly(data.weekly))
 && (data.weeklyArchives === undefined || (Array.isArray(data.weeklyArchives) && data.weeklyArchives.length <= 100 && data.weeklyArchives.every(validWeekly) && new Set(data.weeklyArchives.map((w: any) => w.issue)).size === data.weeklyArchives.length));
}

function validDate(v: unknown) {
 if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
 const d = new Date(v + 'T00:00:00Z');
 return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v;
}
function validWeekly(w: any): boolean {
 if (!w || typeof w !== 'object' || Array.isArray(w)) return false;
 if (!validString(w.issue,8) || !/^\d{3,8}$/.test(w.issue) || !validDate(w.date)) return false;
 if (!validString(w.headlineTag,160) || !validString(w.headlineTitle,300) || !validString(w.headlineBody,10000)) return false;
 if (w.updated !== undefined && !validDate(w.updated)) return false;
 if (w.archiveNotice !== undefined && !validString(w.archiveNotice,3000)) return false;
 if (w.sections !== undefined && (!Array.isArray(w.sections) || w.sections.length > 40 || !w.sections.every((s: any) => validString(s?.title,300) && validString(s?.body,10000)))) return false;
 if ((w.tools !== undefined && !Array.isArray(w.tools)) || (w.notes !== undefined && !Array.isArray(w.notes))) return false;
 return validData({tools:w.tools ?? [],scripts:[],notes:w.notes ?? []});
}
