import { gemini20Flash } from "@genkit-ai/googleai";
import { z } from "genkit";
import { Document } from "genkit/retriever";
import { chunk } from "llm-chunk";
import * as path from "path";
import { chunkingConfig, menuPdfIndexer, menuRetriever, rancardAgentPrompt } from "../constants";
import { ai, JsonSessionStore } from "../lib";
import { getUserSchedule, scheduleMeetingTool, searchTool } from "../tools";
import {
  extractTextFromPdf,
  file,
} from "../utils/pdfUtils";


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
  { 
    name: "rancardAgent", 
    inputSchema: z.object({
      message: z.string(),
      sessionId: z.string().optional()
    }),
    outputSchema: z.string() 
  },
  async ({ message, sessionId }) => {
    try {
      const docs = await ai.retrieve({
        retriever: menuRetriever,
        query: message,
        options: { k: 3 },
      });
      
      const store = new JsonSessionStore();
      
      // Try to load existing session or create a new one
      let session;
      if (sessionId) {
        try {
          session = await ai.loadSession(sessionId, { store });
        } catch (error) {
          console.log("Failed to load session, creating new one");
          session = ai.createSession({ store });
        }
      } else {
        session = ai.createSession({ store });
      }
      
      const chat = session.chat({
        store,
        model: gemini20Flash,
        system: rancardAgentPrompt,
        tools: [getUserSchedule, searchTool, scheduleMeetingTool],
        docs,
      });

      const messageContent = `User Input: ${message}`;
      const response = await chat.send(messageContent);

      return response.text;
    } catch (error) {
      console.error("Error in rancardAgentFlow:", error);
      return "I'm sorry, I encountered an error processing your request. Please try again.";
    }
  }
);
