# ─────────────────────────────────────────────────────────────────────────────
#  COSMOGONIC QUANTUM MECHALOGODROM — NATIVE ENGINE (C++20 / OpenGL)
#
#  A real native renderer for the NHI specimen reliquary: a fragment-shader
#  ray-marcher over signed-distance fields that carves the ornate, 4K, jewelled
#  organisms entirely on the GPU — no meshes, no textures, pure math. This is the
#  C++ + best-frameworks answer to the reference plate, freed from the browser's
#  ceilings (true offscreen 4K, native vsync-uncapped loop, screenshot export).
#
#  Core dependencies are self-provisioned via FetchContent so a fresh checkout
#  builds with nothing but a C++20 compiler + CMake:
#     • GLFW  — windowing + input (industry-standard)
#     • GLM   — header-only GLSL-style math (industry-standard)
#  The OpenGL 3.3-core entry points are loaded by a compact hand-rolled loader
#  (src/gl_core.*) so there is no codegen/python dependency in the build.
#
#  Optional AAA upgrades (documented in README.md), gated so the core always
#  builds even if their fetch is unavailable:
#     • -DCQM_WITH_JOLT=ON  — Jolt Physics (shipping-AAA rigid-body, used in
#                              Horizon Forbidden West) for true specimen dynamics.
#     • -DCQM_WITH_IMGUI=ON — Dear ImGui debug HUD.
# ─────────────────────────────────────────────────────────────────────────────
cmake_minimum_required(VERSION 3.20)
project(cqm_native LANGUAGES CXX VERSION 0.1.0)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
endif()

# Jolt is ON by default (V18): the shipping-AAA rigid-body engine drives the specimens. Set
# -DCQM_WITH_JOLT=OFF to fall back to the self-contained built-in impulse solver (no network fetch).
option(CQM_WITH_JOLT  "Link Jolt Physics for rigid-body specimen dynamics" ON)
option(CQM_WITH_IMGUI "Link Dear ImGui for an in-window debug HUD"          OFF)

include(FetchContent)
include(CTest)

# Header-only APEX reproduction gate. This has no windowing/OpenGL dependency and compares the C++
# kernels against fixed vectors emitted by the authoritative TypeScript oracle.
if(BUILD_TESTING)
  add_executable(cqm_apex_golden apex/apex_golden.cpp)
  target_include_directories(cqm_apex_golden PRIVATE apex)
  add_test(NAME cqm_apex_golden COMMAND cqm_apex_golden)
endif()

# ── GLFW (windowing/input) ───────────────────────────────────────────────────
set(GLFW_BUILD_DOCS     OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GLFW_INSTALL        OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
  glfw
  GIT_REPOSITORY https://github.com/glfw/glfw.git
  GIT_TAG        7b6aead9fb88b3623e3b3725ebb42670cbe4c579 # immutable peeled 3.4 commit
)

# ── GLM (math) ───────────────────────────────────────────────────────────────
# GLM is header-only; 1.0.1 otherwise tries to build a (source-less) static lib
# under newer CMake and fails with "No SOURCES given to target: glm". Force the
# interface-only target so we just get the `glm::glm` headers.
set(GLM_BUILD_LIBRARY OFF CACHE BOOL "" FORCE)
set(GLM_BUILD_TESTS   OFF CACHE BOOL "" FORCE)
set(GLM_BUILD_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
  glm
  GIT_REPOSITORY https://github.com/g-truc/glm.git
  GIT_TAG        0af55ccecd98d4e5a8d1fad7de25ba429d60e863 # immutable 1.0.1 tag commit
)

FetchContent_MakeAvailable(glfw glm)

add_executable(cqm_native
  src/main.cpp
  src/gl_core.cpp
)
target_include_directories(cqm_native PRIVATE src)
target_link_libraries(cqm_native PRIVATE glfw glm::glm)

# Platform GL + system libs.
if(WIN32)
  target_link_libraries(cqm_native PRIVATE opengl32 gdi32)
elseif(APPLE)
  target_link_libraries(cqm_native PRIVATE "-framework OpenGL" "-framework Cocoa" "-framework IOKit")
else()
  find_package(OpenGL REQUIRED)
  target_link_libraries(cqm_native PRIVATE OpenGL::GL ${CMAKE_DL_LIBS})
endif()

# ── Optional: Jolt Physics ───────────────────────────────────────────────────
if(CQM_WITH_JOLT)
  FetchContent_Declare(
    JoltPhysics
    GIT_REPOSITORY https://github.com/jrouwe/JoltPhysics.git
    GIT_TAG        a63aa3b8e24cf95f3fab2613f9a3015b164ef62c # immutable v5.2.0 tag commit
    SOURCE_SUBDIR  Build
  )
  FetchContent_MakeAvailable(JoltPhysics)
  target_link_libraries(cqm_native PRIVATE Jolt)
  target_compile_definitions(cqm_native PRIVATE CQM_WITH_JOLT=1)
endif()

# ── Optional: Dear ImGui ─────────────────────────────────────────────────────
if(CQM_WITH_IMGUI)
  FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG        f401021d5a5d56fe2304056c391e78f81c8d4b8f # immutable v1.91.5 tag commit
  )
  FetchContent_MakeAvailable(imgui)
  target_sources(cqm_native PRIVATE
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_glfw.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
  )
  target_include_directories(cqm_native PRIVATE ${imgui_SOURCE_DIR} ${imgui_SOURCE_DIR}/backends)
  target_compile_definitions(cqm_native PRIVATE CQM_WITH_IMGUI=1)
endif()

if(MSVC)
  target_compile_options(cqm_native PRIVATE /W4 /permissive- /O2)
  if(BUILD_TESTING)
    target_compile_options(cqm_apex_golden PRIVATE /W4 /permissive- /O2)
  endif()
else()
  # Reproducibility contracts require IEEE-safe math; unsafe floating-point reassociation can
  # invalidate finite/NaN semantics or cross-platform golden vectors.
  target_compile_options(cqm_native PRIVATE -Wall -Wextra -O3)
  if(BUILD_TESTING)
    target_compile_options(cqm_apex_golden PRIVATE -Wall -Wextra -O2)
  endif()
endif()

# MinGW: statically link the GCC/C++ runtimes so the .exe is self-contained
# (no libstdc++-6 / libgcc_s / libwinpthread DLLs to ship alongside it).
if(MINGW)
  target_link_options(cqm_native PRIVATE -static -static-libgcc -static-libstdc++)
endif()
