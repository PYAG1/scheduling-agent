import { gemini20Flash } from "@genkit-ai/googleai";
import { z } from "genkit";
import { Document } from "genkit/retriever";
import { chunk } from "llm-chunk";
import * as path from "path";
import { AGENT_PROMPT, chunkingConfig, menuPdfIndexer, menuRetriever } from "../constants";
import { ai, JsonSessionStore } from "../lib";
import { extractChatHistory } from "../lib/helpers";
import { AgentInputSchema, AgentOutputSchema } from "../lib/schemas";
import { getUserSchedule, scheduleMeetingTool, searchTool } from "../tools";
import { extractTextFromPdf, file } from "../utils/pdfUtils";

export const indexMenu = ai.defineFlow(
  {
    name: "indexMenu",
    inputSchema: z.string().describe("PDF file path"),
    outputSchema: z.void(),
  },
  async () => {
    let filePath = path.resolve(file);

    // Read the pdf.
    const pdfTxt = await ai.run("extract-text", () => extractTextFromPdf(filePath));

    // Divide the pdf text into segments.
    const chunks = await ai.run("chunk-it", async () => chunk(pdfTxt, chunkingConfig));

    // Convert chunks of text into documents to store in the index.
    const documents = chunks.map((text) => {
      return Document.fromText(text, { filePath });
    });

    // Add documents to the index.
    await ai.index({
      indexer: menuPdfIndexer,
      documents,
    });
  },
);

export const mainAgentFlow = ai.defineFlow(
  {
    name: "rancardAgent",
    inputSchema: AgentInputSchema,
    outputSchema: AgentOutputSchema,
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
      let activeSessionId = sessionId;
      if (sessionId) {
        try {
          session = await ai.loadSession(sessionId, { store });
        } catch (error) {
          console.error("Failed to load session, creating new one:", error);
          session = ai.createSession({ store });
          activeSessionId = session.id
        }
      } else {
        session = ai.createSession({ store });
        activeSessionId = session.id
      }

      const chat = session.chat({
        store,
        model: gemini20Flash,
        system: AGENT_PROMPT,
        returnToolRequests: true,
        tools: [getUserSchedule, searchTool, scheduleMeetingTool],
        docs,
      });

      const messageContent = `User Input: ${message}`;
      const response = await chat.send(messageContent);
      console.log(response?.toolRequests);
      return {
        text: response.text,
        usedTools: response.toolRequests.map((tool) => tool.toolRequest.name),
        chatHistory: extractChatHistory(response?.messages),
        activeSessionId: activeSessionId ?? "", 
      };
    } catch (error) {
      console.error("Error in rancardAgentFlow:", error);
      return {
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        usedTools: [],
        chatHistory: [],
        activeSessionId: sessionId ?? "",
      };
    }
  },
);
