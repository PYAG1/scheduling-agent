# Campaigns Agent

## Overview

The Campaigns Agent is a server-side application for a conversational agent using genkit with RAG. Built with the Hono framework for lightweight web applications, it integrates advanced AI capabilities, external APIs, and document indexing to deliver intelligent responses, schedule meetings, and retrieve information seamlessly.

## Features

- **AI-Powered Chat Endpoint**: Processes user prompts and generates responses using the `rancardAgentFlow`, leveraging document retrieval and external tools.
- **Logging**: Employs Hono’s logger middleware to track requests and responses.
- **Health Check Endpoint**: Offers a simple `GET /` endpoint to confirm the service is operational.

## Tools and Integrations

The application integrates with several powerful tools and services to enhance functionality:

- **Google Custom Search JSON API**: Enables internet searches to provide answers to user queries requiring external data. [Learn more](https://developers.google.com/custom-search/v1/introduction)
- **Google Calendar API**: Facilitates scheduling and calendar management tasks, such as fetching availability and booking meetings. [Learn more](https://developers.google.com/calendar/api)
- **Genkit RAG Framework**: Provides abstractions for indexing, embedding, and retrieving documents to enrich AI responses with context from a PDF menu. [Learn more](https://firebase.google.com/docs/genkit/rag)

### Detailed Tool Descriptions

- **getUserSchedule Tool**:
  - **Purpose**: Retrieves a user’s Google Calendar events and suggests optimal meeting times based on availability within a 7-day window.
  - **Details**: Uses the Google Calendar API to list events, then calculates available slots considering working hours (default: 9 AM to 5 PM) and a specified duration (default: 60 minutes). Returns a recommended time and up to three alternatives.
  - **Integration**: Called within `rancardAgentFlow` to assist users in scheduling by providing available time slots.

- **scheduleMeetingTool**:
  - **Purpose**: Books a meeting in Google Calendar with details like summary, description, start/end times, and attendees.
  - **Details**: Validates input (e.g., start time before end time, valid email addresses for attendees) and uses the Google Calendar API to create an event, returning an event ID and a link to the event.
  - **Integration**: Invoked in `rancardAgentFlow` to finalize meeting bookings once a time is selected.

- **searchTool**:
  - **Purpose**: Searches the internet via the Google Custom Search JSON API and summarizes results to answer user queries.
  - **Details**: Takes a query, fetches search results, and uses AI to generate a concise, conversational summary (2-3 sentences) tailored to the user’s intent.
  - **Integration**: Employed in `rancardAgentFlow` to provide answers requiring information beyond the indexed PDF.

## Requirements

- **Node.js**: Version 16 or higher is recommended.
- **Dependencies**: Installed via `bun install` (see `package.json` for details).
- **Environment Variables**:
  - `JSON_SEARCH_API_KEY`: API key for Google Custom Search.
  - `JSON_SEARCH_ENGINE_ID`: Search engine ID for Google Custom Search.
  - `GOOGLE_CLIENT_EMAIL`: Email from a Google Service Account for Calendar API access.
  - `GOOGLE_PRIVATE_KEY`: Private key from a Google Service Account.
  - `CALENDAR_ID`: ID of the Google Calendar to manage(Your email).

## Setup Instructions

Follow these steps to set up the Campaigns Agent:

1. **Clone the Repository**:

   ```powershell
   git clone <repository-url>
   cd campaigns-agent
   ```

2. **Install Dependencies**:

   ```powershell
   npm install
   ```

   - Ensures all required packages (e.g., `@genkit-ai/googleai`, `pdf.js-extract`, `axios`) are installed.

3. **Configure Environment Variables**:
   - Create a `.env` file in the root directory with the following:

     ```env
     JSON_SEARCH_API_KEY=your_api_key
     JSON_SEARCH_ENGINE_ID=your_search_engine_id
     GOOGLE_CLIENT_EMAIL=your_service_account_email
     GOOGLE_PRIVATE_KEY=your_service_account_private_key
     CALENDAR_ID=your_calendar_id
     ```

   - **Obtaining Credentials**:
     - **Google Custom Search**: Enable the Custom Search API in Google Cloud Console to get `JSON_SEARCH_API_KEY`. Set up a Custom Search Engine to obtain `JSON_SEARCH_ENGINE_ID`.
     - **Google Calendar**: Create a service account in Google Cloud Console, download the JSON key file, and extract `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`. Share the target calendar with the service account and note its `CALENDAR_ID`.
   - **Prerequisites**: A Google Cloud project with Custom Search and Calendar APIs enabled, and a service account with calendar permissions.

4. **Prepare the PDF File**:
   - The `indexMenu` flow indexes a PDF file located at `src/constants/7a6ab7f1-7c29-4e8b-bdfa-57b4edbef9cb.pdf` for document retrieval.
   - Place your PDF in `src/constants/` with this exact name, or modify the `file` constant in `src/utils/pdfUtils.ts` to point to your PDF’s location.
   - **Purpose**: This PDF (e.g., a menu or campaign document) provides context for the AI’s responses.

5. **Run the Application**:

   ```powershell
   npm start
   ```

   - Starts the Hono server, initializes the Genkit AI, and indexes the PDF if present.

6. **Access the Application**:
   - **Chat Endpoint**: `POST /chat` (expects a JSON body with a `prompt` field).
   - **Health Check**: `GET /`.

## Example Usage

### Chat Endpoint

Send a POST request to `/chat`:

```json
{
  "prompt": "What is the weather like today?"
}
```

**Response**:

```json
{
  "ok": true,
  "res": "The weather today is sunny with a high of 25°C."
}
```

### Booking a Meeting

- **User**: "I want to schedule a demo."
- **Assistant**: "Great! Let me check your availability. The best time is tomorrow at 10:00 AM UTC. Alternatives: 2:00 PM, 3:00 PM. Which works for you?"
- **User**: "Let’s go with 10:00 AM."
- **Assistant**: "Your demo is booked! Here’s the link: [Google Calendar link]."

### Searching for Information

- **User**: "Tell me about Rancard’s suitability for marketing campaigns."
- **Assistant**: "Based on a quick search, Rancard offers robust tools for targeted marketing campaigns, with a focus on mobile engagement and data-driven insights, making it suitable for businesses aiming to reach diverse audiences efficiently."

## Project Structure

```plaintext
.
├── src/
│   ├── index.ts          # Application entry point (Hono server setup)
│   ├── constants/        # Static files (e.g., PDF) and configuration constants
│   ├── flows/            # AI workflows (indexMenu, rancardAgentFlow)
│   ├── lib/              # Shared utilities (AI config, session store, calendar service)
│   ├── tools/            # Tool implementations (getUserSchedule, scheduleMeetingTool, searchTool)
│   ├── utils/            # Helper functions (e.g., PDF text extraction)
│   └── ...
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # This documentation
```

### Key Components

- **`indexMenu` Flow**: Indexes a PDF by extracting text, chunking it, converting chunks to documents, and storing them in a local vector store.
- **`rancardAgentFlow` Flow**: Handles user queries by retrieving relevant documents, creating a chat session with the `gemini20Flash` model, and using tools to generate responses.
- **AI Configuration**: Uses Genkit with Google AI’s `gemini20Flash` model and `textEmbedding004` for embeddings.

## Additional Resources

- [Luxon Documentation](https://moment.github.io/luxon/): For date/time handling in tools.
- [Google Service Accounts](https://cloud.google.com/iam/docs/service-accounts): Setup guide for Calendar API access.
- [Google Custom Search JSON API](https://developers.google.com/custom-search/v1/introduction): API reference for search functionality.
- [Google Calendar API](https://developers.google.com/calendar/api): Details on calendar integration.
- [Genkit Documentation](https://firebase.google.com/docs/genkit): Overview of the Genkit framework.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
