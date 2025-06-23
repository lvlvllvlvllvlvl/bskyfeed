import { cache } from 'hono/cache';
import { createFactory } from 'hono/factory';

const factory = createFactory();

export const wellKnown = factory.createHandlers(cache({ cacheName: 'well-known' }), (c) => {
  const host = new URL(c.req.url).host;

  return c.json({
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: `did:web:${host}`,
    alsoKnownAs: [],
    authentication: null,
    verificationMethod: [],
    service: [
      {
        id: '#bsky_fg',
        type: 'BskyFeedGenerator',
        serviceEndpoint: `https://${host}`,
      },
    ],
  });
});
