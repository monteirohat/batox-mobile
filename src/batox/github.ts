// BatoX's releases, read from the GitHub API by the phone. The console downloads the files itself.

export const REPO = 'monteirohat/BatoX';
const API = `https://api.github.com/repos/${REPO}`;

export type ReleaseAsset = { name: string; size: number; url: string };

export type Release = {
  tag: string;
  name: string;
  publishedAt: string;
  prerelease: boolean;
  url: string;
  assets: ReleaseAsset[];
};

type GitHubRelease = {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  html_url: string;
  assets: { name: string; size: number; browser_download_url: string }[];
};

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'BatoX-Mobile', 'X-GitHub-Api-Version': '2022-11-28' },
    });
  } catch {
    throw new Error("Couldn't reach GitHub. Check the phone's internet connection.");
  }
  if (res.status === 404) throw new Error('Not found on GitHub.');
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    throw new Error("GitHub's hourly request limit was reached. Try again in a few minutes.");
  }
  if (!res.ok) throw new Error(`GitHub returned an error (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

function toRelease(r: GitHubRelease): Release {
  return {
    tag: r.tag_name,
    name: r.name || r.tag_name,
    publishedAt: r.published_at || '',
    prerelease: r.prerelease,
    url: r.html_url,
    assets: r.assets.map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url })),
  };
}

// Published releases, newest first (drafts are skipped)
export async function listReleases(): Promise<Release[]> {
  const data = await request<GitHubRelease[]>('/releases?per_page=30');
  return data.filter((r) => !r.draft).map(toRelease);
}
