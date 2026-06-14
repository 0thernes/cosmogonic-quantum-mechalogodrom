// Definitions + runtime resolution for the GL 3.3-core subset declared in gl_core.h.
#include "gl_core.h"

// Define the extern pointers (initialised null).
#define CQM_GL_DEF(ret, name, params) PFN_##name name = nullptr;
CQM_GL_FUNCS(CQM_GL_DEF)
#undef CQM_GL_DEF

bool gl_core_load(CQMglProc (*getProc)(const char* name)) {
  bool ok = true;
#define CQM_GL_LOAD(ret, name, params)                                                          \
  name = reinterpret_cast<PFN_##name>(getProc(#name));                                          \
  if (!name) ok = false;
  CQM_GL_FUNCS(CQM_GL_LOAD)
#undef CQM_GL_LOAD
  return ok;
}
