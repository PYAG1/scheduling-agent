import { z } from "zod";

export const SearchToolInputSchema = z.object({
  query: z.string().min(1).describe('The search query provided by the user to find relevant information'),
});

export const SearchToolOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the search results tailored to assist in the user chat'),
});


export const InputSchema = z.object({
  duration: z.number().min(15).optional().default(60).describe("Meeting duration in minutes"),
});


export const OutputSchema = z.object({
  recommendedTime: z.string().datetime().describe("Recommended meeting time in ISO format"),
  alternativeTimes: z.array(z.string().datetime()).describe("Alternative meeting times"),
  busyPeriods: z.array(z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })).describe("User's busy periods"),
});