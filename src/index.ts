import { Hono } from 'hono';
import { errorLogger, queryLogger } from './middleware/logger';
import { wellKnown } from './well-known';
import { getFeedSkeletonHandlers } from './xrpc/feed';

const app = new Hono();
app.use(queryLogger);
app.use(errorLogger);
app.notFound((c) => c.json({ message: 'Not Found', error: 'not found' }, 404));
app.get('/.well-known/did.json', ...wellKnown);
app.get('/xrpc/app.bsky.feed.getFeedSkeleton', ...getFeedSkeletonHandlers);

export default app;
