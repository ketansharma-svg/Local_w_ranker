// src/services/wrankerApi.ts

import { BASE_URL_WR } from "../util/api";

export type AddLinksPayload = {
  domain: string;               // e.g. "https://highclub.org"
  post_urls: string[];          // source page URLs to check
};

export async function addLinksToMonitor(
  payload: AddLinksPayload,
  token: string
) {
  const res = await fetch(`${BASE_URL_WR}check-links/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Header MUST be 'Authorization' even if we call it "auth token" elsewhere
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    mode: "cors",
  });

  if (!res.ok) {
    throw new Error(`POST /check-links/ failed (${res.status}): ${await res.text()}`);
  }
  return res.json(); // shape unknown → we keep it flexible
}

export async function getBacklinkMonitor(
  domain: string,
  token: string
) {
  const url = `${BASE_URL_WR}check-links/?domain=${encodeURIComponent(domain)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    mode: "cors",
  });

  if (!res.ok) {
    throw new Error(`GET /check-links/ failed (${res.status}): ${await res.text()}`);
  }
  return res.json(); // shape unknown → we keep it flexible
}
