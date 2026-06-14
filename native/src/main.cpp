// ─────────────────────────────────────────────────────────────────────────────
//  COSMOGONIC QUANTUM MECHALOGODROM — NATIVE RELIQUARY (C++20 / OpenGL 3.3)
//
//  A native ray-marched gallery of the ornate NHI specimens. The whole scene is
//  SDF math in a single fragment shader (see shaders.h); this translation unit is
//  the host: window + GL context, shader compile, an orbit camera, the render
//  loop, and a 4K offscreen screenshot exporter (BMP, dependency-free).
//
//  Controls:
//    drag / arrows  orbit          wheel  zoom         W/S  dolly
//    H              hero ↔ plate    SPACE  pause spin   P    save 4K screenshot
//    F              toggle fullscreen-ish (maximise)   ESC  quit
// ─────────────────────────────────────────────────────────────────────────────
#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include "gl_core.h"
#include "shaders.h"
#include "physics.h"

#include <glm/glm.hpp>
#include <glm/gtc/constants.hpp>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdint>
#include <cstdlib>
#include <fstream>
#include <string>
#include <vector>

namespace {

struct OrbitCam {
  float azimuth = 0.7f;   // radians around +Y
  float elevation = 0.42f; // radians above the XZ plane
  float radius = 6.5f;
  glm::vec3 target{0.0f, 0.0f, 0.0f};

  glm::vec3 eye() const {
    float ce = std::cos(elevation), se = std::sin(elevation);
    return target + radius * glm::vec3(ce * std::cos(azimuth), se, ce * std::sin(azimuth));
  }
};

OrbitCam gCam;
ReliquaryPhysics gPhys;       // live rigid-body solver — drives the specimen transforms every frame
constexpr int kMaxBodies = 24; // must match MAX_BODIES in shaders.h
bool gDragging = false;
double gLastX = 0.0, gLastY = 0.0;
bool gHero = false;
bool gPaused = false;
float gSpinClock = 0.0f;
double gPrevTime = 0.0;
bool gWantShot = false;

void onMouseButton(GLFWwindow* w, int button, int action, int /*mods*/) {
  if (button == GLFW_MOUSE_BUTTON_LEFT) {
    gDragging = (action == GLFW_PRESS);
    glfwGetCursorPos(w, &gLastX, &gLastY);
  }
}
void onCursor(GLFWwindow* /*w*/, double x, double y) {
  if (!gDragging) return;
  double dx = x - gLastX, dy = y - gLastY;
  gLastX = x; gLastY = y;
  gCam.azimuth -= static_cast<float>(dx) * 0.005f;
  gCam.elevation = glm::clamp(gCam.elevation + static_cast<float>(dy) * 0.005f, -1.45f, 1.45f);
}
void onScroll(GLFWwindow* /*w*/, double /*xo*/, double yo) {
  gCam.radius = glm::clamp(gCam.radius * std::pow(0.9f, static_cast<float>(yo)), 1.5f, 40.0f);
}
void onKey(GLFWwindow* w, int key, int /*sc*/, int action, int /*mods*/) {
  if (action != GLFW_PRESS && action != GLFW_REPEAT) return;
  switch (key) {
    case GLFW_KEY_ESCAPE: glfwSetWindowShouldClose(w, GLFW_TRUE); break;
    case GLFW_KEY_H: if (action == GLFW_PRESS) gHero = !gHero; break;
    case GLFW_KEY_SPACE: if (action == GLFW_PRESS) gPaused = !gPaused; break;
    case GLFW_KEY_P: if (action == GLFW_PRESS) gWantShot = true; break;
    case GLFW_KEY_W: gCam.radius = glm::clamp(gCam.radius - 0.3f, 1.5f, 40.0f); break;
    case GLFW_KEY_S: gCam.radius = glm::clamp(gCam.radius + 0.3f, 1.5f, 40.0f); break;
    case GLFW_KEY_F:
      if (action == GLFW_PRESS) {
        if (glfwGetWindowAttrib(w, GLFW_MAXIMIZED)) glfwRestoreWindow(w);
        else glfwMaximizeWindow(w);
      }
      break;
    default: break;
  }
}

GLuint compileShader(GLenum type, const char* src, const char* label) {
  GLuint sh = glCreateShader(type);
  glShaderSource(sh, 1, &src, nullptr);
  glCompileShader(sh);
  GLint ok = GL_FALSE;
  glGetShaderiv(sh, GL_COMPILE_STATUS, &ok);
  if (!ok) {
    GLint len = 0; glGetShaderiv(sh, GL_INFO_LOG_LENGTH, &len);
    std::vector<char> log(static_cast<size_t>(len > 1 ? len : 1));
    glGetShaderInfoLog(sh, len, nullptr, log.data());
    std::fprintf(stderr, "[shader:%s] compile failed:\n%s\n", label, log.data());
    glDeleteShader(sh);
    return 0;
  }
  return sh;
}

GLuint buildProgram() {
  GLuint vs = compileShader(GL_VERTEX_SHADER, kVertexSrc, "vertex");
  GLuint fs = compileShader(GL_FRAGMENT_SHADER, kFragmentSrc, "fragment");
  if (!vs || !fs) return 0;
  GLuint prog = glCreateProgram();
  glAttachShader(prog, vs);
  glAttachShader(prog, fs);
  glLinkProgram(prog);
  GLint ok = GL_FALSE;
  glGetProgramiv(prog, GL_LINK_STATUS, &ok);
  if (!ok) {
    GLint len = 0; glGetProgramiv(prog, GL_INFO_LOG_LENGTH, &len);
    std::vector<char> log(static_cast<size_t>(len > 1 ? len : 1));
    glGetProgramInfoLog(prog, len, nullptr, log.data());
    std::fprintf(stderr, "[program] link failed:\n%s\n", log.data());
    glDeleteProgram(prog);
    prog = 0;
  }
  glDeleteShader(vs);
  glDeleteShader(fs);
  return prog;
}

// Write a 24-bit bottom-up BMP (opens natively on Windows). `rgba` is GL_RGBA8,
// origin lower-left — which matches BMP row order, so no flip is needed.
bool writeBMP(const std::string& path, int w, int h, const std::vector<uint8_t>& rgba) {
  std::ofstream f(path, std::ios::binary);
  if (!f) return false;
  const int rowRaw = w * 3;
  const int pad = (4 - (rowRaw % 4)) % 4;
  const int imgSize = (rowRaw + pad) * h;
  const int fileSize = 54 + imgSize;
  auto u16 = [&](uint16_t v) { f.put(char(v & 0xff)); f.put(char((v >> 8) & 0xff)); };
  auto u32 = [&](uint32_t v) { for (int i = 0; i < 4; i++) f.put(char((v >> (8 * i)) & 0xff)); };
  f.put('B'); f.put('M'); u32(static_cast<uint32_t>(fileSize)); u16(0); u16(0); u32(54);
  u32(40); u32(static_cast<uint32_t>(w)); u32(static_cast<uint32_t>(h));
  u16(1); u16(24); u32(0); u32(static_cast<uint32_t>(imgSize));
  u32(2835); u32(2835); u32(0); u32(0);
  std::vector<uint8_t> row(static_cast<size_t>(rowRaw + pad), 0);
  for (int y = 0; y < h; ++y) {
    for (int x = 0; x < w; ++x) {
      const size_t src = (static_cast<size_t>(y) * w + x) * 4;
      row[static_cast<size_t>(x) * 3 + 0] = rgba[src + 2]; // B
      row[static_cast<size_t>(x) * 3 + 1] = rgba[src + 1]; // G
      row[static_cast<size_t>(x) * 3 + 2] = rgba[src + 0]; // R
    }
    f.write(reinterpret_cast<const char*>(row.data()), static_cast<std::streamsize>(row.size()));
  }
  return true;
}

void setCommonUniforms(GLuint prog, int fbw, int fbh, float t) {
  glm::vec3 eye = gCam.eye();
  glUniform2f(glGetUniformLocation(prog, "uResolution"), float(fbw), float(fbh));
  glUniform1f(glGetUniformLocation(prog, "uTime"), t);
  glUniform3f(glGetUniformLocation(prog, "uCamPos"), eye.x, eye.y, eye.z);
  glUniform3f(glGetUniformLocation(prog, "uCamTarget"), gCam.target.x, gCam.target.y, gCam.target.z);
  glUniform1f(glGetUniformLocation(prog, "uFov"), glm::radians(48.0f));
  glUniform1f(glGetUniformLocation(prog, "uBass"), 0.0f);
  glUniform1f(glGetUniformLocation(prog, "uHero"), gHero ? 1.0f : 0.0f);

  // Upload the LIVE rigid-body transforms — this is what makes the specimens move: each frame's
  // solver state (position+radius, orientation quaternion, type+hue) goes straight to the marcher.
  const std::vector<Body>& bs = gPhys.bodies();
  const int n = std::min(static_cast<int>(bs.size()), kMaxBodies);
  float posScale[kMaxBodies * 4] = {0};
  float quat[kMaxBodies * 4] = {0};
  float meta[kMaxBodies * 4] = {0};
  for (int i = 0; i < n; ++i) {
    const Body& b = bs[static_cast<size_t>(i)];
    posScale[i * 4 + 0] = b.pos.x; posScale[i * 4 + 1] = b.pos.y;
    posScale[i * 4 + 2] = b.pos.z; posScale[i * 4 + 3] = b.radius;
    quat[i * 4 + 0] = b.orient.x; quat[i * 4 + 1] = b.orient.y;
    quat[i * 4 + 2] = b.orient.z; quat[i * 4 + 3] = b.orient.w;
    meta[i * 4 + 0] = static_cast<float>(b.type); meta[i * 4 + 1] = b.hue;
  }
  glUniform1i(glGetUniformLocation(prog, "uNumBodies"), n);
  if (n > 0) {
    glUniform4fv(glGetUniformLocation(prog, "uBodyPosScale"), n, posScale);
    glUniform4fv(glGetUniformLocation(prog, "uBodyQuat"), n, quat);
    glUniform4fv(glGetUniformLocation(prog, "uBodyMeta"), n, meta);
  }
}

// Render the scene at W×H into an offscreen FBO and save it as BMP. Returns true on success.
bool renderToBMP(GLuint prog, GLuint vao, int W, int H, float t, const char* path) {
  bool wrote = false;
  GLuint tex = 0, fbo = 0;
  glGenTextures(1, &tex);
  glBindTexture(GL_TEXTURE_2D, tex);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, W, H, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glGenFramebuffers(1, &fbo);
  glBindFramebuffer(GL_FRAMEBUFFER, fbo);
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, tex, 0);
  if (glCheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE) {
    glViewport(0, 0, W, H);
    glClearColor(0, 0, 0, 1);
    glClear(GL_COLOR_BUFFER_BIT);
    glUseProgram(prog);
    setCommonUniforms(prog, W, H, t);
    glBindVertexArray(vao);
    glDrawArrays(GL_TRIANGLES, 0, 3);
    glFinish();
    std::vector<uint8_t> px(static_cast<size_t>(W) * H * 4);
    glPixelStorei(GL_PACK_ALIGNMENT, 1);
    glReadPixels(0, 0, W, H, GL_RGBA, GL_UNSIGNED_BYTE, px.data());
    wrote = writeBMP(path, W, H, px);
    if (wrote) std::printf("[screenshot] wrote %s (%dx%d)\n", path, W, H);
    else std::fprintf(stderr, "[screenshot] failed to write %s\n", path);
  } else {
    std::fprintf(stderr, "[screenshot] framebuffer incomplete\n");
  }
  glBindFramebuffer(GL_FRAMEBUFFER, 0);
  glDeleteFramebuffers(1, &fbo);
  glDeleteTextures(1, &tex);
  return wrote;
}

} // namespace

int main(int argc, char** argv) {
  // Offscreen capture mode: `--shot[=file.bmp]` renders one frame to a hidden FBO and exits —
  // no window pops on the user's desktop, so it works for automated/headless screenshotting.
  // `--hero` frames a single rotating specimen; `--wWxH` sets the shot size (default 1600x900).
  bool shotMode = false;
  std::string shotPath = "reliquary_shot.bmp";
  int shotW = 1600, shotH = 900;
  int settleFrames = 200; // physics frames to advance before an offscreen shot (--frames=K)
  for (int i = 1; i < argc; ++i) {
    std::string a = argv[i];
    if (a.rfind("--frames=", 0) == 0) {
      settleFrames = std::max(0, std::atoi(a.c_str() + 9));
    } else if (a.rfind("--shot", 0) == 0) {
      shotMode = true;
      auto eq = a.find('=');
      if (eq != std::string::npos) shotPath = a.substr(eq + 1);
    } else if (a == "--hero") {
      gHero = true;
    } else if (a.rfind("--w", 0) == 0) {
      auto x = a.find('x');
      if (x != std::string::npos) { shotW = std::atoi(a.c_str() + 3); shotH = std::atoi(a.c_str() + x + 1); }
    }
  }

  if (!glfwInit()) { std::fprintf(stderr, "glfwInit failed\n"); return 1; }
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE);
  glfwWindowHint(GLFW_SAMPLES, 0);
  if (shotMode) glfwWindowHint(GLFW_VISIBLE, GLFW_FALSE); // render offscreen, don't pop a window

  GLFWwindow* win = glfwCreateWindow(1600, 900, "Cosmogonic Quantum Mechalogodrom — Reliquary", nullptr, nullptr);
  if (!win) { std::fprintf(stderr, "window creation failed\n"); glfwTerminate(); return 1; }
  glfwMakeContextCurrent(win);
  glfwSwapInterval(1);

  if (!gl_core_load(reinterpret_cast<CQMglProc (*)(const char*)>(glfwGetProcAddress))) {
    std::fprintf(stderr, "failed to load required OpenGL entry points\n");
    glfwTerminate();
    return 1;
  }
  std::printf("GL_VENDOR   : %s\n", reinterpret_cast<const char*>(glGetString(GL_VENDOR)));
  std::printf("GL_RENDERER : %s\n", reinterpret_cast<const char*>(glGetString(GL_RENDERER)));
  std::printf("GL_VERSION  : %s\n", reinterpret_cast<const char*>(glGetString(GL_VERSION)));

  GLuint prog = buildProgram();
  if (!prog) { glfwTerminate(); return 1; }
  GLuint vao = 0;
  glGenVertexArrays(1, &vao);

  // Seed the rigid-body solver — the specimens start on a shell and fall inward.
  gPhys.init(18);

  if (shotMode) {
    // Frame the gallery nicely and render a single settled frame to disk, then exit.
    gCam.azimuth = 0.7f;
    gCam.elevation = 0.40f;
    gCam.radius = gHero ? 3.4f : 7.5f;
    // Run the solver forward so the specimens have fallen, collided and begun to settle into a
    // churning cluster — the captured frame shows LIVE dynamics, not the seeded shell.
    for (int f = 0; f < settleFrames; ++f)
      for (int k = 0; k < 2; ++k) gPhys.step(1.0f / 120.0f);
    bool ok = renderToBMP(prog, vao, shotW, shotH, 2.6f, shotPath.c_str());
    glDeleteVertexArrays(1, &vao);
    glDeleteProgram(prog);
    glfwDestroyWindow(win);
    glfwTerminate();
    return ok ? 0 : 1;
  }

  glfwSetMouseButtonCallback(win, onMouseButton);
  glfwSetCursorPosCallback(win, onCursor);
  glfwSetScrollCallback(win, onScroll);
  glfwSetKeyCallback(win, onKey);

  gPrevTime = glfwGetTime();
  while (!glfwWindowShouldClose(win)) {
    double now = glfwGetTime();
    float dt = static_cast<float>(now - gPrevTime);
    gPrevTime = now;
    if (!gPaused) {
      gSpinClock += dt;
      // Two fixed substeps/frame keeps the rigid-body solver stable independent of frame rate.
      for (int k = 0; k < 2; ++k) gPhys.step(1.0f / 120.0f);
    }

    int fbw, fbh;
    glfwGetFramebufferSize(win, &fbw, &fbh);

    if (gWantShot) { renderToBMP(prog, vao, 3840, 2160, gSpinClock, "reliquary_4k.bmp"); gWantShot = false; }

    glViewport(0, 0, fbw, fbh);
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    glUseProgram(prog);
    setCommonUniforms(prog, fbw, fbh, gSpinClock);
    glBindVertexArray(vao);
    glDrawArrays(GL_TRIANGLES, 0, 3);

    glfwSwapBuffers(win);
    glfwPollEvents();
  }

  glDeleteVertexArrays(1, &vao);
  glDeleteProgram(prog);
  glfwDestroyWindow(win);
  glfwTerminate();
  return 0;
}
