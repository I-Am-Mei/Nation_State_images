import fetch from "node-fetch";
import { JSDOM } from "jsdom";
type Delegate = {
  name: string;
  nation_id: string;
};
type DelegatesFile = {
  delegates: Delegate[];
};
type VoteRecord = {
  region: string;
  delegate: string;
  vote: string;
};
const GITHUB_JSON_URL =
  "https://raw.githubusercontent.com/I-Am-Mei/Nation_State_images/main/delegates.json";
function toNationId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}
async function fetchDelegates(): Promise<DelegatesFile> {
  const res = await fetch(GITHUB_JSON_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch delegates.json: ${res.status}`);
  }
  const text = await res.text();
  console.log("Fetched raw text from GitHub:\n", text);
  return JSON.parse(text);
}
//kill me
async function fetchDelegateVote(delegate: Delegate): Promise<VoteRecord | null> {
  const nationId =
    delegate.nation_id === "unknown" ? toNationId(delegate.name) : delegate.nation_id;

  const url = `https://www.nationstates.net/cgi-bin/api.cgi?nation=${nationId}&q=wa_votes`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mei Delegate Vote Scraper",
    },
  });
  if (!res.ok) {
    console.error(`Failed to fetch delegate vote for ${delegate.name}: ${res.status}`);
    return null;
  }
  const xmlText = await res.text();
  const dom = new JSDOM(xmlText, { contentType: "text/xml" });
  const doc = dom.window.document;
  const voteGA = doc.querySelector("GAVOTE")?.textContent ?? "No vote";
  const voteSC = doc.querySelector("SCVOTE")?.textContent ?? "No vote";
  return {
    region: delegate.name,
    delegate: nationId,
    vote: `GA: ${voteGA}, SC: ${voteSC}`,
  };
}
async function main() {
  try {
    const { delegates } = await fetchDelegates();
    console.log("Checking delegate votes...\n");
    const results: VoteRecord[] = [];
    for (const delegate of delegates) {
      const voteRecord = await fetchDelegateVote(delegate);
      if (voteRecord) {
        results.push(voteRecord);
      }
      await new Promise((r) => setTimeout(r, 1000)); // polite delay
    }
    for (const result of results) {
      console.log(
        `Region: ${result.region}, Delegate ID: ${result.delegate}, Vote: ${result.vote}`
      );
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
