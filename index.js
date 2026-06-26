import 'dotenv/config';
import { kasegeruKeywords, sandaiyokkyuKeywords } from './keywords.js';
import { searchRepos } from './search.js';
import { scoreRepo } from './scorer.js';
import { writeToSheet } from './sheets.js';

async function collectRepos() {
  const results = [];

  const targets = [
    ...kasegeruKeywords.map((kw) => ({ keyword: kw, category: '稼げる系' })),
    ...sandaiyokkyuKeywords.map((kw) => ({ keyword: kw, category: '三大欲求系' })),
  ];

  for (const { keyword, category } of targets) {
    try {
      const repos = await searchRepos(keyword, category);
      results.push(...repos);
    } catch (err) {
      console.error(`[search] ${keyword}: ${err.message}`);
    }
  }

  // URL重複除去
  const seen = new Set();
  return results.filter((repo) => {
    if (seen.has(repo.url)) return false;
    seen.add(repo.url);
    return true;
  });
}

async function main() {
  const repos = await collectRepos();
  console.log(`検索完了: ${repos.length}件`);

  const scored = [];
  for (const repo of repos) {
    try {
      const score = await scoreRepo(repo);
      scored.push({ repo, score });
    } catch (err) {
      console.error(`[scorer] ${repo.name}: ${err.message}`);
      scored.push({ repo, score: null });
    }
  }

  const written = await writeToSheet(scored);
  console.log(`取得: ${repos.length}件, 書き込み: ${written}件`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
