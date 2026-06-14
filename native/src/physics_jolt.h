// ─────────────────────────────────────────────────────────────────────────────
//  RELIQUARY PHYSICS — Jolt backend (-DCQM_WITH_JOLT=ON).
//
//  A drop-in replacement for the built-in solver that drives the SAME `Body` set with
//  the shipping-AAA Jolt Physics engine (jrouwe/JoltPhysics v5.2 — Horizon Forbidden
//  West). Specimens become real Jolt rigid bodies (sphere shapes, true mass/inertia
//  from density, restitution, damping); each step we apply a central harmonic force +
//  a soft spherical-case spring (Jolt has no built-in radial gravity), let Jolt run its
//  broad/narrow-phase collision + constraint solve, then read the transforms back into
//  `bodies_` so the ray-marcher draws them. Same deterministic shell seeding
//  (`rqSeedBody`) as the built-in path, so the LAYOUT matches; the DYNAMICS are Jolt's.
//
//  Included only from physics.h when CQM_WITH_JOLT is defined; `Body` + `rqSeedBody`
//  are already in scope from there.
// ─────────────────────────────────────────────────────────────────────────────
#pragma once

#include <Jolt/Jolt.h>
#include <Jolt/RegisterTypes.h>
#include <Jolt/Core/Factory.h>
#include <Jolt/Core/TempAllocator.h>
#include <Jolt/Core/JobSystemThreadPool.h>
#include <Jolt/Physics/PhysicsSettings.h>
#include <Jolt/Physics/PhysicsSystem.h>
#include <Jolt/Physics/Collision/Shape/SphereShape.h>
#include <Jolt/Physics/Body/BodyCreationSettings.h>

#include <algorithm>
#include <cstdarg>
#include <cstdio>
#include <thread>

JPH_SUPPRESS_WARNINGS

namespace cqm_jolt {

// Jolt calls these callbacks on trace/assert; leaving them null segfaults. Required setup.
static void TraceImpl(const char* fmt, ...) {
  va_list list;
  va_start(list, fmt);
  char buf[1024];
  std::vsnprintf(buf, sizeof(buf), fmt, list);
  va_end(list);
  std::printf("[Jolt] %s\n", buf);
}
#ifdef JPH_ENABLE_ASSERTS
static bool AssertFailedImpl(const char* expr, const char* msg, const char* file, JPH::uint line) {
  std::printf("[Jolt assert] %s:%u: (%s) %s\n", file, line, expr, msg ? msg : "");
  return true;
}
#endif

// Two object layers: static (none here) vs moving (every specimen). Standard Jolt layout.
namespace Layers {
static constexpr JPH::ObjectLayer NON_MOVING = 0;
static constexpr JPH::ObjectLayer MOVING = 1;
static constexpr JPH::ObjectLayer NUM_LAYERS = 2;
}  // namespace Layers

namespace BroadPhaseLayers {
static constexpr JPH::BroadPhaseLayer NON_MOVING(0);
static constexpr JPH::BroadPhaseLayer MOVING(1);
static constexpr JPH::uint NUM_LAYERS(2);
}  // namespace BroadPhaseLayers

class BPLayerInterfaceImpl final : public JPH::BroadPhaseLayerInterface {
 public:
  BPLayerInterfaceImpl() {
    mObjectToBroadPhase[Layers::NON_MOVING] = BroadPhaseLayers::NON_MOVING;
    mObjectToBroadPhase[Layers::MOVING] = BroadPhaseLayers::MOVING;
  }
  JPH::uint GetNumBroadPhaseLayers() const override { return BroadPhaseLayers::NUM_LAYERS; }
  JPH::BroadPhaseLayer GetBroadPhaseLayer(JPH::ObjectLayer inLayer) const override {
    return mObjectToBroadPhase[inLayer];
  }
#if defined(JPH_EXTERNAL_PROFILE) || defined(JPH_PROFILE_ENABLED)
  const char* GetBroadPhaseLayerName(JPH::BroadPhaseLayer) const override { return "rq"; }
#endif
 private:
  JPH::BroadPhaseLayer mObjectToBroadPhase[Layers::NUM_LAYERS];
};

class ObjectVsBroadPhaseLayerFilterImpl final : public JPH::ObjectVsBroadPhaseLayerFilter {
 public:
  bool ShouldCollide(JPH::ObjectLayer, JPH::BroadPhaseLayer) const override { return true; }
};

class ObjectLayerPairFilterImpl final : public JPH::ObjectLayerPairFilter {
 public:
  bool ShouldCollide(JPH::ObjectLayer, JPH::ObjectLayer) const override { return true; }
};

// One-time process-global Jolt bring-up (callbacks, allocator, factory, type registration). Returns
// true so it can run as the FIRST member-initializer — guaranteeing the allocator is registered
// before the TempAllocator/JobSystem/PhysicsSystem members allocate.
inline bool globalInit() {
  static bool done = false;
  if (done) return true;
  done = true;
  JPH::Trace = TraceImpl;
  JPH_IF_ENABLE_ASSERTS(JPH::AssertFailed = AssertFailedImpl;)
  JPH::RegisterDefaultAllocator();
  JPH::Factory::sInstance = new JPH::Factory();
  JPH::RegisterTypes();
  return true;
}

}  // namespace cqm_jolt

class ReliquaryPhysics {
 public:
  float containR = 7.5f;
  float gravity = 1.4f;
  float restitution = 0.45f;
  float linDamp = 0.6f;
  float angDamp = 0.8f;

  ReliquaryPhysics()
      // joltReady_ runs globalInit() FIRST (member-init order = declaration order) so the allocator
      // is registered before tempAllocator_/jobSystem_/system_ allocate.
      : joltReady_(cqm_jolt::globalInit()),
        tempAllocator_(24 * 1024 * 1024),
        // 2048 jobs / 8 barriers are Jolt's HelloWorld defaults (sample-local, not lib symbols).
        jobSystem_(2048, 8,
                   static_cast<int>(std::max(1u, std::thread::hardware_concurrency()) - 1)) {
    system_.Init(kMaxBodies, 0, kMaxBodies * 2, kMaxBodies * 2, bpLayer_, objVsBp_, objVsObj_);
    system_.SetGravity(JPH::Vec3::sZero());  // we apply a central harmonic well ourselves
  }

  /** Seed `n` specimen bodies at the shared deterministic shell layout as Jolt rigid bodies. */
  void init(int n) {
    JPH::BodyInterface& bi = system_.GetBodyInterface();
    for (JPH::BodyID id : ids_) {
      bi.RemoveBody(id);
      bi.DestroyBody(id);
    }
    ids_.clear();
    bodies_.clear();
    if (n > static_cast<int>(kMaxBodies)) n = static_cast<int>(kMaxBodies);
    for (int i = 0; i < n; ++i) {
      Body b;
      rqSeedBody(b, i);
      JPH::BodyCreationSettings bcs(
          new JPH::SphereShape(b.radius),
          JPH::RVec3(b.pos.x, b.pos.y, b.pos.z), JPH::Quat::sIdentity(),
          JPH::EMotionType::Dynamic, cqm_jolt::Layers::MOVING);
      bcs.mLinearVelocity = JPH::Vec3(b.vel.x, b.vel.y, b.vel.z);
      bcs.mAngularVelocity = JPH::Vec3(b.angVel.x, b.angVel.y, b.angVel.z);
      bcs.mRestitution = restitution;
      bcs.mLinearDamping = linDamp;
      bcs.mAngularDamping = angDamp;
      JPH::BodyID id = bi.CreateAndAddBody(bcs, JPH::EActivation::Activate);
      ids_.push_back(id);
      bodies_.push_back(b);
    }
    system_.OptimizeBroadPhase();
  }

  /** Apply the harmonic well + case spring, run Jolt's solve, then read transforms back. */
  void step(float dt) {
    if (dt <= 0.0f || ids_.empty()) return;
    JPH::BodyInterface& bi = system_.GetBodyInterface();
    for (size_t i = 0; i < ids_.size(); ++i) {
      const JPH::RVec3 p = bi.GetCenterOfMassPosition(ids_[i]);
      const glm::vec3 pos(p.GetX(), p.GetY(), p.GetZ());
      const float m = bodies_[i].mass;
      glm::vec3 f = -pos * gravity * m;  // central harmonic restoring force
      const float r = glm::length(pos);
      const float limit = containR - bodies_[i].radius;
      if (r > limit && r > 1e-5f) f -= (pos / r) * (r - limit) * 40.0f * m;  // soft case wall
      bi.AddForce(ids_[i], JPH::Vec3(f.x, f.y, f.z));
    }
    system_.Update(dt, 1, &tempAllocator_, &jobSystem_);
    for (size_t i = 0; i < ids_.size(); ++i) {
      const JPH::RVec3 p = bi.GetCenterOfMassPosition(ids_[i]);
      const JPH::Quat q = bi.GetRotation(ids_[i]);
      bodies_[i].pos = glm::vec3(p.GetX(), p.GetY(), p.GetZ());
      bodies_[i].orient = glm::quat(q.GetW(), q.GetX(), q.GetY(), q.GetZ());
    }
  }

  int count() const { return static_cast<int>(bodies_.size()); }
  const std::vector<Body>& bodies() const { return bodies_; }

 private:
  static constexpr JPH::uint kMaxBodies = 256;
  bool joltReady_;  // MUST be declared first: its initializer runs globalInit() before the rest.
  JPH::TempAllocatorImpl tempAllocator_;
  JPH::JobSystemThreadPool jobSystem_;
  cqm_jolt::BPLayerInterfaceImpl bpLayer_;
  cqm_jolt::ObjectVsBroadPhaseLayerFilterImpl objVsBp_;
  cqm_jolt::ObjectLayerPairFilterImpl objVsObj_;
  JPH::PhysicsSystem system_;
  std::vector<JPH::BodyID> ids_;
  std::vector<Body> bodies_;
};
