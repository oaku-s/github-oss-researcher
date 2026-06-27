import axios from 'axios';

const GITHUB_API = 'https://api.github.com';

const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

async function fetchReadme(owner, repo) {
  try {
    const res = await axios.get(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: { ...headers(), Accept: 'application/vnd.github.raw+json' },
    });
    return typeof res.data === 'string' ? res.data : res.data.content
      ? Buffer.from(res.data.content, 'base64').toString('utf-8')
      : '';
  } catch {
    return '';
  }
}

const ALLOWED_LICENSES = new Set(['MIT', 'Apache-2.0']);
const ALLOWED_LANGUAGES = new Set(['Python', 'TypeScript', 'JavaScript']);

export async function searchRepos(keyword, category) {
  const query = `${keyword} stars:>500 pushed:>2025-01-01`;

  const res = await axios.get(`${GITHUB_API}/search/repositories`, {
    headers: headers(),
    params: { q: query, sort: 'stars', order: 'desc', per_page: 40 },
  });

  const items = (res.data.items || []).filter(
    (item) =>
      ALLOWED_LICENSES.has(item.license?.spdx_id) &&
      ALLOWED_LANGUAGES.has(item.language)
  ).slice(0, 20);

  const repos = await Promise.all(
    items.map(async (item) => {
      const [owner, repo] = item.full_name.split('/');
      const readme = await fetchReadme(owner, repo);
      return {
        name: item.full_name,
        url: item.html_url,
        stars: item.stargazers_count,
        license: item.license?.spdx_id ?? 'Unknown',
        category,
        readme,
      };
    })
  );

  return repos;
}
