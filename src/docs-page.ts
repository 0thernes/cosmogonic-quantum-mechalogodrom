/**
 * Entry module for docs.html — initializes mermaid and renders the inline
 * architecture / ERD / sequence diagrams.
 *
 * Lives as an external entry (not an inline `<script>`) because Bun's HTML
 * bundler does not process inline script bodies (verified on Bun 1.3.11), so a
 * bare `import 'mermaid'` inline would never resolve in the browser. The
 * diagram sources themselves stay inline in docs.html.
 */
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#030612',
    primaryColor: '#08243a',
    primaryTextColor: '#cfe9ff',
    primaryBorderColor: '#0ef',
    lineColor: '#3da9c9',
    secondaryColor: '#1a0f2e',
    tertiaryColor: '#050a1c',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '12px',
  },
});

await mermaid.run({ querySelector: 'pre.mermaid' });
