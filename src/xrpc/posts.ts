type SearchResult = {
  rkey: string;
  did: string;
  createdAt: string;
}

type Post = {
  uri: string;
  createdAt: string;
};

export async function getPosts(repos: Record<string, string[]>, cursor: string = '*', limit = 100, url: string): Promise<Post[]> {
  const body: any = {
    q: `+createdAt:[* TO ${cursor}] -is:reply`,
    dids: Object.keys(repos),
    limit
  };

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    method: 'POST'
  });

  if (!res.ok) {
    console.log(res.status, 'error getting posts', body, await res.text());
    return [];
  }

  const { result } = await res.json<{ result: SearchResult[] }>();
  return result.map(({ did, rkey, createdAt }) => ({
    uri: `at://${did}/app.bsky.feed.post/${rkey}`,
    createdAt
  }));
}
