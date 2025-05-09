import { ai, getCalendarService } from "../lib";
import { InputSchema, OutputSchema } from "../lib/schemas";




const getUserSchedule = ai.defineTool(
  {
    name: 'getUserSchedule',
    description: 'Fetches user calendar events and recommends optimal meeting times based on availability',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    try {
  
      const calendar = await getCalendarService();
 
      // Set time range (next 7 days)
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch calendar events
      const eventsResponse = await calendar.events.list({
        calendarId: 'gyekyeyaw3@gmail.com',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
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
      const busyPeriods = events.map(event => ({
        start: event.start?.dateTime ?? event.start?.date ?? '',
        end: event.end?.dateTime ?? event.end?.date ?? '',
      }));

      return {
        recommendedTime: recommendedTime?.toISOString() || new Date(timeMin).toISOString(),
        alternativeTimes: alternativeTimes.map(slot => slot.toISOString()),
        busyPeriods,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch schedule: ${error.message}`);
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
    const isFree = !events.some(event => {
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

export { getUserSchedule };

