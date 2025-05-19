import { AtpAgent } from '@atproto/api';
import { createFactory } from 'hono/factory';
import { XrpcAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validator';

type TFeed = {
  feed: { post: string }[];
  cursor?: string;
};
type Record = {
  uri: string;
  cid: string;
  value: { createdAt: string };
};

const agent = new AtpAgent({ service: 'https://bsky.social' });

const factory = createFactory();

const collator = new Intl.Collator();
const compare = (l: Record, r: Record) => -collator.compare(String(l.value.createdAt), String(r.value.createdAt));

function merge(l: Record[], r: Record[], limit: number): Record[] {
  let li = 0;
  let ri = 0;
  for (let i = 0; i < limit; i++) {
    if (li >= l.length) {
      return l.concat(...r.slice(0, limit - li));
    } else if (ri >= r.length) {
      return r.concat(...l.slice(0, limit - ri));
    } else {
      // Assume both are sorted by createdAt in descending order
      if (l[li].value.createdAt > r[ri].value.createdAt) {
        ri++;
      } else {
        li++;
      }
    }
  }
  // If the loop didn't return early, sum of li + ri should be less than limit
  return l.slice(0, li).concat(...r.slice(0, ri));
}

export const getFeedSkeletonHandlers = factory.createHandlers(XrpcAuth({ allowGuest: true }), validateQuery, async (c) => {
  const actor = c.get('iss');
  const limit = Number.parseInt(c.req.query().limit) || 50;

  let cursor: string | undefined = undefined;
  let records: Record[] = [];
  const seen = new Set<string>();
  do {
    const follows = await agent.app.bsky.graph.getFollows({ actor, cursor });
    if (follows.success) {
      cursor = follows.data.cursor;
      for (const follow of follows.data.follows) {
        if (seen.has(follow.did)) continue;
        seen.add(follow.did);
        agent.com.atproto.repo
          .listRecords({
            repo: follow.did,
            collection: 'app.bsky.feed.post',
            limit,
          })
          .then((res) => {
            records = merge(records, res.data.records as Record[], limit).sort(compare);
          });
      }
    } else {
      cursor = undefined;
    }
  } while (cursor);

  return c.json<TFeed, 200>({
    cursor: String(records.at(-1)?.value.createdAt),
    feed: records.map((r) => ({ post: r.uri })),
  });
});
