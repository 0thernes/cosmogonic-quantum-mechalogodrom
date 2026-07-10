/**
 * Single-pass escaping helpers for generated markup.
 *
 * Keeping these transformations character-based avoids replacement-order bugs such as an input
 * backslash neutralising a later Markdown pipe escape. Callers must choose text vs attribute
 * context explicitly; attribute values additionally escape both quote delimiters.
 */

export function escapeMarkupText(value: string): string {
  let escaped = '';
  for (const character of value) {
    if (character === '&') escaped += '&amp;';
    else if (character === '<') escaped += '&lt;';
    else if (character === '>') escaped += '&gt;';
    else escaped += character;
  }
  return escaped;
}

export function escapeMarkupAttribute(value: string): string {
  let escaped = '';
  for (const character of value) {
    if (character === '&') escaped += '&amp;';
    else if (character === '<') escaped += '&lt;';
    else if (character === '>') escaped += '&gt;';
    else if (character === '"') escaped += '&quot;';
    else if (character === "'") escaped += '&#39;';
    else escaped += character;
  }
  return escaped;
}

export function escapeMarkdownTableCell(value: string): string {
  let escaped = '';
  for (const character of value) {
    if (character === '\\') escaped += '\\\\';
    else if (character === '|') escaped += '\\|';
    else if (character === '\r' || character === '\n') escaped += ' ';
    else escaped += character;
  }
  return escaped;
}
