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
import { DateTime } from "luxon";
import { DEFAULT_DURATION } from "../constants";
import { findAvailableSlots } from "../lib/helpers";

interface EventDetails {
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  attendees?: { email: string }[];
}

const CALENDAR_ID = process.env.CALENDAR_ID;

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
      const timeMin = DateTime.now().toUTC().toISO();
      const timeMax = DateTime.now().plus({ days: 7 }).toUTC().toISO();

      const eventsResponse = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10,
      });

      const events = eventsResponse.data.items || [];

      const workingHours = input.workingHours || { start: 9, end: 17 };
      const availableSlots = findAvailableSlots({
        events,
        duration: input.duration || DEFAULT_DURATION,
        timeMin: DateTime.fromISO(timeMin),
        timeMax: DateTime.fromISO(timeMax),
        workingHours,
      });

      const [recommendedTime, ...alternativeTimes] = availableSlots.slice(0, 4);

      const busyPeriods = events.map((event) => ({
        start: event.start?.dateTime ?? event.start?.date ?? "",
        end: event.end?.dateTime ?? event.end?.date ?? "",
      }));

      const validAlternativeTimes = alternativeTimes
        .filter((slot) => slot.isValid)
        .map((slot) => slot.toISO()!);

      return {
        recommendedTime: recommendedTime?.isValid
          ? recommendedTime.toISO()!
          : DateTime.fromISO(timeMin).toISO()!,
        alternativeTimes: validAlternativeTimes,
        busyPeriods,
      };
    } catch (error: any) {
      console.error("Error in getUserSchedule:", error);
      return {
        recommendedTime: DateTime.now().plus({ days: 1 }).toISO(),
        alternativeTimes: [],
        busyPeriods: [],
        message: "Unable to fetch schedule. Please suggest a preferred time.",
      };
    }
  },
);
export const scheduleMeetingTool = ai.defineTool(
  {
    name: "scheduleMeeting",
    description:
      "Schedules a meeting in Google Calendar based on provided details like summary, description, start time, optional end time, and attendees.",
    inputSchema: MeetingSchema,
    outputSchema: ScheduleMeetingOutputSchema,
  },
  async (input) => {
    try {
      const calendar = await getCalendarService();

      const start = DateTime.fromISO(input.start);
      let end = input.end ? DateTime.fromISO(input.end) : start.plus({ minutes: DEFAULT_DURATION });

      if (!start.isValid) {
        throw new Error("Invalid start time format");
      }
      if (!end.isValid || start >= end) {
        end = start.plus({ minutes: DEFAULT_DURATION });
      }

      if (input.attendees) {
        const invalidEmails = input.attendees.filter((email) => !/^\S+@\S+\.\S+$/.test(email));
        if (invalidEmails.length > 0) {
          throw new Error(`Invalid attendee email(s): ${invalidEmails.join(", ")}`);
        }
      }

      const eventDetails: EventDetails = {
        summary: input.summary,
        description: input.description,
        start: { dateTime: start.toISO() },
        end: { dateTime: end.toISO() },
        attendees: input.attendees?.map((email) => ({ email })),
      };

      const eventResponse = await calendar.events.insert({
        
        calendarId: CALENDAR_ID,
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
      }
      throw new Error("Failed to create event, no data returned from API.");
    } catch (error: any) {
      console.error("Error scheduling meeting:", error);
      // Provide a user-friendly fallback
      return {
        status: "error",
        message: "Failed to schedule meeting. Please try again or contact campaigns@rancard.com.",
      };
    }
  },
);

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
      const query = input.query.trim();
      if (!query) {
        return { summary: "No search query provided. Please clarify your request." };
      }

      const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
        params: {
          key: process.env.JSON_SEARCH_API_KEY,
          cx: process.env.JSON_SEARCH_ENGINE_ID,
          q: query,
        },
      });

      const items = response.data.items ?? [];
      if (items.length === 0) {
        return { summary: "No relevant search results found for the query." };
      }

      const searchContent = items
        .map((item: { title: string; snippet: string }) => `${item.title}: ${item.snippet}`)
        .join("\n");

      const { text } = await ai.generate({
        prompt: `
          You are assisting in a chat with a user who asked for information related to "${query}".
          Summarize the following search results in a concise, clear, and conversational manner.
          Focus on the most relevant and useful information to help the user, avoiding technical jargon or redundant details.
          If the results contain conflicting information, highlight the most credible points.
          Provide the summary in 2-3 sentences, tailored to the user's likely intent in a chat context.

          Search results:
          ${searchContent}
        `,
      });

      return { summary: text };
    } catch (error: any) {
      console.error("Error in searchTool:", error);
      return { summary: "Unable to fetch search results. Please try again or clarify your query." };
    }
  },
);
