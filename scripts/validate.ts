import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { type Book, validateBook } from '../src/content/schema';

const DIR = 'src/content/books';
let problems = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const book = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as Book;
  const errors = validateBook(book);
  if (`${book.id}.json` !== file) errors.push(`${file}: 文件名应该是 ${book.id}.json`);
  if (errors.length > 0) {
    problems += errors.length;
    for (const e of errors) console.error(`ERR ${e}`);
  } else {
    console.log(`OK  《${book.title}》 ${book.segments.length} 段`);
  }
}

if (problems > 0) {
  console.error(`\n一共 ${problems} 个问题，请修改 content-src 里的源文件后重新运行 npm run annotate`);
  process.exit(1);
}
