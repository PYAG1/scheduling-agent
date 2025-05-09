import {
    devLocalVectorstore
} from '@genkit-ai/dev-local-vectorstore';
import { googleAI, textEmbedding004 } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export const ai = genkit({
    plugins: [
      googleAI({
        apiKey: "YOUR_API_KEY",
      }),
      devLocalVectorstore([
        {
          indexName: 'menuQA',
          embedder: textEmbedding004,
        },
      ]),
    ],
    model: googleAI.model('gemini-2.0-flash'),
  });
  


  // googleAuth.ts
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
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
    console.error('Error authorizing service account:', error);
    throw error;
  }
}

export async function getCalendarService() {
  const auth = await getAuthClient();
  return google.calendar({ version: 'v3', auth });
}
