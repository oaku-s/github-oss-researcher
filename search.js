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

export async function searchRepos(keyword, category) {
  const query = [
    keyword,
    'language:Python OR language:TypeScript OR language:JavaScript',
    'stars:>500',
    'license:mit OR license:apache-2.0',
    'pushed:>2025-01-01',
  ].join(' ');

  const res = await axios.get(`${GITHUB_API}/search/repositories`, {
    headers: headers(),
    params: { q: query, sort: 'stars', order: 'desc', per_page: 20 },
  });

  const items = res.data.items || [];

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
