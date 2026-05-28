export const up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL DEFAULT 'Untitled Diagram',
      mermaid_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

export const down = (pgm) => {
  pgm.sql("DROP TABLE IF EXISTS diagrams;");
};
