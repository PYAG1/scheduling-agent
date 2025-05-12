import { devLocalVectorstore } from "@genkit-ai/dev-local-vectorstore";
import { gemini20Flash, googleAI, textEmbedding004 } from "@genkit-ai/googleai";
import { readFile, writeFile, mkdir } from "fs/promises";
import { genkit, SessionData, SessionStore } from "genkit/beta";
import { JWT } from "google-auth-library";
import { google } from "googleapis";
import * as path from "path";
import { indexName, projectRoot } from "../constants";
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
  private readonly sessionsDir: string;

  constructor() {
    this.sessionsDir = path.join(projectRoot, "sessions");
  }

  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      const s = await readFile(filePath, { encoding: "utf8" });
      return JSON.parse(s);
    } catch (error) {
      console.debug(
        `Failed to load session ${sessionId}:`,
        error instanceof Error ? error.message : "Unknown error",
      );
      return undefined;
    }
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    try {
      await mkdir(this.sessionsDir, { recursive: true });

      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      const s = JSON.stringify(sessionData);
      await writeFile(filePath, s, { encoding: "utf8" });
    } catch (error) {
      console.error(`Failed to save session ${sessionId}:`, error);
      throw error;
    }
  }
}

export async function getCalendarService() {
  const auth = await getAuthClient();
  return google.calendar({ version: "v3", auth });
}
