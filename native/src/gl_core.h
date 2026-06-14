// Minimal OpenGL 3.3-core entry-point loader (no glad/glew, no codegen).
//
// We deliberately do NOT include the system <GL/gl.h> (it only exposes GL 1.1 on
// Windows). Instead we declare the exact subset of GL 3.3 we use — the function
// pointer types, the extern pointers, and the constants — and resolve them at
// runtime through a caller-supplied getProcAddress (glfwGetProcAddress). An
// X-macro keeps the three views (typedef / extern / load) in lockstep.
#pragma once
#include <cstddef>

#if defined(_WIN32)
#define CQM_APIENTRY __stdcall
#else
#define CQM_APIENTRY
#endif

// ── GL base types (we own them since no GL header is included) ────────────────
typedef unsigned int GLenum;
typedef unsigned char GLboolean;
typedef unsigned int GLbitfield;
typedef int GLint;
typedef unsigned int GLuint;
typedef int GLsizei;
typedef float GLfloat;
typedef float GLclampf;
typedef char GLchar;
typedef unsigned char GLubyte;
typedef void GLvoid;
typedef std::ptrdiff_t GLsizeiptr;
typedef std::ptrdiff_t GLintptr;

// ── GL constants (only the ones we reference) ─────────────────────────────────
#define GL_FALSE 0
#define GL_TRUE 1
#define GL_NO_ERROR 0
#define GL_COLOR_BUFFER_BIT 0x00004000
#define GL_DEPTH_BUFFER_BIT 0x00000100
#define GL_TRIANGLES 0x0004
#define GL_FLOAT 0x1406
#define GL_UNSIGNED_BYTE 0x1401
#define GL_DEPTH_TEST 0x0B71
#define GL_CULL_FACE 0x0B44
#define GL_VENDOR 0x1F00
#define GL_RENDERER 0x1F01
#define GL_VERSION 0x1F02
#define GL_FRAGMENT_SHADER 0x8B30
#define GL_VERTEX_SHADER 0x8B31
#define GL_COMPILE_STATUS 0x8B81
#define GL_LINK_STATUS 0x8B82
#define GL_INFO_LOG_LENGTH 0x8B84
#define GL_FRAMEBUFFER 0x8D40
#define GL_READ_FRAMEBUFFER 0x8CA8
#define GL_DRAW_FRAMEBUFFER 0x8CA9
#define GL_COLOR_ATTACHMENT0 0x8CE0
#define GL_FRAMEBUFFER_COMPLETE 0x8CD5
#define GL_TEXTURE_2D 0x0DE1
#define GL_RGBA 0x1908
#define GL_RGB 0x1907
#define GL_RGBA8 0x8058
#define GL_RGBA16F 0x881A
#define GL_TEXTURE_MIN_FILTER 0x2801
#define GL_TEXTURE_MAG_FILTER 0x2800
#define GL_TEXTURE_WRAP_S 0x2802
#define GL_TEXTURE_WRAP_T 0x2803
#define GL_LINEAR 0x2601
#define GL_NEAREST 0x2600
#define GL_CLAMP_TO_EDGE 0x812F
#define GL_PACK_ALIGNMENT 0x0D05
#define GL_UNPACK_ALIGNMENT 0x0CF5

// ── The GL 3.3 subset we bind, as one X-macro list ────────────────────────────
//   X(returnType, name, (paramList))
#define CQM_GL_FUNCS(X)                                                                         \
  X(GLenum, glGetError, (void))                                                                 \
  X(const GLubyte*, glGetString, (GLenum name))                                                 \
  X(void, glViewport, (GLint x, GLint y, GLsizei w, GLsizei h))                                 \
  X(void, glClear, (GLbitfield mask))                                                           \
  X(void, glClearColor, (GLclampf r, GLclampf g, GLclampf b, GLclampf a))                       \
  X(void, glEnable, (GLenum cap))                                                               \
  X(void, glDisable, (GLenum cap))                                                              \
  X(void, glFinish, (void))                                                                     \
  X(void, glPixelStorei, (GLenum pname, GLint param))                                           \
  X(void, glDrawArrays, (GLenum mode, GLint first, GLsizei count))                              \
  X(GLuint, glCreateShader, (GLenum type))                                                      \
  X(void, glShaderSource,                                                                       \
    (GLuint s, GLsizei count, const GLchar* const* str, const GLint* len))                      \
  X(void, glCompileShader, (GLuint s))                                                          \
  X(void, glGetShaderiv, (GLuint s, GLenum pname, GLint* params))                               \
  X(void, glGetShaderInfoLog, (GLuint s, GLsizei buf, GLsizei* len, GLchar* log))               \
  X(void, glDeleteShader, (GLuint s))                                                           \
  X(GLuint, glCreateProgram, (void))                                                            \
  X(void, glAttachShader, (GLuint p, GLuint s))                                                 \
  X(void, glLinkProgram, (GLuint p))                                                            \
  X(void, glGetProgramiv, (GLuint p, GLenum pname, GLint* params))                              \
  X(void, glGetProgramInfoLog, (GLuint p, GLsizei buf, GLsizei* len, GLchar* log))              \
  X(void, glUseProgram, (GLuint p))                                                             \
  X(void, glDeleteProgram, (GLuint p))                                                          \
  X(GLint, glGetUniformLocation, (GLuint p, const GLchar* name))                                \
  X(void, glUniform1i, (GLint loc, GLint v))                                                    \
  X(void, glUniform1f, (GLint loc, GLfloat v))                                                  \
  X(void, glUniform2f, (GLint loc, GLfloat a, GLfloat b))                                       \
  X(void, glUniform3f, (GLint loc, GLfloat a, GLfloat b, GLfloat c))                            \
  X(void, glGenVertexArrays, (GLsizei n, GLuint* arrays))                                       \
  X(void, glBindVertexArray, (GLuint array))                                                    \
  X(void, glDeleteVertexArrays, (GLsizei n, const GLuint* arrays))                              \
  X(void, glGenFramebuffers, (GLsizei n, GLuint* ids))                                          \
  X(void, glBindFramebuffer, (GLenum target, GLuint fb))                                        \
  X(void, glDeleteFramebuffers, (GLsizei n, const GLuint* ids))                                 \
  X(void, glFramebufferTexture2D,                                                               \
    (GLenum target, GLenum att, GLenum textarget, GLuint tex, GLint level))                     \
  X(GLenum, glCheckFramebufferStatus, (GLenum target))                                          \
  X(void, glBlitFramebuffer,                                                                    \
    (GLint sx0, GLint sy0, GLint sx1, GLint sy1, GLint dx0, GLint dy0, GLint dx1, GLint dy1,    \
     GLbitfield mask, GLenum filter))                                                           \
  X(void, glGenTextures, (GLsizei n, GLuint* ids))                                              \
  X(void, glBindTexture, (GLenum target, GLuint tex))                                           \
  X(void, glDeleteTextures, (GLsizei n, const GLuint* ids))                                     \
  X(void, glTexParameteri, (GLenum target, GLenum pname, GLint param))                          \
  X(void, glTexImage2D,                                                                         \
    (GLenum target, GLint level, GLint ifmt, GLsizei w, GLsizei h, GLint border, GLenum fmt,    \
     GLenum type, const void* pixels))                                                          \
  X(void, glReadPixels,                                                                         \
    (GLint x, GLint y, GLsizei w, GLsizei h, GLenum fmt, GLenum type, void* pixels))

// Declare the function-pointer typedefs + extern pointers.
#define CQM_GL_DECL(ret, name, params)                                                          \
  typedef ret(CQM_APIENTRY* PFN_##name) params;                                                 \
  extern PFN_##name name;
CQM_GL_FUNCS(CQM_GL_DECL)
#undef CQM_GL_DECL

// Function-pointer loader signature (matches glfwGetProcAddress shape).
typedef void (*CQMglProc)();

/// Resolve every entry point through `getProc`. Returns true if all were found.
bool gl_core_load(CQMglProc (*getProc)(const char* name));
