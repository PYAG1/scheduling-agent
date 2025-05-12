import { Hono } from "hono";
import { logger } from "hono/logger";
import { mainAgentFlow } from "./flows";
import { getMongoClient } from "./lib";

const app = new Hono();
app.use(logger());

(async () => {
  try {
    await getMongoClient();

  } catch (error) {
    console.error("Failed to connect to MongoDB during server startup:", error);
    process.exit(1); 
  }
})();

app.post("/chat", async (c) => {
  try {
    const { prompt, sessionId } = await c.req.json();
    if (!prompt) {
      return c.json(
        {
          ok: false,
          error: "Prompt is required.",
        },
        400,
      );
    }

    const response = await mainAgentFlow({
      message: prompt,
      sessionId: sessionId,
    });

    return c.json({
      ok: true,
      res: response,
      sessionId: response.activeSessionId,
    });
  } catch (error) {
    console.error("Error generating AI response:", error);
    return c.json(
      {
        ok: false,
        error: "Failed to generate AI response.",
      },
      500,
    );
  }
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

async function shutdown() {
  const client = await getMongoClient();
  await client.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
