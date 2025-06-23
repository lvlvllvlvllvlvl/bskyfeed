// @ts-check

function checkEnvVars() {
  const pair = [
    ['identifier', 'FEED_OWNER'],
    ['password', 'APP_PASSWORD'],
    ['feedHost', 'FEED_HOST'],
  ];
  const result = /** @type {Object.<string, string>} */ ({});
  for (const [key, env] of pair) {
    const val = process.env[env];
    if (!val) {
      console.error(`Error: ${env} environment variable is missing.`);
      process.exit(1);
    }
    result[key] = val;
  }
  return result;
}

/**
 * Call createSession API
 *
 * @param {string} identifier
 * @param {string} password
 */
function createSession(identifier, password) {
  const req = new Request('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier, password }),
  });
  return fetch(req).then((res) => {
    if (res.ok) {
      return /** @type {Promise<{accessJwt: string, did: string}>} */ (res.json());
    }
    console.error('Login failed. Please check "FEED_OWNER" and "APP_PASSWORD" env vars.');
    process.exit(1);
  });
}

/**
 * Upload image blob to bsky server
 *
 * @param {string} token - accessJwt
 * @param {string} filename
 * @returns {Promise<{ blob: undefined }>}
 */
async function uploadBlob(token, filename) {
  if (!filename) {
    console.info('skip upload blob');
    return null;
  }
  const ext = filename.split('.').pop()?.toLowerCase().replace('jpg', 'jpeg');
  const fs = require('node:fs/promises');
  try {
    const json = await fs.readFile(filename + '.json', 'utf8');
    return JSON.parse(json);
  } catch (ignored) {}
  const blob = await fs
    .readFile(filename)
    .catch((e) => {
      console.log(e.toString());
      process.exit(1);
    });
  const req = new Request('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `image/${ext}`,
    },
    body: blob,
  });
  return fetch(req).then(async (res) => {
    if (res.ok) {
      const json = await res.json();
      await fs.writeFile(filename + '.json', JSON.stringify(json, null, 2));
      return json;
    }
    console.error('failed to upload image');
    process.exit(1);
  });
}

/**
 * Put Custom Feed record
 *
 * @param {string} token
 * @param {string} did
 * @param {string} feedHost
 * @param {{blob: any} | null} imageRef
 * @returns
 */
async function putRecord(token, did, feedHost, imageRef) {
  const record = {
    repo: did,
    collection: 'app.bsky.feed.generator',
    rkey: 'of-following',
    record: {
      did: `did:web:${feedHost}`,
      displayName: 'of following',
      description: 'work in progress',
      avatar: imageRef?.blob,
      createdAt: new Date().toISOString(),
    },
  };

  const req = new Request('https://bsky.social/xrpc/com.atproto.repo.putRecord', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  return fetch(req).then((res) => {
    if (res.ok) {
      return res.json();
    }
    console.error('failed to put record');
    process.exit(1);
  });
}

async function main() {
  console.log('** Create Feed **');
  const { identifier, password, feedHost } = checkEnvVars();
  const { accessJwt, did } = await createSession(identifier, password);
  const imageRef = await uploadBlob(accessJwt, './public/of-following.png');
  console.log(imageRef);
  await putRecord(accessJwt, did, feedHost, imageRef);
  console.log('Complete!');
}

main();
