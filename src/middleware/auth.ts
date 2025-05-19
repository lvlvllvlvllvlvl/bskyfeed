import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { decode } from 'hono/jwt';
import type { ClientErrorStatusCode } from 'hono/utils/http-status';

type Option =
  | {
      allowGuest?: boolean;
    }
  | undefined;

function decodeJwt(jwt: string, c: Context): { payload: { exp?: number; iss?: string; aud?: string } } {
  try {
    return decode(jwt);
  } catch {
    throw authError(c, 401, 'unauthorized', 'malformed token');
  }
}

// https://atproto.com/specs/xrpc#inter-service-authentication-temporary-specification
export const XrpcAuth = (opt: Option) =>
  createMiddleware(async (c: Context<{ Bindings: Env; Variables: { iss: string } }>, next) => {
    const jwt = c.req.header('Authorization')?.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)/i)?.[1];

    if (!jwt) {
      throw authError(c, 400, 'bad request', 'no authorization header');
    }

    const {
      payload: { iss, exp, aud },
    } = decodeJwt(jwt, c);

    if (!exp || !iss || exp * 1000 < Date.now()) {
      throw authError(c, 401, 'unauthorized', 'invalid token payload');
    }

    if (aud !== `did:web:${new URL(c.req.url).host}`) {
      throw authError(c, 401, 'unauthorized', 'malformed token');
    }

    c.set('iss', iss);
    await next();
  });

function authError(c: Context, code: ClientErrorStatusCode, message: string, description: string) {
  const reason = code === 401 ? 'invalid_token' : 'invalid_request';
  return new HTTPException(code, {
    res: c.json({ error: message }, code, {
      'WWW-Authenticate': `Bearer realm="${c.req.url}",error="${reason}",error_description="${description}"`,
    }),
  });
}
