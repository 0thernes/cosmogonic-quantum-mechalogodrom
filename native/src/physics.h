// ─────────────────────────────────────────────────────────────────────────────
//  RELIQUARY PHYSICS — a real impulse-based rigid-body solver (header-only).
//
//  Each NHI specimen is a rigid body in a harmonic gravity well inside a spherical
//  reliquary case. The solver runs EVERY frame (no flag) and its transforms are what
//  the ray-marcher draws, so the specimens genuinely come to life: they fall toward
//  the centre, collide (impulse resolution with restitution + friction-induced spin),
//  tumble (quaternion angular integration), scuff the case wall, and settle into a
//  churning cluster. Deterministic from a fixed integer-hash seeding — same run, same
//  dance. O(n²) pair tests over ≤24 bodies: trivially real-time.
// ─────────────────────────────────────────────────────────────────────────────
#pragma once
#include <glm/glm.hpp>
#include <glm/gtc/quaternion.hpp>
#include <algorithm>
#include <vector>

struct Body {
  glm::vec3 pos{0.0f};
  glm::vec3 vel{0.0f};
  glm::vec3 angVel{0.0f};
  glm::quat orient{1.0f, 0.0f, 0.0f, 0.0f};
  float radius = 0.7f;
  float mass = 1.0f;
  int type = 0;   // specimen id 0..6
  float hue = 0.0f;
};

class ReliquaryPhysics {
 public:
  /** Spherical case radius the bodies are confined to. */
  float containR = 7.5f;
  /** Harmonic well strength (central restoring acceleration per unit displacement). */
  float gravity = 1.4f;
  /** Restitution (bounciness) for body-body and body-wall contacts. */
  float restitution = 0.45f;
  /** Linear/angular damping per second so the cluster settles instead of ringing forever. */
  float linDamp = 0.6f;
  float angDamp = 0.8f;

  /** Seed `n` bodies (≤ cap) at deterministic shell positions with spin + inward drift. */
  void init(int n) {
    bodies_.clear();
    for (int i = 0; i < n; ++i) {
      Body b;
      const float h1 = hash(i * 3 + 1), h2 = hash(i * 3 + 2), h3 = hash(i * 3 + 7);
      const float theta = h1 * 6.2831853f;
      const float phi = std::acos(2.0f * h2 - 1.0f);
      const float rad = 3.0f + 2.5f * h3;
      b.pos = glm::vec3(rad * std::sin(phi) * std::cos(theta), rad * std::cos(phi),
                        rad * std::sin(phi) * std::sin(theta));
      b.radius = 0.55f + 0.55f * hash(i * 7 + 5);
      b.mass = b.radius * b.radius * b.radius;
      b.type = static_cast<int>(hash(i * 11 + 2) * 7.0f) % 7;
      b.hue = hash(i * 13 + 4);
      b.vel = (vrand(i * 5) - 0.5f) * 2.0f;
      b.angVel = (vrand(i * 9) - 0.5f) * 2.5f;
      bodies_.push_back(b);
    }
  }

  /** Advance one timestep: gravity → integrate → pair collisions → wall → damping. */
  void step(float dt) {
    const int n = static_cast<int>(bodies_.size());
    // Integrate linear + angular state under the central well.
    for (int i = 0; i < n; ++i) {
      Body& b = bodies_[static_cast<size_t>(i)];
      b.vel += (-b.pos * gravity) * dt;            // harmonic restoring force toward origin
      b.pos += b.vel * dt;
      const float w = glm::length(b.angVel);
      if (w > 1e-6f) {
        const glm::quat dq = glm::angleAxis(w * dt, b.angVel / w);
        b.orient = glm::normalize(dq * b.orient);
      }
    }
    // Body-body collisions: impulse resolution with positional correction + friction spin.
    for (int i = 0; i < n; ++i) {
      for (int j = i + 1; j < n; ++j) {
        resolvePair(bodies_[static_cast<size_t>(i)], bodies_[static_cast<size_t>(j)]);
      }
    }
    // Confine to the spherical case (reflect with restitution, scuff some spin off the wall).
    for (int i = 0; i < n; ++i) {
      Body& b = bodies_[static_cast<size_t>(i)];
      const float r = glm::length(b.pos);
      const float limit = containR - b.radius;
      if (r > limit && r > 1e-5f) {
        const glm::vec3 nrm = b.pos / r;
        b.pos = nrm * limit;
        const float vn = glm::dot(b.vel, nrm);
        if (vn > 0.0f) b.vel -= (1.0f + restitution) * vn * nrm;
        b.angVel += 0.25f * glm::cross(nrm, b.vel);
      }
      // Exponential damping (frame-rate independent).
      b.vel *= std::exp(-linDamp * dt);
      b.angVel *= std::exp(-angDamp * dt);
    }
  }

  int count() const { return static_cast<int>(bodies_.size()); }
  const std::vector<Body>& bodies() const { return bodies_; }

 private:
  std::vector<Body> bodies_;

  void resolvePair(Body& a, Body& b) {
    const glm::vec3 d = b.pos - a.pos;
    const float dist = glm::length(d);
    const float minDist = a.radius + b.radius;
    if (dist >= minDist || dist < 1e-5f) return;
    const glm::vec3 nrm = d / dist;
    const float invA = 1.0f / a.mass, invB = 1.0f / b.mass, invSum = invA + invB;
    // Positional correction split by inverse mass so they stop interpenetrating.
    const float pen = minDist - dist;
    a.pos -= nrm * (pen * (invA / invSum));
    b.pos += nrm * (pen * (invB / invSum));
    // Normal impulse (only if they're approaching).
    const glm::vec3 rv = b.vel - a.vel;
    const float vn = glm::dot(rv, nrm);
    if (vn >= 0.0f) return;
    const float jimp = -(1.0f + restitution) * vn / invSum;
    const glm::vec3 imp = jimp * nrm;
    a.vel -= imp * invA;
    b.vel += imp * invB;
    // Friction at the contact converts tangential slip into spin (a crude but lively coupling).
    const glm::vec3 vt = rv - vn * nrm;
    const glm::vec3 torque = glm::cross(nrm, vt) * 0.35f;
    a.angVel -= torque * invA;
    b.angVel += torque * invB;
  }

  // Deterministic integer hash → float in [0, 1). No clock, no global rng — same run, same dance.
  static float hash(int x) {
    unsigned int h = static_cast<unsigned int>(x);
    h = (h << 13) ^ h;
    h = h * (h * h * 15731u + 789221u) + 1376312589u;
    return static_cast<float>(h & 0x7fffffffu) / 2147483648.0f;
  }
  static glm::vec3 vrand(int base) {
    return glm::vec3(hash(base + 1), hash(base + 2), hash(base + 3));
  }
};
