type SearchResult = {
  rkey: string;
  did: string;
  createdAt: string;
}

type Post = {
  uri: string;
  createdAt: string;
};

export async function getPosts(dids: string[], before: string, limit = 100, url: string): Promise<Post[]> {
  const body: any = {
    before,
    limit,
    dids
  };

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    method: 'POST'
  });

  if (!res.ok) {
    console.error(res.status, 'error getting posts', body, await res.text());
    return [];
  }

  const { result } = await res.json<{ result: SearchResult[] }>();
  return result.map(({ did, rkey, createdAt }) => ({
    uri: `at://${did}/app.bsky.feed.post/${rkey}`,
    createdAt
  }));
}
