/** Regression coverage for the responsive nine-axis radar and its complete inline propagation. */
import { describe, expect, test } from 'bun:test';
import { chartRadar, replaceInlineRadar } from '../scripts/alife-comparison-stats';

const cosmo = {
  project: 'Cosmogonic Quantum Mechalogodrom',
  axes: [0, 1, 2, 3, 4, 5, 2.5, 3.5, 4.5],
};
const near = { project: 'A & B <peer>', axes: [5, 4, 3, 2, 1, 0, 1.5, 2.5, 3.5] };
const mean = [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9];

describe('nine-axis radar layout and inline synchronization', () => {
  test('all three plotted vectors preserve their scores after the layout change', () => {
    const svg = chartRadar(cosmo, mean, near);
    for (const [colour, values] of [
      ['#f59e0b', cosmo.axes],
      ['#a78bfa', mean],
      ['#34d399', near.axes],
    ] as const) {
      const points = svg.match(new RegExp(`<polygon points="([^"]+)" fill="${colour}"`))?.[1];
      expect(points).toBeDefined();
      const decoded = points!.split(' ').map((point) => {
        const [x, y] = point.split(',').map(Number) as [number, number];
        return Math.hypot(x - 240, y - 300) / 23.2;
      });
      expect(decoded).toHaveLength(9);
      decoded.forEach((score, j) => expect(score).toBeCloseTo(values[j]!, 2));
    }
  });

  test('complete inline replacement propagates labels and accessibility, preserving surrounding HTML', () => {
    const radar = chartRadar(cosmo, mean, near);
    const old =
      '<svg viewBox="0 0 640 600" aria-label="Nine-axis capability radar: old"><text>clipped</text></svg>';
    const html = `<section>Before</section>${old}<footer>After</footer>`;
    const result = replaceInlineRadar(html, radar, 'fixture');
    expect(result).toBe(`<section>Before</section>${radar}<footer>After</footer>`);
    expect(replaceInlineRadar(result, radar, 'fixture')).toBe(result);
    expect(() => replaceInlineRadar('<main>No radar</main>', radar, 'missing')).toThrow('found 0');
    expect(() => replaceInlineRadar(old + old, radar, 'duplicate')).toThrow('found 2');
  });

  test('all nine axes retain full accessible names and the visible Consciousness word', () => {
    const svg = chartRadar(cosmo, mean, near);
    expect(svg.match(/data-radar-axis="\d"/g)).toHaveLength(9);
    expect(svg).toContain('aria-label="Consciousness-theory"');
    expect(svg).toContain('>Consciousness</tspan>');
    expect(svg).toContain('>theory</tspan>');
    expect(svg).toContain('<title>Nine-axis capability radar:');
    expect(svg).toContain('<desc>Legacy comparison on a 0 to 5 scale;');
    expect(svg).toContain('not demonstrated consciousness');
    expect(svg).toContain('A &amp; B &lt;peer&gt;');
    expect(svg).toContain('style="width: 100%; height: auto; display: block"');
  });
});
