import { AppBskyGraphFollow, AtpAgent } from '@atproto/api';

const agent = new AtpAgent({
  service: 'https://bsky.social', fetch: (req, init) => {
    return fetch(new Request(req, init), {
      cf: {
        cacheTtl: 3600,
        cacheEverything: true
      }
    });
  }
});

export class Follows {
  repos = new Set<string>();
  req_limit: number;
  req_count = 0;

  constructor(subrequest_limit = 0) {
    this.req_limit = subrequest_limit;
  }

  async ofFollows(me: string) {
    await this.getFollows(me, true);
    await Promise.all([...this.repos].map(follow => this.getFollows(follow)));
    return this.repos;
  }

  async getFollows(repo: string, loop = false) {
    let cursor: string | undefined = undefined;
    do {
      if (this.req_limit > 0 && this.req_count++ >= this.req_limit) {
        return;
      }
      try {
        const follows = await agent.com.atproto.repo.listRecords({
          repo,
          limit: 100,
          collection: 'app.bsky.graph.follow',
          cursor
        });
        if (follows.success) {
          cursor = follows.data.cursor;
          for (const { value } of follows.data.records) {
            if (!AppBskyGraphFollow.isRecord(value)) continue;
            const follow = value as AppBskyGraphFollow.Record;
            this.repos.add(follow.subject)
          }
        } else {
          return;
        }
      } catch (e) {
        console.log('error getting repo', repo, e);
        return;
      }
      // Checking this.repos.length is redundant with subrequest limit of 50,
      // but note that json payload size to indexer is limited by
      // `spring.http.codecs.max-in-memory-size` (default is 256K)
    } while (loop && cursor);
    return;
  }
}
