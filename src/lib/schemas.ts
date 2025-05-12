import { z } from "zod";

export const SearchToolInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("The search query provided by the user to find relevant information"),
});

export const SearchToolOutputSchema = z.object({
  summary: z
    .string()
    .describe("A concise summary of the search results tailored to assist in the user chat"),
});

export const InputSchema = z.object({
  duration: z.number().min(15).optional().default(60).describe("Meeting duration in minutes"),
  workingHours: z
    .object({
      start: z.number().min(0).max(23),
      end: z.number().min(0).max(23),
    })
    .optional()
    .describe("Working hours start and end (24-hour format)"),
});

export const OutputSchema = z.object({
  recommendedTime: z.string().datetime().describe("Recommended meeting time in ISO format"),
  alternativeTimes: z.array(z.string().datetime()).describe("Alternative meeting times"),
  busyPeriods: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
    )
    .describe("User's busy periods"),
});

export const MeetingSchema = z.object({
  summary: z.string().min(1, "Summary cannot be empty"),
  description: z.string().optional(),
  start: z.string().datetime({ message: "Invalid start date-time format" }),
  end: z.string().datetime({ message: "Invalid end date-time format" }).optional(),
  attendees: z.array(z.string().email({ message: "Invalid email format in attendees" })).optional(),
});

export const ScheduleMeetingOutputSchema = z.object({
  eventId: z.string().optional().describe("The ID of the created calendar event"),
  htmlLink: z.string().url().optional().describe("A link to the created event in Google Calendar"),
  status: z.string().describe("Status of the meeting scheduling operation"),
  message: z.string().optional().describe("Additional message regarding the operation"),
});

export const chatMessageSchema = z.object({
  role: z.enum(["model", "user"]),
  content: z.string(),
});

export const AgentInputSchema = z.object({
  message: z.string(),
  sessionId: z.string().optional(),
});

export const AgentOutputSchema = z.object({
  text: z.string(),
  usedTools: z.array(z.string()),
  activeSessionId: z.string(),
  chatHistory: z.array(
    z.object({
      role: z.enum(["model", "user"]),
      content: z.string(),
    }),
  ),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
