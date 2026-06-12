#!/usr/bin/env node

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

const HELP = `
site-context-chat — bundle markdown files into a single context document

Usage:
  site-context-chat export <input> [output]

Arguments:
  input     Directory of .md files, or a single .md file
  output    Output file (default: ./context.md)

Examples:
  site-context-chat export ./content-docs ./public/context.md
  site-context-chat export ./pages/home.md
`.trim();

async function main() {
  const [, , command, inputArg, outputArg] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  if (command !== 'export') {
    console.error(`Unknown command: ${command}\n\n${HELP}`);
    process.exit(1);
  }

  if (!inputArg) {
    console.error('Missing input path.\n\n' + HELP);
    process.exit(1);
  }

  const inputPath = resolve(process.cwd(), inputArg);
  const outputPath = resolve(process.cwd(), outputArg ?? 'context.md');
  const markdown = await loadMarkdown(inputPath);

  await mkdir(dirnameSafe(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, 'utf8');

  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  console.log(`Wrote ${outputPath} (${words.toLocaleString()} words)`);
}

async function loadMarkdown(path) {
  const { stat } = await import('node:fs/promises');
  const info = await stat(path);

  if (info.isFile()) {
    return readFile(path, 'utf8');
  }

  if (!info.isDirectory()) {
    throw new Error(`Input is not a file or directory: ${path}`);
  }

  const files = await collectMarkdownFiles(path);
  if (files.length === 0) {
    throw new Error(`No markdown files found in ${path}`);
  }

  const parts = [];
  for (const file of files) {
    const body = await readFile(file, 'utf8');
    const title = basename(file, extname(file));
    parts.push(`# ${title}\n\n${body.trim()}`);
  }

  return parts.join('\n\n---\n\n');
}

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
      continue;
    }
    if (/\.(md|markdown|mdx|txt)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function dirnameSafe(filePath) {
  const idx = filePath.lastIndexOf('/');
  return idx === -1 ? '.' : filePath.slice(0, idx);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
