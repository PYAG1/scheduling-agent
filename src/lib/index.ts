import { devLocalVectorstore } from "@genkit-ai/dev-local-vectorstore";
import { gemini20Flash, googleAI, textEmbedding004 } from "@genkit-ai/googleai";
import { readFile, writeFile } from "fs/promises";
import { genkit, SessionData, SessionStore } from "genkit/beta";

import { JWT } from "google-auth-library";
import { google } from "googleapis";
import { indexName } from "../constants";
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: "YOUR_API_KEY",
    }),
    devLocalVectorstore([
      {
        indexName: indexName,
        embedder: textEmbedding004,
      },
    ]),
  ],
  model: gemini20Flash,
});


const SCOPES = ["https://www.googleapis.com/auth/calendar"];
let authClient: JWT | null = null;

async function getAuthClient(): Promise<JWT> {
  if (authClient) {
    return authClient;
  }

  try {
    authClient = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: SCOPES,
    });

    const tokens = await authClient.authorize();
    authClient.setCredentials(tokens);
    return authClient;
  } catch (error) {
    console.error("Error authorizing service account:", error);
    throw error;
  }
}


export class JsonSessionStore<S> implements SessionStore<S> {
  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    try {
      const s = await readFile(`${sessionId}.json`, { encoding: 'utf8' });
      const data = JSON.parse(s);
      return data;
    } catch {
      return undefined;
    }
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    const s = JSON.stringify(sessionData);
    await writeFile(`${sessionId}.json`, s, { encoding: 'utf8' });
  }
}

export async function getCalendarService() {
  const auth = await getAuthClient();
  return google.calendar({ version: "v3", auth });
}
