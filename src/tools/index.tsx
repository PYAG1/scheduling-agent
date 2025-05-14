import axios from "axios";
import { ai, getCalendarService } from "../lib";
import { Resend } from "resend";
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
import { EmailTemplate } from "../templates/email-notification-template";
import { AdminEmailTemplate } from "../templates/admin-notification-template";
//TODO:Refactor code 
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

      const workingHours = {
        start: input.workingHours?.start ?? 9,
        end: input.workingHours?.end ?? 17,
      };
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
        .map((slot) => slot.toISO());

      return {
        recommendedTime: recommendedTime?.isValid
          ? recommendedTime.toISO()
          : DateTime.fromISO(timeMin).toISO(),
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
      "Schedules a meeting by sending email notifications with meeting details including summary, description, start time, attendees, and phone number.",
    inputSchema: MeetingSchema,
    outputSchema: ScheduleMeetingOutputSchema,
  },
  async (input) => {
    try {
      console.log("ScheduleMeeting: Starting scheduling process", {
        summary: input.summary,
        attendeesCount: input.attendees?.length || 0,
        startTime: input.start,
      });

      const start = DateTime.fromISO(input.start);
      let end = input.end ? DateTime.fromISO(input.end) : start.plus({ minutes: DEFAULT_DURATION });

      if (!start.isValid) {
        console.error("ScheduleMeeting: Invalid start time format", { startInput: input.start });
        throw new Error("Invalid start time format");
      }
      if (!end.isValid || start >= end) {
        console.log("ScheduleMeeting: Adjusting end time", {
          endBefore: input.end,
          endAfter: start.plus({ minutes: DEFAULT_DURATION }).toISO(),
        });
        end = start.plus({ minutes: DEFAULT_DURATION });
      }

      if (input.attendees) {
        const invalidEmails = input.attendees.filter((email) => !/^\S+@\S+\.\S+$/.test(email));
        if (invalidEmails.length > 0) {
          console.error("ScheduleMeeting: Invalid attendee emails detected", { invalidEmails });
          throw new Error(`Invalid attendee email(s): ${invalidEmails.join(", ")}`);
        }
      }

      console.log("ScheduleMeeting: Initializing Resend client");
      const resend = new Resend(process.env.RESEND_API_KEY);
      if (!process.env.RESEND_API_KEY) {
        console.error("ScheduleMeeting: Missing Resend API key");
      }

      // Default recipient if no attendees specified
      const recipients = input.attendees?.length ? input.attendees : ["gyekyeyaw3@gmail.com"];

      console.log("ScheduleMeeting: Recipients determined", { recipients });

      // Extract a name for the first recipient for personalization
      const firstName = recipients[0].split("@")[0].replace(/[^a-zA-Z]/g, "");
      const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

      console.log("ScheduleMeeting: Email template props", {
        firstName: capitalizedFirstName,
        meetingSummary: input.summary,
        meetingDescription: input.description,
        startTime: start.toISO() || "",
        endTime: end.toISO() || "",
        attendees: input.attendees,
        phoneNumber: input.phoneNumber,
      });

      // Admin email (always sent to you)
      console.log("ScheduleMeeting: Sending admin notification email");
      try {
        const adminEmailResult = await resend.emails.send({
          from: "pyag@mail.frimps.xyz",
          to: ["gyekyeyaw3@gmail.com"],
          subject: `New Demo Request: ${input.summary}`,
          react: (
            <AdminEmailTemplate
              meetingSummary={input.summary}
              meetingDescription={input.description}
              startTime={start.toISO() || ""}
              endTime={end.toISO() || ""}
              attendees={input.attendees}
              phoneNumber={input.phoneNumber}
              firstName={capitalizedFirstName}
            />
          ),
        });
        console.log("Admin email sent successfully", { adminEmailId: adminEmailResult.data?.id });
      } catch (adminEmailError) {
        console.log("Failed to send admin email", { error: adminEmailError });
      }

      console.log("ScheduleMeeting: Sending attendee notification email");
      try {
        const { data, error } = await resend.emails.send({
          from: "pyag@mail.frimps.xyz",
          to: recipients,
          subject: `Meeting Confirmation: ${input.summary}`,
          react: (
            <EmailTemplate
              firstName={capitalizedFirstName}
              meetingSummary={input.summary}
              meetingDescription={input.description}
              startTime={start.toISO() || ""}
              endTime={end.toISO() || ""}
              attendees={input.attendees}
            />
          ),
        });

        console.log("ScheduleMeeting: Attendee email response", {
          data,
          error,
          responseData: JSON.stringify(data),
        });

        if (error) {
          console.error("ScheduleMeeting: Failed to send meeting invitation", { error });
          throw new Error(`Failed to send meeting invitation: ${error.message}`);
        }

        console.log("ScheduleMeeting: Meeting scheduled successfully", {
          emailId: data?.id,
          recipients,
        });
        return {
          eventId: data?.id,
          status: "success",
          message: `Meeting for "${input.summary}" scheduled successfully! A confirmation has been sent to ${recipients.join(", ")}.`,
        };
      } catch (emailError) {
        console.error("ScheduleMeeting: Error sending attendee email", {
          error: emailError,
          message: emailError.message,
          stack: emailError.stack,
        });
        throw emailError;
      }
    } catch (error: any) {
      console.error("ScheduleMeeting: Error scheduling meeting", {
        errorMessage: error.message,
        stack: error.stack,
      });
      return {
        status: "error",
        message: "Failed to schedule meeting. Please try again or contact info@savannahintelligence.com.",
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
