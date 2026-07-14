#!/usr/bin/env bun
/** Serve only the assembled GitHub Pages artifact beneath its real project prefix. */
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

export function resolvePagesFile(
  siteRootInput: string,
  project: string,
  pathname: string,
): string | null {
  const siteRoot = resolve(siteRootInput);
  const prefix = `/${project}/`;
  if (!pathname.startsWith(prefix)) return null;
  let relative: string;
  try {
    relative = decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return null;
  }
  if (relative.includes('\0') || relative.includes('\\')) return null;
  if (relative.length === 0 || relative.endsWith('/')) relative += 'index.html';
  const candidate = resolve(siteRoot, relative.replaceAll('/', sep));
  const rootedPrefix = siteRoot.endsWith(sep) ? siteRoot : siteRoot + sep;
  return candidate.startsWith(rootedPrefix) ? candidate : null;
}

export function startPagesSmokeServer(options: {
  port: number;
  project: string;
  siteRoot: string;
}): ReturnType<typeof Bun.serve> {
  const { port, project } = options;
  const siteRoot = resolve(options.siteRoot);
  if (!Number.isFinite(port) || port < 1 || port > 65_535) {
    throw new Error(`pages-smoke-server: invalid PORT ${port}`);
  }
  if (
    !project ||
    project === '.' ||
    project === '..' ||
    project.includes('/') ||
    project.includes('\\') ||
    project.includes('\0')
  ) {
    throw new Error(`pages-smoke-server: invalid project prefix ${project}`);
  }

  const prefix = `/${project}/`;
  return Bun.serve({
    hostname: '127.0.0.1',
    port,
    async fetch(request): Promise<Response> {
      const url = new URL(request.url);
      if (url.pathname === `/${project}`) {
        return Response.redirect(`${url.origin}${prefix}`, 308);
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('method not allowed', {
          status: 405,
          headers: { Allow: 'GET, HEAD' },
        });
      }
      const path = resolvePagesFile(siteRoot, project, url.pathname);
      if (!path) return new Response('not found', { status: 404 });
      const info = await stat(path).catch(() => null);
      if (!info?.isFile()) return new Response('not found', { status: 404 });
      const file = Bun.file(path);
      const headers = {
        'Cache-Control': 'no-store',
        'Content-Type': file.type || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      };
      return request.method === 'HEAD'
        ? new Response(null, { headers })
        : new Response(file, { headers });
    },
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3107);
  const siteRoot = resolve(process.env.CQM_PAGES_ROOT ?? 'site');
  const project = (process.env.CQM_PAGES_PROJECT ?? 'cosmogonic-quantum-mechalogodrom').trim();
  const server = startPagesSmokeServer({ port, project, siteRoot });
  console.log(`pages-smoke-server: ${siteRoot} at ${server.url}${project}/`);
}
