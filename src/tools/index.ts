import axios from "axios";
import { ai, getCalendarService } from "../lib";
import {
  InputSchema,
  MeetingSchema,
  OutputSchema,
  ScheduleMeetingOutputSchema,
  SearchToolInputSchema,
  SearchToolOutputSchema,
} from "../lib/schemas";

export const getUserSchedule = ai.defineTool(
  {
    name: "getUserSchedule",
    description:
      "Fetches user calendar events and recommends optimal meeting times based on availability",
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    try {
      const calendar = await getCalendarService();
      const timeMin = new Date().toISOString();
      const timeMax = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Fetch calendar events
      const eventsResponse = await calendar.events.list({
        calendarId: "gyekyeyaw3@gmail.com",
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10,
      });

      const events = eventsResponse.data.items || [];

      // Find available time slots
      const availableSlots = findAvailableSlots({
        events,
        duration: input.duration,
        timeMin: new Date(timeMin),
        timeMax: new Date(timeMax),
      });

      // Select best slot and alternatives
      const [recommendedTime, ...alternativeTimes] = availableSlots.slice(0, 4);

      // Format busy periods
      const busyPeriods = events.map((event) => ({
        start: event.start?.dateTime ?? event.start?.date ?? "",
        end: event.end?.dateTime ?? event.end?.date ?? "",
      }));

      return {
        recommendedTime:
          recommendedTime?.toISOString() || new Date(timeMin).toISOString(),
        alternativeTimes: alternativeTimes.map((slot) => slot.toISOString()),
        busyPeriods,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch schedule: ${error.message}`);
    }
  }
);

// Define the search and summarize tool
export const searchTool = ai.defineTool(
  {
    name: "searchAndSummarize",
    description:
      "Searches the internet for information and provides a concise summary to assist in user chats",
    inputSchema: SearchToolInputSchema,
    outputSchema: SearchToolOutputSchema,
  },
  async (input) => {
    try {
      // Validate the query
      if (!input.query.trim()) {
        throw new Error("Search query cannot be empty");
      }

      // Perform the search using Google Custom Search API
      const response = await axios.get(
        "https://www.googleapis.com/customsearch/v1",
        {
          params: {
            key: process.env.JSON_SEARCH_API_KEY,
            cx: process.env.JSON_SEARCH_ENGINE_ID,
            q: input.query,
          },
        }
      );

      // Extract search results
      const items = response.data.items ?? [];
      if (items.length === 0) {
        return { summary: "No relevant search results found for the query." };
      }

      // Combine titles and snippets for richer context
      const searchContent = items
        .map(
          (item: { title: string; snippet: string }) =>
            `${item.title}: ${item.snippet}`
        )
        .join("\n");

      // Generate a summary using a refined prompt
      const { text } = await ai.generate({
        prompt: `
          You are assisting in a chat with a user who asked for information related to "${input.query}".
          Summarize the following search results in a concise, clear, and conversational manner.
          Focus on the most relevant and useful information to help the user, avoiding technical jargon or redundant details.
          If the results contain conflicting information, highlight the most credible points.
          Provide the summary in 2-3 sentences, tailored to the user's likely intent in a chat context.

          Search results:
          ${searchContent}
        `,
      });

      return { summary: text };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch search results: ${
            error.response?.data?.error?.message ?? error.message
          }`
        );
      }
      if (error instanceof Error) {
        throw new Error(`Search and summarize failed: ${error.message}`);
      }
      throw new Error("Search and summarize failed: Unknown error");
    }
  }
);

export const scheduleMeetingTool = ai.defineTool(
  {
    name: "scheduleMeeting",
    description:
      "Schedules a meeting in Google Calendar based on provided details like summary, description, start time, end time, and attendees.",
    inputSchema: MeetingSchema,
    outputSchema: ScheduleMeetingOutputSchema,
  },
  async (input) => {
    try {
      const calendar = await getCalendarService();

      const eventDetails: any = {
        summary: input.summary,
        description: input.description,
        start: {
          dateTime: input.start,
        },
        end: {
          dateTime: input.end,
        },
      };

      if (input.attendees && input.attendees.length > 0) {
        eventDetails.attendees = input.attendees.map((email) => ({ email }));
      }

      const eventResponse = await calendar.events.insert({
        calendarId: "gyekyeyaw3@gmail.com",
        requestBody: eventDetails,
        sendNotifications: true,
      });

      if (eventResponse.data) {
        return {
          eventId: eventResponse.data.id ?? undefined,
          htmlLink: eventResponse.data.htmlLink ?? undefined,
          status: "success",
          message: `Meeting "${eventResponse.data.summary}" scheduled successfully.`,
        };
      } else {
        throw new Error("Failed to create event, no data returned from API.");
      }
    } catch (error: any) {
      console.error("Error scheduling meeting:", error);
      let errorMessage = "Failed to schedule meeting.";
      if (error.response?.data?.error) {
        errorMessage += ` Details: ${
          error.response.data.error.message ?? error.response.data.error
        }`;
      } else if (error.message) {
        errorMessage += ` Details: ${error.message}`;
      }
      // It's important to throw an error that Genkit can handle or return a structured error response
      // For simplicity, we'll throw a new error.
      // Alternatively, you could return a ScheduleMeetingOutputSchema compliant error object:
      // return { status: "error", message: errorMessage };
      throw new Error(errorMessage);
    }
  }
);

// Helper function to find available time slots
function findAvailableSlots({
  events,
  duration,
  timeMin,
  timeMax,
}: {
  events: any[];
  duration: number;
  timeMin: Date;
  timeMax: Date;
}) {
  // Working hours (9 AM - 5 PM)
  const WORKING_HOURS = { start: 9, end: 17 };

  const availableSlots: Date[] = [];
  let currentTime = new Date(timeMin); //04/10/2024 12:00:00 AM 10/04/2024 12:00:00 AM

  while (currentTime < timeMax) {
    const dayStart = new Date(currentTime);
    dayStart.setHours(WORKING_HOURS.start, 0, 0, 0);
    const dayEnd = new Date(currentTime);
    dayEnd.setHours(WORKING_HOURS.end, 0, 0, 0);

    // Skip if outside working hours
    if (currentTime < dayStart) {
      currentTime = dayStart;
    }

    if (currentTime >= dayEnd) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(WORKING_HOURS.start, 0, 0, 0);
      continue;
    }

    // Check if slot is free
    const slotEnd = new Date(currentTime.getTime() + duration * 60 * 1000);
    const isFree = !events.some((event) => {
      const eventStart = new Date(event.start?.dateTime ?? event.start?.date);
      const eventEnd = new Date(event.end?.dateTime ?? event.end?.date);
      return (
        (currentTime >= eventStart && currentTime < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (currentTime <= eventStart && slotEnd >= eventEnd)
      );
    });

    if (isFree) {
      availableSlots.push(new Date(currentTime));
    }

    // Move to next 30-minute slot
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }

  return availableSlots;
}
