import googleAI from "@genkit-ai/googleai";
import { z } from "genkit";
import { Document } from "genkit/retriever";
import { chunk } from "llm-chunk";
import * as path from "path";
import { ai } from "../lib";
import {
  extractTextFromPdf,
  file,
  menuPdfIndexer,
  menuRetriever,
} from "../utils/pdfUtils";
import { getUserSchedule, scheduleMeetingTool, searchTool } from "../tools";
import { rancardAgentPrompt } from "../constants";

const chunkingConfig = {
  minLength: 1000,
  maxLength: 2000,
  splitter: "sentence",
  overlap: 100,
  delimiters: "",
} as any;

export const indexMenu = ai.defineFlow(
  {
    name: "indexMenu",
    inputSchema: z.string().describe("PDF file path"),
    outputSchema: z.void(),
  },
  async () => {
    let filePath = path.resolve(file);

    // Read the pdf.
    const pdfTxt = await ai.run("extract-text", () =>
      extractTextFromPdf(filePath)
    );

    // Divide the pdf text into segments.
    const chunks = await ai.run("chunk-it", async () =>
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
    const docs = await ai.retrieve({
      retriever: menuRetriever,
      query: input,
      options: { k: 3 },
    });

    const chat = ai.chat({
      model: googleAI.model("gemini-2.0-flash"),
      tools: [getUserSchedule, searchTool, scheduleMeetingTool],
      docs,
    });

    const messageContent = `${rancardAgentPrompt}\nUser Input: ${input}`;
    const response = await chat.send(messageContent);

    return response.text;
  }
);
