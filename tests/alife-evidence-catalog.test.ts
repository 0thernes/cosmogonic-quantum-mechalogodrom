/**
 * Cross-format integrity for the source-audited catalog. These checks pin the
 * external-entry count, evidence labels, exports, and searchable published cards.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync, statSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseCsv } from '../scripts/alife-codeground-sensitivity';

interface CatalogEntry {
  id: string;
  canonical_name: string;
  category: string;
  verification_status: string;
  source_url: string;
}

interface AuditEvidence {
  counts: {
    catalog_external_entries: number;
    primary_source_reviewed: number;
    partial_source_reviewed: number;
  };
  category_counts: Record<string, number>;
  catalog: CatalogEntry[];
}

const artifact = (name: string): URL => new URL(`../docs/alife/${name}`, import.meta.url);
const readEvidence = (): AuditEvidence =>
  JSON.parse(readFileSync(artifact('cqm-audit-evidence.json'), 'utf8')) as AuditEvidence;
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
const unescapeHtml = (value: string): string =>
  value
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&amp;', '&');

describe('source-audited A-Life catalog publication', () => {
  test('150 unique external entries reconcile with declared evidence and category counts', () => {
    const evidence = readEvidence();
    const entries = evidence.catalog;
    expect(entries).toHaveLength(150);
    expect(evidence.counts.catalog_external_entries).toBe(entries.length);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    const normalizedNames = entries.map((entry) =>
      entry.canonical_name
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim(),
    );
    expect(normalizedNames.every(Boolean)).toBe(true);
    expect(new Set(normalizedNames).size).toBe(entries.length);
    const statuses: Record<string, number> = {};
    const categories: Record<string, number> = {};
    for (const entry of entries) {
      expect(entry.id).toMatch(/^C\d{3}$/);
      expect(entry.source_url, entry.canonical_name).toMatch(/^https?:\/\//);
      statuses[entry.verification_status] = (statuses[entry.verification_status] ?? 0) + 1;
      categories[entry.category] = (categories[entry.category] ?? 0) + 1;
    }
    expect(statuses).toEqual({
      'primary-source reviewed': 132,
      'partial-source reviewed': 18,
    });
    expect(evidence.counts.primary_source_reviewed).toBe(statuses['primary-source reviewed'] ?? 0);
    expect(evidence.counts.partial_source_reviewed).toBe(statuses['partial-source reviewed'] ?? 0);
    expect(categories).toEqual(evidence.category_counts);
  });

  test('CSV preserves every JSON identity, category, evidence label and source without extra rows', () => {
    const entries = readEvidence().catalog;
    const [header, ...rows] = parseCsv(
      readFileSync(artifact('cqm-alife-catalog.csv'), 'utf8').replace(/^\uFEFF/, ''),
    );
    expect(header).toBeDefined();
    expect(rows).toHaveLength(entries.length);
    const fields = [
      'id',
      'canonical_name',
      'category',
      'verification_status',
      'source_url',
    ] as const;
    for (const field of fields) expect(header!).toContain(field);
    const indices = fields.map((field) => header!.indexOf(field));
    for (const row of rows) expect(row).toHaveLength(header!.length);
    expect(rows.map((row) => indices.map((index) => row[index]))).toEqual(
      entries.map((entry) => fields.map((field) => entry[field])),
    );
  });

  test('HTML exposes all records and working filters, with intact linked publication artifacts', () => {
    const entries = readEvidence().catalog;
    const html = readFileSync(artifact('cqm-alife-catalog.html'), 'utf8');
    const articles = html.match(/<article\b[\s\S]*?<\/article>/g) ?? [];
    expect(articles).toHaveLength(entries.length);
    for (const entry of entries) {
      const heading = `<h2>${escapeHtml(entry.canonical_name)}</h2>`;
      const matches = articles.filter((article) => article.includes(heading));
      expect(matches, entry.canonical_name).toHaveLength(1);
      const article = matches[0]!;
      expect(article).toContain(`href="${escapeHtml(entry.source_url)}"`);
      const searchable = article.match(/\bdata-search="([^"]*)"/)?.[1];
      expect(searchable, entry.canonical_name).toContain(
        escapeHtml(entry.canonical_name.toLowerCase()),
      );
    }
    for (const control of ['search', 'category', 'status', 'count']) {
      expect(html).toContain(`id="${control}"`);
    }
    const downloads = ['cqm-alife-audit.pdf', 'cqm-alife-catalog.xlsx', 'cqm-alife-catalog.csv'];
    for (const filename of downloads) expect(html).toContain(`href="${filename}"`);
    for (const filename of [
      ...downloads,
      'cqm-alife-catalog.html',
      'cqm-audit-evidence.json',
      'cqm-audit-notes.md',
      'cqm-alife-audit-bundle.zip',
    ]) {
      expect(statSync(artifact(filename)).size, filename).toBeGreaterThan(0);
    }
    expect(readFileSync(artifact('cqm-alife-audit.pdf')).subarray(0, 5).toString()).toBe('%PDF-');
    for (const filename of ['cqm-alife-catalog.xlsx', 'cqm-alife-audit-bundle.zip']) {
      expect([...readFileSync(artifact(filename)).subarray(0, 4)], filename).toEqual([
        0x50, 0x4b, 0x03, 0x04,
      ]);
    }

    const cards = articles.map((article) => ({
      hidden: false,
      dataset: Object.fromEntries(
        [...article.matchAll(/data-(category|status|search)="([^"]*)"/g)].map((match) => [
          match[1]!,
          unescapeHtml(match[2]!),
        ]),
      ),
    }));
    const listeners: Record<string, () => void> = {};
    const control = (id: string) => ({
      value: '',
      addEventListener: (event: string, listener: () => void): void => {
        expect(event).toBe('input');
        listeners[id] = listener;
      },
    });
    const search = control('search');
    const category = control('category');
    const status = control('status');
    const count = { textContent: '' };
    const nodes = { '#search': search, '#category': category, '#status': status, '#count': count };
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeDefined();
    runInNewContext(
      script!,
      {
        document: {
          querySelectorAll: (selector: string) => (selector === 'article' ? cards : []),
          querySelector: (selector: keyof typeof nodes) => nodes[selector],
        },
      },
      { timeout: 1000 },
    );
    expect(count.textContent).toBe('Showing 150 of 150 comparison entries');
    search.value = entries[0]!.id;
    listeners.search!();
    expect(cards.filter((card) => !card.hidden)).toHaveLength(1);
    expect(count.textContent).toBe('Showing 1 of 150 comparison entries');
    search.value = '';
    status.value = 'partial-source reviewed';
    listeners.status!();
    expect(cards.filter((card) => !card.hidden)).toHaveLength(18);
    category.value = entries[0]!.category;
    listeners.category!();
    const expected = entries.filter(
      (entry) => entry.category === category.value && entry.verification_status === status.value,
    ).length;
    expect(cards.filter((card) => !card.hidden)).toHaveLength(expected);
    expect(count.textContent).toBe(`Showing ${expected} of 150 comparison entries`);
  });
});
