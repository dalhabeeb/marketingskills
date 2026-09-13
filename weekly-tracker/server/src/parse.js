import { db } from './db.js';

const DAY_MAP = [
  { code: 'Mon', re: /\bmon(day)?\b/i },
  { code: 'Tue', re: /\btue(s|sday)?\b/i },
  { code: 'Wed', re: /\bwed(nesday)?\b/i },
  { code: 'Thu', re: /\bthu(r|rs|rsday)?\b/i },
  { code: 'Fri', re: /\bfri(day)?\b/i },
  { code: 'Sat', re: /\bsat(urday)?\b/i },
  { code: 'Sun', re: /\bsun(day)?\b/i },
];

const KEYWORDS = {
  tedx: ['tedx', 'organizer', 'organiser', 'speaker', 'stage', 'ted talk', 'talk prep'],
  study: [
    'study', 'pathology', 'pharma', 'pharmacology', 'pharmaceutics', 'therapy',
    'htn', 'asthma', 'cardio', 'cardiovascular', 'respiratory', 'disease',
    'medicinal chemistry', 'exam', 'lecture', 'revise', 'revision',
  ],
  research: ['research', 'doctor', 'psychiatry', 'interview', 'survey', 'paper', 'thesis', 'data collection'],
  creative: ['post', 'content', 'write', 'instagram', 'nabati', 'design', 'video', 'blog', 'caption', 'reel'],
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'by', 'with',
  'finish', 'contact', 'set', 'up', 'do', 'get', 'make', 'is', 'be', 'it',
  'this', 'that', 'at', 'about', 'into', 'day', 'week',
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function getDomains() {
  return db.prepare('SELECT id, key, name FROM domains ORDER BY sort_order').all();
}

function getHistoricalTerms() {
  // domainId -> array of tokens seen historically
  const rows = db.prepare('SELECT domain_id, text FROM classifier_terms').all();
  const map = {};
  for (const row of rows) {
    if (!map[row.domain_id]) map[row.domain_id] = [];
    map[row.domain_id].push(...tokenize(row.text));
  }
  return map;
}

function detectDeadline(text) {
  for (const { code, re } of DAY_MAP) {
    if (re.test(text)) return code;
  }
  return 'Thu';
}

function stripLeadingMarker(text) {
  return text
    .trim()
    .replace(/^\d+\s*[-.)\]]\s*/, '')
    .replace(/^[-*•]\s*/, '')
    .trim();
}

function splitIntoLines(text) {
  const rawLines = text.split(/\r?\n/).flatMap((line) => line.split(','));
  return rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => stripLeadingMarker(l))
    .filter((l) => l.length > 0);
}

function scoreDomain(domainKey, domainId, tokens, historicalTerms, lowerText) {
  let score = 0;
  for (const kw of KEYWORDS[domainKey] || []) {
    if (lowerText.includes(kw)) score += 3;
  }
  const histTokens = historicalTerms[domainId] || [];
  if (histTokens.length) {
    const histSet = new Set(histTokens);
    for (const t of tokens) {
      if (histSet.has(t)) score += 1;
    }
  }
  return score;
}

export function classifyLine(lineText, domains, historicalTerms) {
  const lowerText = lineText.toLowerCase();
  const tokens = tokenize(lineText);
  let best = null;
  let bestScore = -1;
  for (const d of domains) {
    const s = scoreDomain(d.key, d.id, tokens, historicalTerms, lowerText);
    if (s > bestScore) {
      bestScore = s;
      best = d;
    }
  }
  // Fallback when nothing matched at all: default bucket for generic tasks.
  if (bestScore <= 0) {
    best = domains.find((d) => d.key === 'creative') || domains[0];
  }
  return best;
}

export function parseQuickAdd(text) {
  const domains = getDomains();
  const historicalTerms = getHistoricalTerms();
  const lines = splitIntoLines(text);

  return lines.map((line) => {
    const domain = classifyLine(line, domains, historicalTerms);
    const deadline = detectDeadline(line);
    // Remove the day-of-week word from the title for readability.
    let title = line;
    for (const { re } of DAY_MAP) {
      title = title.replace(new RegExp(`\\b(by|on)?\\s*${re.source}\\b`, 'i'), '').trim();
    }
    title = title.replace(/\s{2,}/g, ' ').replace(/[,\s]+$/, '').trim();
    if (!title) title = line;
    return {
      domainId: domain.id,
      domainKey: domain.key,
      domainName: domain.name,
      title,
      deadline,
    };
  });
}
