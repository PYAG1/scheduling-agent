import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { v4 as uuidv4 } from 'uuid'; 
import { mainAgentFlow } from './flows';

const app = new Hono();
app.use(logger());

app.post('/chat', async (c) => {
  try {
    const { prompt, sessionId } = await c.req.json();
    if (!prompt) {
      return c.json(
        {
          ok: false,
          error: 'Prompt is required.',
        },
        400
      );
    }

   
    const activeSessionId = sessionId ?? uuidv4();
    
    const response = await mainAgentFlow({
      message: prompt, 
      sessionId: activeSessionId
    });

    console.log(response);
    return c.json({
      ok: true,
      res: response,
      sessionId: activeSessionId, 
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    return c.json(
      {
        ok: false,
        error: 'Failed to generate AI response.',
      },
      500
    );
  }
});

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

export default app;