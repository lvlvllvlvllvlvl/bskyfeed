import { AppBskyGraphFollow, AppBskyFeedGetFeedSkeleton, AtpAgent } from '@atproto/api';
import { createFactory } from 'hono/factory';
import { XrpcAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validator';

type Post = {
  uri: string;
  createdAt: unknown;
  context: string[];
};

const PROFILE = 'https://bsky.app/profile/';

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

const factory = createFactory();

const collator = new Intl.Collator();
const compare = (l: Post, r: Post) => -collator.compare(String(l.createdAt), String(r.createdAt));

async function getPosts(repo: string, context: string[], result: Post[]) {
  try {
    const res = await agent.com.atproto.repo
      .listRecords({
        repo,
        collection: 'app.bsky.feed.post',
        limit: 10
      });
    result.push(...res.data.records.map(({ uri, value: { createdAt } }) => ({ uri, createdAt, context })));
  } catch (e) {
    console.log('error getting posts', repo, e);
  }
}

async function getFollows(repo: string, seen: Record<string, string[]>) {
  let cursor: string | undefined = undefined;
  do {
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
          if (seen[follow.subject]) {
            seen[follow.subject].push(repo);
          }
          seen[follow.subject] = [repo];
        }
      } else {
        return seen;
      }
    } catch (e) {
      console.log('error getting repo', repo, e);
      return seen;
    }
  } while (cursor);
  return seen;
}

export const getFeedSkeletonHandlers = factory.createHandlers(XrpcAuth({ allowGuest: true }), validateQuery, async (c) => {
  const me = c.get('iss') || 'did:plc:ardo67sxz73eamk2xh54rgwr';
  const limit = Number.parseInt(c.req.query().limit) || 10;

  const repos = await getFollows(me, {});
  await Promise.all(Object.keys(repos).map(follow => getFollows(follow, repos)));

  let records: Post[] = [];
  await Promise.all(Object.entries(repos).map(([follow, by]) => getPosts(follow, by, records)));
  records.sort(compare);

  return c.json<AppBskyFeedGetFeedSkeleton.OutputSchema, 200>({
    // cursor: String(records.at(-1)?.value.createdAt),
    feed: records.map((r) => ({ post: r.uri, feedContext: PROFILE + r.context.join(' ' + PROFILE) }))
  });
});
