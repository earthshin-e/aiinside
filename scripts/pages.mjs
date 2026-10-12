// 정리 기사와 브리핑마다 검색엔진이 읽을 수 있는 정적 페이지(public/recap/<id>.html)와 sitemap.xml 을 만듭니다.
// 사용법: node scripts/pages.mjs  (수집과 정리 기사 작성이 끝난 뒤 워크플로에서 실행)
// 메인 화면은 한 페이지 안에서 # 주소로 화면만 바꾸기 때문에 검색엔진이 정리 기사를 따로 색인하지 못합니다.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const SITE = 'https://ainewswave.com';
const GA = 'G-TPL7MTLPRB';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { stories = [] } = JSON.parse(await readFile(path.join(pub, 'data', 'stories.json'), 'utf8'));
const kstDate = (iso) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600000);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// 주제별 정리 기사 모음 페이지 주소(/recap/topic-<slug>.html)
const TOPICS = { '생성형AI': 'genai', '반도체': 'chip', '로봇': 'robot', '정책': 'policy', '기업': 'company', '연구': 'research', '보안/윤리': 'security', '일반': 'general' };
const topicFile = (c) => `topic-${TOPICS[c] || 'general'}.html`;

function page(st, others) {
  const url = `${SITE}/recap/${st.id}.html`;
  const desc = (st.points && st.points.length ? st.points.join('. ') : st.body[0] || '').slice(0, 150);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: st.title,
    datePublished: st.published,
    dateModified: st.published,
    description: desc,
    mainEntityOfPage: url,
    author: st.author ? { '@type': 'Person', name: st.author } : { '@type': 'Organization', name: 'AI 뉴스웨이브', url: SITE },
    publisher: { '@type': 'Organization', name: 'AI 뉴스웨이브', logo: { '@type': 'ImageObject', url: `${SITE}/icon512.png` } },
    image: `${SITE}/og.png`,
  };
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(st.title)} | AI 뉴스웨이브</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${st.en && st.en.title ? `<link rel="alternate" hreflang="ko" href="${url}">\n<link rel="alternate" hreflang="en" href="${SITE}/en/recap/${st.id}.html">` : ''}
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI 뉴스웨이브">
<meta property="og:title" content="${esc(st.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="article:published_time" content="${esc(st.published)}">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<link rel="alternate" type="application/rss+xml" title="AI 뉴스웨이브 정리 기사" href="/recap/feed.xml">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script src="/consent.js"></script>
<script src="/feedback.js" defer></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
  <article>
    <p class="meta">${st.type === 'briefing' ? 'AI 브리핑' : `<a href="${topicFile(st.category)}">${esc(st.category)}</a>`}</p>
    <h1>${esc(st.title)}</h1>
    <p class="meta">${st.author ? `글 ${esc(st.author)}` : 'AI 뉴스웨이브'} | ${kstDate(st.published)} | ${st.sources.length}개 매체 보도 종합</p>
    ${st.points && st.points.length ? `<h2>핵심 요약</h2>\n    <ul>${st.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <h2>본문</h2>
    ${st.body.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
    <h2>출처</h2>
    <ul>${st.sources.map((x) => `<li>${esc(x.name)}: <a href="${esc(x.link)}" rel="noopener nofollow" target="_blank">${esc(x.title)}</a></li>`).join('')}</ul>
    <p class="meta">이 글은 위 매체들의 보도에서 확인된 사실을 AI 뉴스웨이브가 새로 정리한 것입니다. 자세한 내용은 각 언론사 원문을 확인하세요.</p>
  </article>
  ${others.length ? `<h2>다른 정리 기사</h2>
  <ul>${others.map((o) => `<li><a href="${esc(o.id)}.html">${esc(o.title)}</a></li>`).join('')}</ul>` : ''}
  <p><a href="./">정리 기사 전체 보기</a> | <a href="../">AI 뉴스웨이브에서 최신 AI 뉴스 보기</a></p>
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a><a href="/en/" hreflang="en">English</a></footer>
</body>
</html>
`;
}

const dir = path.join(pub, 'recap');
await mkdir(dir, { recursive: true });
const keep = new Set([...stories.map((s) => `${s.id}.html`), 'index.html', 'feed.xml', ...Object.keys(TOPICS).map(topicFile)]);
for (const f of await readdir(dir)) if (f.endsWith('.html') && !keep.has(f)) await unlink(path.join(dir, f));
const sorted = [...stories].sort((a, b) => new Date(b.published) - new Date(a.published));
for (const st of sorted) {
  const others = sorted.filter((o) => o.id !== st.id).slice(0, 5);
  await writeFile(path.join(dir, `${st.id}.html`), page(st, others));
}

// 정리 기사 모음 페이지 (/recap/): 브리핑과 정리 기사를 날짜별로 모아 보여 줍니다.
const dayKey = (iso) => { const d = new Date(new Date(iso).getTime() + 9 * 3600000); return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; };
const group = (list) => {
  const m = new Map();
  for (const x of list) { const k = dayKey(x.published); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return [...m.entries()];
};
const briefs = sorted.filter((x) => x.type === 'briefing');
const plain = sorted.filter((x) => x.type !== 'briefing');
const listPage = ({ title, desc, canon, main }) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | AI 뉴스웨이브</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/recap/${canon}">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<link rel="alternate" type="application/rss+xml" title="AI 뉴스웨이브 정리 기사" href="/recap/feed.xml">
<script src="/consent.js"></script>
<script src="/feedback.js" defer></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
${main}
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="./">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a><a href="/en/" hreflang="en">English</a></footer>
</body>
</html>
`;
const plainCats = Object.keys(TOPICS).filter((c) => plain.some((x) => x.category === c));
const topicNav = (cur) => `<p class="topics">${[['', '전체', plain.length], ...plainCats.map((c) => [topicFile(c), c, plain.filter((x) => x.category === c).length])]
  .map(([href, label, n]) => label === cur ? `<strong>${esc(label)} ${n}</strong>` : `<a href="${href || './'}">${esc(label)} ${n}</a>`).join('')}</p>`;
const dayList = (list) => group(list).map(([day, l]) => `<h3>${day}</h3>
  <ul>${l.map((x) => `<li><a href="${esc(x.id)}.html">${esc(x.title)}</a> <span class="meta">${x.sources.length}개 매체</span></li>`).join('')}</ul>`).join('\n  ');
const indexHtml = listPage({
  title: 'AI 브리핑과 정리 기사',
  desc: 'AI 뉴스웨이브가 여러 매체의 보도를 종합해 새로 쓴 정리 기사와 매일 AI 브리핑 모음입니다.',
  canon: '',
  main: `  <h1>AI 브리핑과 정리 기사</h1>
  <p>여러 매체가 함께 보도한 AI 소식을 AI 뉴스웨이브가 사실만 모아 새로 정리한 글입니다. 각 글 아래에 근거가 된 기사 출처를 밝힙니다.</p>
  <p class="meta"><a href="feed.xml">RSS 로 구독하기</a></p>
  <h2>매일 AI 브리핑</h2>
  ${briefs.length ? `<ul>${briefs.map((b) => `<li><a href="${esc(b.id)}.html">${esc(b.title)}</a></li>`).join('')}</ul>` : '<p class="meta">아직 브리핑이 없습니다.</p>'}
  <h2>정리 기사</h2>
  ${topicNav('전체')}
  ${dayList(plain)}`,
});
for (const c of Object.keys(TOPICS)) {
  const list = plain.filter((x) => x.category === c);
  await writeFile(path.join(dir, topicFile(c)), listPage({
    title: `${c} 정리 기사`,
    desc: `AI 뉴스웨이브가 여러 매체 보도를 종합해 정리한 ${c} 분야 AI 소식 모음입니다.`,
    canon: topicFile(c),
    main: `  <h1>${esc(c)} 정리 기사</h1>
  <p>여러 매체가 함께 보도한 ${esc(c)} 분야 AI 소식을 사실만 모아 새로 정리한 글입니다. <a href="./">전체 정리 기사</a></p>
  ${topicNav(c)}
  ${list.length ? dayList(list) : '<p class="meta">아직 이 주제의 정리 기사가 없습니다.</p>'}`,
  }));
}
await writeFile(path.join(dir, 'index.html'), indexHtml);

// 예전 주소(/s/)로 들어온 방문자와 검색엔진을 새 주소(/recap/)로 보냅니다.
const old = path.join(pub, 's');
await mkdir(old, { recursive: true });
for (const f of await readdir(old)) await unlink(path.join(old, f));
const redirect = (to) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>AI 뉴스웨이브</title><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="robots" content="noindex"></head><body><a href="${to}">${to}</a></body></html>\n`;
await writeFile(path.join(old, 'index.html'), redirect(`${SITE}/recap/`));
for (const st of stories) await writeFile(path.join(old, `${st.id}.html`), redirect(`${SITE}/recap/${st.id}.html`));

// 기사별 검색용 페이지(/a/<id>.html): 뉴스웨이브가 쓴 핵심 요약이 있는 기사만 만듭니다.
// 언론사 요약 전문 대신 우리 핵심 요약을 중심에 두고, 원문 링크와 같은 소식 다른 매체, 관련 정리 기사를 붙입니다.
let artData = { articles: [] };
try { artData = JSON.parse(await readFile(path.join(pub, 'data', 'articles.json'), 'utf8')); } catch { /* 수집 전 */ }
const withPoints = (artData.articles || []).filter((a) => !a.restricted && Array.isArray(a.points) && a.points.length);
const adir = path.join(pub, 'a');
await mkdir(adir, { recursive: true });
const akeep = new Set(withPoints.map((a) => `${a.id}.html`));
for (const f of await readdir(adir)) if (f.endsWith('.html') && !akeep.has(f)) await unlink(path.join(adir, f));
const bigrams = (t) => { const s = String(t).replace(/\[[^\]]*\]/g, '').replace(/[^가-힣a-zA-Z0-9]/g, '').toLowerCase(); const r = new Set(); for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r; };
const grams = new Map((artData.articles || []).map((a) => [a.id, bigrams(a.title)]));
const sim = (x, y) => { if (x.size < 6 || y.size < 6) return 0; let n = 0; for (const g of x) if (y.has(g)) n++; return n / Math.min(x.size, y.size); };
const storyOf = new Map(); for (const st of stories) for (const s of st.sources || []) if (!storyOf.has(s.id)) storyOf.set(s.id, st);
const pointIds = new Set(withPoints.map((a) => a.id));
function articlePage(a) {
  const url = `${SITE}/a/${a.id}.html`;
  const desc = a.points.join('. ').slice(0, 150);
  const g = grams.get(a.id);
  const same = (artData.articles || []).filter((b) => b.id !== a.id && !b.restricted && b.sourceId !== a.sourceId && sim(g, grams.get(b.id)) >= 0.45).slice(0, 6);
  const st = storyOf.get(a.id);
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.published, description: desc, mainEntityOfPage: url, isBasedOn: a.link,
    author: { '@type': 'Organization', name: 'AI 뉴스웨이브', url: SITE }, publisher: { '@type': 'Organization', name: 'AI 뉴스웨이브', logo: { '@type': 'ImageObject', url: `${SITE}/icon512.png` } } };
  const link = (b) => pointIds.has(b.id) ? `/a/${esc(b.id)}.html` : esc(b.link);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(a.title)} | AI 뉴스웨이브</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI 뉴스웨이브">
<meta property="og:title" content="${esc(a.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../page.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script src="/consent.js"></script>
<script src="/feedback.js" defer></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2376619512263295" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="../"><img src="../icon.svg" alt="">AI 뉴스웨이브</a></div></header>
<main class="wrap">
  <article>
    <p class="meta">${esc(a.category || '')}</p>
    <h1>${esc(a.title)}</h1>
    <p class="meta">${esc(a.source)}${a.newsroom ? ' (기업 뉴스룸)' : ''} | ${kstDate(a.published)}</p>
    <h2>핵심 요약</h2>
    <ul>${a.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <p class="meta">핵심 요약은 AI 뉴스웨이브가 기사 제목과 언론사 요약을 바탕으로 정리했습니다. 자세한 내용은 원문에서 확인하세요.</p>
    <p class="btns"><a class="btn primary" href="${esc(a.link)}" rel="noopener" target="_blank">${esc(a.source)}에서 원문 보기</a><a class="btn" href="../#a/${esc(a.id)}">AI 뉴스웨이브에서 보기</a></p>
  </article>
  ${st ? `<h2>뉴스웨이브 정리 기사</h2>\n  <ul><li><a href="../recap/${esc(st.id)}.html">${esc(st.title)}</a></li></ul>` : ''}
  ${same.length ? `<h2>같은 소식, 다른 매체</h2>\n  <ul>${same.map((b) => `<li><a href="${link(b)}">${esc(b.title)}</a> <span class="meta">${esc(b.source)}</span></li>`).join('')}</ul>` : ''}
</main>
<footer class="wrap foot"><a href="../">홈</a><a href="../recap/">정리 기사</a><a href="../about.html">소개</a><a href="../privacy.html">개인정보처리방침</a><a href="../contact.html">문의</a><a href="#feedback" data-feedback>의견 보내기</a><a href="/en/" hreflang="en">English</a></footer>
</body>
</html>
`;
}
for (const a of withPoints) await writeFile(path.join(adir, `${a.id}.html`), articlePage(a));
// 기사 페이지 RSS(/a/feed.xml): 최신 100건. Search Console 에 사이트맵 대신 제출해 새 페이지를 빨리 알립니다.
const afeedItems = [...withPoints].sort((x, y) => new Date(y.published) - new Date(x.published)).slice(0, 100);
const acdata = (t) => `<![CDATA[${String(t).replace(/]]>/g, ']]&gt;')}]]>`;
await writeFile(path.join(adir, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>AI 뉴스웨이브: 기사 핵심 요약</title>
  <link>${SITE}/</link>
  <description>국내 AI 기사마다 AI 뉴스웨이브가 정리한 3줄 핵심 요약</description>
  <language>ko</language>
${afeedItems.map((a) => `  <item>
    <title>${acdata(a.title)}</title>
    <link>${SITE}/a/${a.id}.html</link>
    <guid isPermaLink="true">${SITE}/a/${a.id}.html</guid>
    <pubDate>${new Date(a.published).toUTCString()}</pubDate>
    <description>${acdata(a.points.join(' / '))}</description>
  </item>`).join('\n')}
</channel>
</rss>
`);

// 기자 검토용 초안 미리보기(/draft/<id>.html): public/data/drafts.json 의 글. 검색 노출 금지, 사이트맵과 목록에 넣지 않습니다.
let drafts = [];
try { drafts = JSON.parse(await readFile(path.join(pub, 'data', 'drafts.json'), 'utf8')).drafts || []; } catch { /* 없음 */ }
const ddir = path.join(pub, 'draft');
await mkdir(ddir, { recursive: true });
for (const f of await readdir(ddir)) if (f.endsWith('.html')) await unlink(path.join(ddir, f));
for (const d of drafts) {
  const html = page({ ...d, published: d.published || new Date().toISOString() }, [])
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow">')
    .replace('<article>', '<p style="padding:8px 12px;border:1px solid #b7791f;color:#b7791f">검토용 초안입니다. 아직 공개되지 않았습니다.</p>\n  <article>');
  await writeFile(path.join(ddir, `${d.id}.html`), html);
}

// 영문판(/en/): 뉴스웨이브가 쓴 글(정리 기사, 기자 기사, 브리핑) 중 영어 번역(st.en = {title, points, body})이 있는 것만 싣습니다.
// 한국 언론사 기사 제목과 요약은 번역하지 않습니다(남의 글 번역은 2차적 저작물). 출처는 매체명과 원문 링크만 둡니다.
const enStories = [...stories].filter((s) => s.en && s.en.title && Array.isArray(s.en.body)).sort((a, b) => new Date(b.published) - new Date(a.published));
const edir = path.join(pub, 'en');
const erdir = path.join(edir, 'recap');
await mkdir(erdir, { recursive: true });
for (const f of await readdir(erdir)) if (f.endsWith('.html') && !enStories.some((s) => `${s.id}.html` === f)) await unlink(path.join(erdir, f));
const enDate = (iso) => new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' KST';
const enHead = (title, desc, canon, alt, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<link rel="alternate" hreflang="en" href="${canon}">
${alt ? `<link rel="alternate" hreflang="ko" href="${alt}">` : ''}
<meta property="og:site_name" content="AI NewsWave">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${SITE}/og.png">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/page.css">
${extra}
<script src="/consent.js"></script>
<meta name="google-adsense-account" content="ca-pub-2376619512263295">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}');</script>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="/en/"><img src="/icon.svg" alt="">AI NewsWave</a> <a class="meta" href="${alt || '/'}" style="float:right;padding:14px 0">한국어</a></div></header>
`;
const enFoot = `<footer class="wrap foot"><a href="/en/">Home</a><a href="/en/about.html">About</a><a href="/">한국어</a></footer>
</body>
</html>
`;
for (const st of enStories) {
  const e = st.en, url = `${SITE}/en/recap/${st.id}.html`;
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: e.title, inLanguage: 'en', datePublished: st.published, description: (e.points || []).join('. ').slice(0, 150), mainEntityOfPage: url,
    author: st.author ? { '@type': 'Person', name: st.author } : { '@type': 'Organization', name: 'AI NewsWave', url: SITE }, publisher: { '@type': 'Organization', name: 'AI NewsWave', logo: { '@type': 'ImageObject', url: `${SITE}/icon512.png` } } };
  await writeFile(path.join(erdir, `${st.id}.html`), enHead(`${e.title} | AI NewsWave`, (e.points || []).join('. ').slice(0, 150), url, `${SITE}/recap/${st.id}.html`, `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`) + `<main class="wrap">
  <article>
    <p class="meta">${st.type === 'briefing' ? 'AI Briefing' : 'Korea AI News'}</p>
    <h1>${esc(e.title)}</h1>
    <p class="meta">${st.author ? `By ${esc(st.author)}` : 'AI NewsWave'} | ${enDate(st.published)} | Based on ${st.sources.length} Korean news reports</p>
    ${e.points && e.points.length ? `<h2>Key points</h2>\n    <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${e.body.map((p) => `<p>${esc(p)}</p>`).join('\n    ')}
    <h2>Sources (in Korean)</h2>
    <ul>${st.sources.map((s) => `<li><a href="${esc(s.link)}" rel="noopener" target="_blank">${esc(s.name)}</a></li>`).join('')}</ul>
    <p class="meta">${st.author ? `Written by ${esc(st.author)} with AI writing tools and reviewed before publication.` : 'Compiled by AI NewsWave from facts confirmed across the Korean reports above.'} Translated from the <a href="/recap/${esc(st.id)}.html">Korean version</a>.</p>
  </article>
</main>
` + enFoot);
}
await writeFile(path.join(edir, 'index.html'), enHead('AI NewsWave: Korea AI news in English', 'Daily briefings and news recaps on the Korean AI industry, compiled from Korean media reports.', `${SITE}/en/`, `${SITE}/`) + `<main class="wrap">
  <h1>Korea AI news, in English</h1>
  <p>AI NewsWave follows Korean AI and tech media every 30 minutes. Here we publish English versions of our daily briefings and news recaps on Korean AI companies, chips, policy and research.</p>
  ${enStories.length ? `<ul>${enStories.map((s) => `<li><a href="recap/${esc(s.id)}.html">${esc(s.en.title)}</a> <span class="meta">${enDate(s.published)}</span></li>`).join('')}</ul>` : '<p class="meta">English articles are coming soon.</p>'}
</main>
` + enFoot);
await writeFile(path.join(edir, 'about.html'), enHead('About | AI NewsWave', 'About AI NewsWave', `${SITE}/en/about.html`, `${SITE}/about.html`) + `<main class="wrap">
  <h1>About AI NewsWave</h1>
  <p>AI NewsWave is a Korean AI news service. We collect AI-related headlines from Korean media and publish our own recaps that combine facts confirmed across several outlets, with links to every original report.</p>
  <p>Articles with a reporter's byline are written with AI writing tools and reviewed by that reporter before publication. Unsigned recaps and briefings are generated automatically and checked sentence by sentence every week.</p>
  <p>We do not translate or republish Korean media articles. English pages contain only text we wrote ourselves.</p>
  <p>Contact: appealrequested@gmail.com</p>
</main>
` + enFoot);

const now = new Date().toISOString();
const urls = [
  { loc: `${SITE}/`, lastmod: now, freq: 'hourly', pri: '1.0' },
  { loc: `${SITE}/recap/`, lastmod: now, freq: 'daily', pri: '0.9' },
  ...plainCats.map((c) => ({ loc: `${SITE}/recap/${topicFile(c)}`, lastmod: now, freq: 'daily', pri: '0.6' })),
  ...['about', 'privacy', 'contact'].map((p) => ({ loc: `${SITE}/${p}.html`, freq: 'monthly', pri: '0.3' })),
  { loc: `${SITE}/en/`, lastmod: now, freq: 'daily', pri: '0.8' },
  ...enStories.map((s) => ({ loc: `${SITE}/en/recap/${s.id}.html`, lastmod: s.published, freq: 'never', pri: '0.7' })),
  ...withPoints.map((a) => ({ loc: `${SITE}/a/${a.id}.html`, lastmod: a.published, freq: 'weekly', pri: '0.5' })),
  ...stories.map((s) => ({ loc: `${SITE}/recap/${s.id}.html`, lastmod: s.published, freq: 'never', pri: s.type === 'briefing' ? '0.8' : '0.7' })),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(path.join(pub, 'sitemap.xml'), xml);

// 자체 RSS 피드(/recap/feed.xml): 정리 기사와 브리핑 최신 50건. 본문 대신 핵심 요약을 설명으로 넣고 전문은 사이트로 연결합니다.
const rfc822 = (iso) => new Date(iso).toUTCString();
const cdata = (t) => `<![CDATA[${String(t).replace(/]]>/g, ']]&gt;')}]]>`;
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>AI 뉴스웨이브: AI 브리핑과 정리 기사</title>
  <link>${SITE}/recap/</link>
  <atom:link href="${SITE}/recap/feed.xml" rel="self" type="application/rss+xml"/>
  <description>여러 매체가 함께 보도한 AI 소식을 사실만 모아 새로 정리한 글과 매일 AI 브리핑</description>
  <language>ko</language>
  <lastBuildDate>${rfc822(now)}</lastBuildDate>
${sorted.slice(0, 50).map((st) => `  <item>
    <title>${cdata(st.title)}</title>
    <link>${SITE}/recap/${st.id}.html</link>
    <guid isPermaLink="true">${SITE}/recap/${st.id}.html</guid>
    <pubDate>${rfc822(st.published)}</pubDate>
    <category>${cdata(st.type === 'briefing' ? 'AI 브리핑' : st.category)}</category>
    <description>${cdata((st.points || []).join(' / ') || st.body[0] || '')}</description>
  </item>`).join('\n')}
</channel>
</rss>
`;
await writeFile(path.join(dir, 'feed.xml'), feed);
console.log(`기사 페이지 ${withPoints.length}건, 정적 페이지 ${stories.length}건, sitemap.xml ${urls.length}개 주소`);
