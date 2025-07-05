import { createFactory } from 'hono/factory';
import { XrpcAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validator';
import { Follows } from './follows';
import { getPosts } from './posts';

const factory = createFactory();

export const getFeedSkeletonHandlers = factory.createHandlers(XrpcAuth(), validateQuery, async (c) => {

  const me = c.get('iss') || c.env.FALLBACK_USER;
  const limit = Number.parseInt(c.req.query().limit) || 100;
  const cursor = c.req.query().cursor;

  const repos = await new Follows((c.env.SUBREQUEST_LIMIT || 0) - 1).ofFollows(me);

  return getPosts(repos, cursor, limit, c.env.INDEXER_URL);
});
