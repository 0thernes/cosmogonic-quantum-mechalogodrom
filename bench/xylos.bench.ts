/** Fixed-size neural and geometry hot paths; setup is outside measurement. */
import { bench, group, run } from 'mitata';
import * as THREE from 'three';
import { XylosMind } from '../src/sim/xylos-mind';
import { XylosBody } from '../src/sim/xylos-body';

const mind = new XylosMind(0x78796c6f);
const body = new XylosBody(new THREE.Scene());
const percept = { nutrient: 0.6, hazard: 0.2, signal: 0.4, gradientX: 0.1, gradientZ: -0.2 };
let time = 0;
for (let i = 0; i < 100; i++) mind.tick(percept);
group('Xylos autonomous manifold', () => {
  bench('48 foci / 192 plastic edges cognitive tick', () => mind.tick(percept));
  bench('alien geometry update', () => {
    time += 1 / 60;
    body.update(mind.view, time);
  });
});
if (import.meta.main) {
  await run();
  body.dispose();
}
