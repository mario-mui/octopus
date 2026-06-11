/*
 * Encrypts the password for the dex login form. dex exposes an RSA public key
 * at `/dex/pubkey`; we encrypt `{ ts, password }` with PKCS#1 v1.5 padding to
 * match dex's web client. When the endpoint is absent (404), dex accepts a
 * plain base64 password, which is the fallback.
 */
import { constants, publicEncrypt } from 'node:crypto';

import { NOT_FOUND_STATUS } from './constants';
import { getJson } from './http';

/** Wrap a bare base64 DER key in PEM so `publicEncrypt` can parse it. */
function toPem(pubkey: string, label: string): string {
  if (pubkey.includes('BEGIN')) {
    return pubkey;
  }
  const lines = pubkey.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? pubkey;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

function rsaEncrypt(pubkey: string, payload: string): string {
  const data = Buffer.from(payload);
  // Try SPKI ("PUBLIC KEY") first, then PKCS#1 ("RSA PUBLIC KEY").
  for (const label of ['PUBLIC KEY', 'RSA PUBLIC KEY']) {
    try {
      const encrypted = publicEncrypt(
        { key: toPem(pubkey, label), padding: constants.RSA_PKCS1_PADDING },
        data,
      );
      return encrypted.toString('base64');
    } catch {
      // try the next key format
    }
  }
  throw new Error('Unable to parse the dex RSA public key');
}

export async function encryptPassword(
  apiWithDex: string,
  password: string,
): Promise<string> {
  try {
    const { status, json } = await getJson<{ pubkey: string; ts: string }>(
      `${apiWithDex}/pubkey`,
    );
    if (status === NOT_FOUND_STATUS || !json?.pubkey) {
      return Buffer.from(password).toString('base64');
    }
    return rsaEncrypt(json.pubkey, JSON.stringify({ ts: json.ts, password }));
  } catch {
    // Any failure (missing endpoint, unparseable key) falls back to base64,
    // which older dex deployments accept.
    return Buffer.from(password).toString('base64');
  }
}
