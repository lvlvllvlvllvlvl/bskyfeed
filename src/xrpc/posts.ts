export async function getPosts(dids: string[], before: string, limit = 100, url: string) {
  const body: any = {
    q: 'is:post',
    before,
    limit,
    dids
  };

  return fetch(url, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    method: 'POST'
  });
}
