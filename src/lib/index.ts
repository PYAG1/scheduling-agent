import { devLocalVectorstore } from "@genkit-ai/dev-local-vectorstore";
import { gemini20Flash, googleAI, textEmbedding004 } from "@genkit-ai/googleai";
import { mkdir, readFile, writeFile } from "fs/promises";
import { genkit, SessionData, SessionStore } from "genkit/beta";
import { JWT } from "google-auth-library";
import { google } from "googleapis";
import { Collection, Db, MongoClient } from "mongodb";
import * as path from "path";
import { indexName, projectRoot } from "../constants";
import { cleanEnv, str } from "envalid";

const env = cleanEnv(process.env, {
  MONGO_DB_URI: str(),
  GOOGLE_API_KEY: str(),
});

const uri = env.MONGO_DB_URI;

let client: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    console.log("Attempting to connect to MongoDB...");
    client = new MongoClient(uri, {
      serverApi: {
        version: "1",
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } else {
    console.log("Reusing existing MongoDB connection.");
  }
  return client;
}

export async function getSessionsCollection() {
  const client = await getMongoClient();
  const db = client.db("campaignsAgentDB");
  return db.collection("sessions");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: env.GOOGLE_API_KEY,
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

export class MongoSessionStore<S> implements SessionStore<S> {
  private db: Db;
  private collection: Collection;
  private readonly dbName: string;
  private readonly collectionName: string;

  constructor(dbName: string, collectionName: string) {
    this.db = null as unknown as Db;
    this.collection = null as unknown as Collection;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }

  async connect() {
    const client = await getMongoClient();
    this.db = client.db(this.dbName);
    this.collection = this.db.collection(this.collectionName);
  }

  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    const session = await this.collection.findOne({ sessionId });
    if (!session) return undefined;

    return {
      id: sessionId,
      state: session.state,
      threads: session.threads,
    } as SessionData<S>;
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    await this.collection.updateOne(
      { sessionId },
      { $set: sessionData },
      { upsert: true },
    );
  }
}

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
