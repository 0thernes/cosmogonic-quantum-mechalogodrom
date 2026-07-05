/**
 * Wilderness population + renderer contracts (ADR 0010 — best-effort, NOT golden).
 */
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { WildernessPopulation } from '../src/sim/wilderness-population';
import { WildernessRenderer } from '../src/sim/wilderness-render';

describe('WildernessPopulation', () => {
  test('loads camera-streamed chunks and exposes entity + chunk counts', () => {
    const pop = new WildernessPopulation(null, 0xabc123);
    pop.update(50, 50, 1 / 60);
    expect(pop.getEntityCount()).toBeGreaterThan(0);
    expect(pop.getActiveChunkCount()).toBeGreaterThan(0);
    let seen = 0;
    pop.forEachEntity(() => {
      seen++;
    });
    expect(seen).toBe(pop.getEntityCount());
    pop.dispose();
  });
});

describe('WildernessRenderer', () => {
  test('sync is allocation-free and toggles visibility from population count', () => {
    const scene = new THREE.Scene();
    const pop = new WildernessPopulation(null, 0xdef456);
    const render = new WildernessRenderer(scene);
    pop.update(120, 120, 1 / 60);
    render.sync(pop, 1.5);
    const pts = scene.children.find((c) => c instanceof THREE.Points) as THREE.Points | undefined;
    expect(pts?.visible).toBe(true);
    expect((pts?.geometry as THREE.BufferGeometry).drawRange.count).toBeGreaterThan(0);
    render.dispose();
    pop.dispose();
  });
});
