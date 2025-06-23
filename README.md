# of following

BlueSky feed showing posts from all accounts you or people you follow are following

<img alt="logo" src="public/of-following.png" width="128">

Code copied from https://github.com/mzyy94/bluebookmark/, a serverless application running on Cloudflare Workers®︎,
using [hono](https://github.com/honojs/hono) and written in simple code.

The full account list is fetched when a user first accesses the feed, then a request is made to a server running the
jetstream indexer from https://github.com/bskyviewer/indexer to get recent post ids for those accounts.
Rate-limiting is not handled well, so if this feed becomes popular or if someone that's following a lot of accounts
tries to access it the feed may not include all accounts.
[Cache ttl](https://developers.cloudflare.com/workers/examples/cache-using-fetch/) for requests to the atproto service
is set to one hour (at the time of writing this) so recently followed users might not appear immediately when you
refresh the feed.

## License

Licensed under [MIT](LICENSE)
