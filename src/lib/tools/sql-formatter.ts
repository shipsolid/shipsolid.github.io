// Thin wrapper over the `sql-formatter` package for dialect-aware pretty-printing, plus a
// dependency-free minifier. No DOM, no localStorage. The heavy formatter is only imported here,
// so it code-splits into the /tools/sql-formatter page chunk.
import { format } from 'sql-formatter';

export type SqlDialect = 'sql' | 'postgresql' | 'mysql' | 'tsql' | 'bigquery' | 'sqlite';

export interface SqlFormatOptions {
  dialect?: SqlDialect;
  uppercase?: boolean;
  tabWidth?: number;
}

const LANGUAGE_MAP: Record<SqlDialect, string> = {
  sql: 'sql',
  postgresql: 'postgresql',
  mysql: 'mysql',
  tsql: 'transactsql',
  bigquery: 'bigquery',
  sqlite: 'sqlite',
};

export function formatSql(input: string, options: SqlFormatOptions = {}): string {
  const sql = input.trim();
  if (sql === '') return '';
  try {
    return format(sql, {
      // The `sql-formatter` types narrow `language` to its own union; a runtime string is fine.
      language: LANGUAGE_MAP[options.dialect ?? 'sql'] as never,
      keywordCase: options.uppercase ? 'upper' : 'preserve',
      tabWidth: options.tabWidth ?? 2,
    });
  } catch (err) {
    throw new Error(`Could not format SQL: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
}

// Collapse whitespace runs to a single space, but never touch the contents of a quoted string.
export function minifySql(input: string): string {
  let out = '';
  let quote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote) {
      out += ch;
      if (ch === quote && input[i - 1] !== '\\') quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (out.length > 0 && !out.endsWith(' ')) out += ' ';
      continue;
    }

    out += ch;
  }

  return out.trim();
}
