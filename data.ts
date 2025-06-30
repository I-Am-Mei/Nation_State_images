import fetch from 'node-fetch';

// GitHub raw URL for your JSON file
const GITHUB_JSON_URL = "https://raw.githubusercontent.com/I-Am-Mei/Nation_State_images/main/delegates.json";

// Custom User-Agent as required by NationStates API rules
const USER_AGENT = "MyNSVoteChecker/1.0 (contact: your-email@example.com)";

type DelegatesFile = {
  delegates: string[];
};

// Fetch JSON file from GitHub
async function fetchDelegates(): Promise<DelegatesFile> {
  const res = await fetch(GITHUB_JSON_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch delegates.json: ${res.status}`);
  }
  return res.json() as Promise<DelegatesFile>; // Type assertion fixes the error
}


// Fetch voting data for a nation
async function fetchVote(nation: string): Promise<string> {
  const url = `https://www.nationstates.net/cgi-bin/api.cgi?nation=${nation}&q=wa`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch WA data for ${nation}`);
  }

  const text = await res.text();
  const match = text.match(/<voteposition>([^<]+)<\/voteposition>/i);

  return match ? match[1] : "UNKNOWN";
}

// Main function
async function main() {
  try {
    const { delegates } = await fetchDelegates();

    console.log(`Checking votes for ${delegates.length} delegates:\n`);

    for (const delegate of delegates) {
      const vote = await fetchVote(delegate.toLowerCase().replace(/ /g, '_'));
      console.log(`${delegate}: ${vote}`);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

main();

