// IndexNow: 새로 공개된 페이지 주소를 네이버, 빙 등 IndexNow 참여 검색엔진에 바로 알립니다(2026-10-17).
// 키 파일은 public/c6078eebd8113a23b9153a625659b603.txt 이고 공개되어도 되는 값입니다(사이트 소유 확인용).
// 사용법:
//   node scripts/indexnow.mjs list            stories.prev.json 과 비교해 새 주소를 JSON 배열로 출력(배포 전, build 잡)
//   node scripts/indexnow.mjs send '<JSON>'   주소 목록을 보냄(배포 뒤, indexnow 잡)
//   node scripts/indexnow.mjs all             지금 있는 정리 기사와 영문 페이지 주소를 모두 보냄(처음 한 번, 손으로 실행)
import { readFile } from 'node:fs/promises';

const SITE = 'https://ainewswave.com';
const HOST = 'ainewswave.com';
const KEY = 'c6078eebd8113a23b9153a625659b603';
const read = async (p) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; } };
const hubs = [`${SITE}/`, `${SITE}/recap/`, `${SITE}/en/`];

async function send(urls) {
  urls = [...new Set(urls)].slice(0, 10000);
  if (!urls.length) { console.log('IndexNow: 보낼 주소 없음'); return; }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
  });
  console.log(`IndexNow: ${urls.length}개 주소, HTTP ${res.status}`);
  if (res.status >= 400) console.log(await res.text());
}

const [mode, arg] = process.argv.slice(2);
const cur = await read('public/data/stories.json');
const stories = (cur && cur.stories) || [];
if (mode === 'list') {
  const prev = await read('public/data/stories.prev.json');
  if (!prev) { console.log('[]'); process.exit(0); }
  const before = new Map((prev.stories || []).map((s) => [s.id, s]));
  const urls = [];
  for (const s of stories) {
    const p = before.get(s.id);
    if (!p) urls.push(`${SITE}/recap/${s.id}.html`);
    if (s.en && s.en.title && !(p && p.en && p.en.title)) urls.push(`${SITE}/en/recap/${s.id}.html`);
  }
  console.log(JSON.stringify(urls.length ? [...urls, ...hubs] : []));
} else if (mode === 'send') {
  let urls = [];
  try { urls = JSON.parse(arg || '[]'); } catch { /* 빈 목록 */ }
  await send(urls);
} else if (mode === 'all') {
  await send([...hubs, `${SITE}/en/about.html`, ...stories.map((s) => `${SITE}/recap/${s.id}.html`), ...stories.filter((s) => s.en && s.en.title).map((s) => `${SITE}/en/recap/${s.id}.html`)]);
} else {
  console.log('사용법: node scripts/indexnow.mjs list | send <JSON> | all');
}
