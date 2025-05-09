import googleAI from "@genkit-ai/googleai";
import { z } from "genkit";
import { Document } from 'genkit/retriever';
import { chunk } from "llm-chunk";
import * as path from 'path';
import { ai } from "../lib";
import { extractTextFromPdf, file, menuPdfIndexer, menuRetriever } from "../utils/pdfUtils";
import { getUserSchedule } from "../tools";

const chunkingConfig = {
    minLength: 1000,
    maxLength: 2000,
    splitter: 'sentence',
    overlap: 100,
    delimiters: '',
  } as any;
  
export const indexMenu = ai.defineFlow(
  {
    name: 'indexMenu',
    inputSchema: z.string().describe('PDF file path'),
    outputSchema: z.void(),
  },
  async () => {
    let filePath = path.resolve(file);

    // Read the pdf.
    const pdfTxt = await ai.run('extract-text', () =>
      extractTextFromPdf(filePath)
    );

    // Divide the pdf text into segments.
    const chunks = await ai.run('chunk-it', async () =>
      chunk(pdfTxt, chunkingConfig)
    );

    // Convert chunks of text into documents to store in the index.
    const documents = chunks.map((text) => {
      return Document.fromText(text, { filePath });
    });

    // Add documents to the index.
    await ai.index({
      indexer: menuPdfIndexer,
      documents,
    });
  }
);

export const rancardAgentFlow = ai.defineFlow(
  { name: "rancardAgent", inputSchema: z.string(), outputSchema: z.string() },
  async (input: string) => {
    // Retrieve relevant documents using RAG
    const docs = await ai.retrieve({
      retriever: menuRetriever, // Replace with your company context retriever if different
      query: input,
      options: { k: 3 },
    });

    // Generate a response using the updated prompt
    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
        tools: [getUserSchedule],
      prompt: `
You are a friendly AI assistant for my company, with access to context about my company and its product, Rancard Campaigns. Your role is to engage in a warm, conversational chat with users, answering their questions about my company and its offerings using only the provided context. Do not make up information or add details beyond the context.

When the user sends "hi" or a similar greeting, respond with a friendly welcome and present two options:

1. Learn about my company
2. See how Rancard Campaigns can suit their use case or address their needs.
3. Book a demo session

If the user selects option 1 or asks about the company, provide relevant information from the RAG context in a conversational tone. If they select option 2 or share details about their company, problem, or use case, explain how Rancard Campaigns can help, tailoring the response to their input and drawing from the RAG context.

In every response to a use case or company-related query, proactively offer to book a live demo session to discuss Rancard Campaigns further. Use the \`getUserSchedule\` tool to fetch the user’s calendar events and recommend an optimal time for the demo. The tool accepts an optional \`duration\` parameter (defaulting to 60 minutes) and returns a recommended time, alternative times, and busy periods. Include the recommended time and up to three alternative times in your response, formatted as a friendly suggestion (e.g., "How about a demo on [recommended time]? Or I can also do [alternative times]."). If the tool fails or no slots are available, politely suggest the user provide a preferred time.

Maintain a friendly, professional tone throughout, and ensure responses are concise yet informative. If the user’s input is unclear, ask clarifying questions to better tailor your response.

User Input: ${input}`,

      docs,
    });

    return text;
  }
);

