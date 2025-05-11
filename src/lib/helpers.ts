import { z } from "genkit";
import { ChatMessage } from "./schemas";
import { DateTime } from "luxon";
interface GoogleCalendarEvent {
  start?: { dateTime?: string | null; date?: string | null };
  end?: { dateTime?: string | null; date?: string | null };
  summary?: string | null;
}

/**
 * Extracts user and model messages from a chat response
 * @param messages The messages array from a chat response
 * @returns An array of filtered chat messages (only user and model roles)
 */
export function extractChatHistory(messages?: Array<{role: string, content: any}>): ChatMessage[] {
  if (!messages) return [];
  
  return messages
    .filter(message => message.role === "user" || message.role === "model")
    .map(message => ({
      role: message.role as "user" | "model",
      content: Array.isArray(message.content) && message.content[0]?.text 
        ? message.content[0].text 
        : typeof message.content === "string" 
          ? message.content 
          : ""
    }));
}


// Optimized helper function to find available time slots by finding gaps between events
/**
 * Finds available time slots for meetings within a given date range and working hours.
 * 
 * This function analyzes calendar events and returns a list of DateTime objects representing
 * the start times of available meeting slots that fit the specified duration.
 * 
 * @param {Object} options - The options object.
 * @param {GoogleCalendarEvent[]} options.events - List of existing calendar events to consider.
 * @param {number} options.duration - The required meeting duration in minutes.
 * @param {DateTime} options.timeMin - The start of the time range to search for available slots.
 * @param {DateTime} options.timeMax - The end of the time range to search for available slots.
 * @param {Object} options.workingHours - The working hours constraints.
 * @param {number} options.workingHours.start - The start hour of the working day (e.g., 9 for 9:00 AM).
 * @param {number} options.workingHours.end - The end hour of the working day (e.g., 17 for 5:00 PM).
 * @returns {DateTime[]} An array of DateTime objects representing the start times of available slots.
 */
export function findAvailableSlots({
  events,
  duration,
  timeMin,
  timeMax,
  workingHours,
}: {
  events: GoogleCalendarEvent[];
  duration: number;
  timeMin: DateTime;
  timeMax: DateTime;
  workingHours: { start: number; end: number };
}) {
  const availableSlots: DateTime[] = [];
  const sortedEvents = events
    .map((event) => ({
      start: DateTime.fromISO(event.start?.dateTime ?? event.start?.date ?? ""),
      end: DateTime.fromISO(event.end?.dateTime ?? event.end?.date ?? ""),
    }))
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());

  let currentTime = timeMin.startOf("day").plus({ hours: workingHours.start });

  while (currentTime < timeMax) {
    const dayEnd = currentTime.endOf("day").set({ hour: workingHours.end });

    // Find the next event that overlaps with the current time
    const nextEvent = sortedEvents.find((event) => event.start > currentTime);

    let slotEnd = nextEvent ? nextEvent.start : dayEnd;

    // Check if there's enough time for the meeting
    if (slotEnd.diff(currentTime, "minutes").minutes >= duration) {
      availableSlots.push(currentTime);
    }

    // Move to the end of the next event or the end of the day
    currentTime = nextEvent ? nextEvent.end : dayEnd;

    // If we've reached the end of the day, move to the next day
    if (currentTime >= dayEnd) {
      currentTime = currentTime
        .plus({ days: 1 })
        .set({ hour: workingHours.start });
    }
  }

  return availableSlots;
}