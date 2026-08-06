import defaultData from './default-data.json';

export type Link = { label: string; url: string; note?: string };
export type Tool = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  badge?: string;
  private?: boolean;
  body: string;
  links: Link[];
  commands?: string[];
};
export type ScriptItem = { title: string; cmd: string; source?: Link };
export type Note = { tag: string; title: string; body: string };
export type Weekly = {
  issue: string;
  date: string;
  headlineTag: string;
  headlineTitle: string;
  headlineBody: string;
};
export type SiteData = { tools: Tool[]; scripts: ScriptItem[]; notes: Note[]; weekly?: Weekly };

export const fallbackData = defaultData as SiteData;
