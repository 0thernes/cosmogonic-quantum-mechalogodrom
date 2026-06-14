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

option(CQM_WITH_JOLT  "Link Jolt Physics for rigid-body specimen dynamics" OFF)
option(CQM_WITH_IMGUI "Link Dear ImGui for an in-window debug HUD"          OFF)

include(FetchContent)

# ── GLFW (windowing/input) ───────────────────────────────────────────────────
set(GLFW_BUILD_DOCS     OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GLFW_INSTALL        OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
  glfw
  GIT_REPOSITORY https://github.com/glfw/glfw.git
  GIT_TAG        3.4
  GIT_SHALLOW    TRUE
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
  GIT_TAG        1.0.1
  GIT_SHALLOW    TRUE
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
    GIT_TAG        v5.2.0
    GIT_SHALLOW    TRUE
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
    GIT_TAG        v1.91.5
    GIT_SHALLOW    TRUE
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
else()
  target_compile_options(cqm_native PRIVATE -Wall -Wextra -O3 -ffast-math)
endif()

# MinGW: statically link the GCC/C++ runtimes so the .exe is self-contained
# (no libstdc++-6 / libgcc_s / libwinpthread DLLs to ship alongside it).
if(MINGW)
  target_link_options(cqm_native PRIVATE -static -static-libgcc -static-libstdc++)
endif()
