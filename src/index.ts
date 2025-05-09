import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getCalendarService } from './lib';
import { rancardAgentFlow } from './flows';




const app = new Hono();
app.use(logger());

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_API_KEY is not set in the environment variables.');
}


app.get('/list-events', async (c) => {
  try {
    const calendar = await getCalendarService();
    const eventsResponse = await calendar.events.list({
      calendarId: 'gyekyeyaw3@gmail.com', 
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return c.json( eventsResponse.data.items);
  } catch (error: any) {
    console.error('Error listing calendar events:', error);
    return c.json(
      {
        ok: false,
        error: `Failed to list calendar events: ${error.message}`
      },
      500
    );
  }
});

app.post('/create-event', async (c) => {
  try {
    const calendar = await getCalendarService();
    const body = await c.req.json(); // Expect event details in the request body

    const event = await calendar.events.insert({
      calendarId: 'papayaw.agyemangyekye@rancard.com', 
      requestBody: body,
    });
    console.log('Event created:', event);

    return c.json( event.data);
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return c.json(
      {
        ok: false,
        error: `Failed to list calendar events: ${error.message}`
      },
      500
    );
  }
});
app.post('/chat', async (c) => {
  try {
    const { prompt } = await c.req.json();
    if (!prompt) {
      return c.json(
        {
          ok: false,
          error: 'Prompt is required.',
        },
        400
      );
    }

    const response = await  rancardAgentFlow(prompt);

    console.log(response);
    return c.json({
      ok: true,
      res: response,
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