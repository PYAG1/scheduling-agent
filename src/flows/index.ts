import googleAI from "@genkit-ai/googleai";
import { z } from "genkit";
import { Document } from 'genkit/retriever';
import { chunk } from "llm-chunk";
import * as path from 'path';
import { ai } from "../lib";
import { extractTextFromPdf, file, menuPdfIndexer, menuRetriever } from "../utils/pdfUtils";

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

export const menuQAFlow = ai.defineFlow(
  { name: "menuQA", inputSchema: z.string(), outputSchema: z.string() },
  async (input: string) => {
    // retrieve relevant documents
    const docs = await ai.retrieve({
      retriever: menuRetriever,
      query: input,
      options: { k: 3 },
    });

    // generate a response
    const { text } = await ai.generate({
      model: googleAI.model('gemini-2.0-flash'),
      prompt: `
You are acting as a helpful AI assistant that can answer 
questions about the food available on the menu at Genkit Grub Pub.

Use only the context provided to answer the question.
If you don't know, do not make up an answer.
Do not add or change items on the menu.

Question: ${input}`,
      docs,
    });

    return text;
  }
);