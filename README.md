# Scheduling Agent

## Overview

The Scheduling Agent is a server-side application designed to streamline scheduling and conversational interactions using advanced AI capabilities. Built with the Hono framework for lightweight web applications, it integrates tools for intelligent scheduling, internet searches, and document indexing to provide seamless user experiences. The agent leverages Genkit with RAG (Retrieval-Augmented Generation) to enhance its responses with contextual information.

## Features

- **AI-Powered Chat Endpoint**: Processes user prompts and generates responses using the `savannahAgentFlow`, leveraging document retrieval and external tools.
- **Email Notifications**: Sends scheduling confirmation emails instead of direct calendar integration due to authentication constraints.
- **Health Check Endpoint**: Offers a simple `GET /` endpoint to confirm the service is operational.

## Tools and Integrations

The application integrates with several powerful tools and services to enhance functionality:

- **Google Custom Search JSON API**: Enables internet searches to provide answers to user queries requiring external data. [Learn more](https://developers.google.com/custom-search/v1/introduction)
- **Google Calendar API**: Facilitates retrieving calendar events and availability information. [Learn more](https://developers.google.com/calendar/api)
- **Resend Email API**: Handles sending email notifications for scheduling instead of direct calendar additions. [Learn more](https://resend.com/docs)
- **Genkit RAG Framework**: Provides abstractions for indexing, embedding, and retrieving documents to enrich AI responses with context from a PDF menu. [Learn more](https://firebase.google.com/docs/genkit/rag)

### Detailed Tool Descriptions

- **getUserSchedule Tool**:
  - **Purpose**: Retrieves a user's Google Calendar events and suggests optimal meeting times based on availability within a 7-day window.
  - **Details**: Uses the Google Calendar API to list events, then calculates available slots considering working hours (default: 9 AM to 5 PM) and a specified duration (default: 60 minutes). Returns a recommended time and up to three alternatives.
  - **Integration**: Called within `savannahAgentFlow` to assist users in scheduling by providing available time slots.

- **searchTool**:
  - **Purpose**: Performs dual functions - searching the internet via the Google Custom Search JSON API and sending email notifications.
  - **Details**: For searches, takes a query, fetches results, and uses AI to generate a concise summary. For scheduling, sends email notifications instead of adding to calendar directly.
  - **Integration**: Employed for external queries and for sending meeting confirmations due to Google Calendar API limitations with service account authentication.

- **scheduleMeetingTool**:
  - **Purpose**: Prepares meeting details and triggers email notifications rather than direct calendar additions.
  - **Details**: Validates input (e.g., valid email addresses) but sends confirmation emails instead of adding to calendar due to domain-wide delegation restrictions that require user consent.
  - **Note**: Direct calendar additions are blocked because Google Service Account authentication provides server-to-server auth but calendar operations require domain-wide delegation or user consent.
## Guide Demo
**Step 1**
Make a request to the agent. When a greeting is sent the agent responds with a menu. But in this case the agent was asked to directly book a demo. The agent responds to the users request by providing available periods for the meeting.
![step 1](https://github.com/PYAG1/scheduling-agent/blob/main/src/assets/step1.png)

**Step 2**
The agent is able to provide this response to the user by utilizing the **getUserSchedule** tool. The user makes a request using the tool as shown in the screenshot.
![step 2](https://github.com/PYAG1/scheduling-agent/blob/main/src/assets/step2.png)

**Step 3**
 The **getUserSchedule** tool is configured to look for available periods in my google calendar is provide a recommended time ,an alternative time and busy periods during the week. 
 ![step 2](https://github.com/PYAG1/scheduling-agent/blob/main/src/assets/step3.png)

 **Step 4**
 Using the response from the **getUserSchedule** tool the agent presents the recommened time as well as the alternative time for the user to select from.
 ![step 2](https://github.com/PYAG1/scheduling-agent/blob/main/src/assets/step4.png)

 **Step 5**
 The user responds to the agent providing it with their detail.(email and phone number). The agent uses the time selected by the user as well as the user information and calls the **scheduleMeeting** tool.
 ![step 2](https://github.com/PYAG1/scheduling-agent/blob/main/src/assets/step5.png)

 **Step 6**
 The agent successfully books the meeting using  the **scheduleMeeting** tool by sending an email to me and the user.
 ![step 2](https://github.com/PYAG1/scheduling-agent/blob/main/src/assets/step6.png)


## Branch Structure

This project has two branches with different implementations:

1. **Main Branch**: Simple implementation with no database integration. Uses in-memory session management and basic functionality.
2. **Branch Two**: Enhanced implementation with MongoDB integration for persistent storage of user sessions, scheduling data, and interaction history.

## Requirements

- **Node.js**: Version 16 or higher is recommended.
- **Dependencies**: Installed via `npm install` (see `package.json` for details).
- **Environment Variables**:
  - `JSON_SEARCH_API_KEY`: API key for Google Custom Search.
  - `JSON_SEARCH_ENGINE_ID`: Search engine ID for Google Custom Search.
  - `GOOGLE_CLIENT_EMAIL`: Email from a Google Service Account for Calendar API access.
  - `GOOGLE_PRIVATE_KEY`: Private key from a Google Service Account.
  - `CALENDAR_ID`: ID of the Google Calendar to query for availability.
  - `RESEND_API_KEY`: API key for sending email notifications via Resend.

## Setup Instructions

Follow these steps to set up the Scheduling Agent:

1. **Clone the Repository**:

   ```powershell
   git clone <repository-url>
   cd scheduling-agent
   ```

2. **Select Branch** (optional):

   ```powershell
   # For MongoDB integration
   git checkout branch-two
   ```

3. **Install Dependencies**:

   ```powershell
   npm install
   ```

   - Ensures all required packages (e.g., `@genkit-ai/googleai`, `pdf.js-extract`, `axios`) are installed.

4. **Configure Environment Variables**:
   - Create a `.env` file in the root directory with the following:

     ```env
     JSON_SEARCH_API_KEY=your_api_key
     JSON_SEARCH_ENGINE_ID=your_search_engine_id
     GOOGLE_CLIENT_EMAIL=your_service_account_email
     GOOGLE_PRIVATE_KEY=your_service_account_private_key
     CALENDAR_ID=your_calendar_id
     RESEND_API_KEY=your_resend_api_key
     ```

   - **Obtaining Credentials**:
     - **Google Custom Search**: Enable the Custom Search API in Google Cloud Console to get `JSON_SEARCH_API_KEY`. Set up a Custom Search Engine to obtain `JSON_SEARCH_ENGINE_ID`.
     - **Google Calendar**: Create a service account in Google Cloud Console, download the JSON key file, and extract `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`.
     - **Resend API**: Sign up at [Resend](https://resend.com/) and generate an API key for the email service.
   - **Authentication Note**: This project uses Google Service Account authentication which provides server-to-server auth. Direct calendar additions are not possible without domain-wide delegation or user consent, which is why email notifications are used instead.

5. **MongoDB Setup** (Branch Two only):
   - Install MongoDB if not already available.
   - Add MongoDB connection string to your `.env` file:

     ```env
     MONGODB_URI=your_mongodb_connection_string
     ```

6. **Prepare the PDF File**:
   - The `indexMenu` flow indexes a PDF file located at `src/constants/7a6ab7f1-7c29-4e8b-bdfa-57b4edbef9cb.pdf` for document retrieval.
   - Place your PDF in `src/constants/` with this exact name, or modify the `file` constant in `src/utils/pdfUtils.ts` to point to your PDF's location.
   - **Purpose**: This PDF provides context for the AI's responses about scheduling and company information.

7. **Run the Application**:

   ```powershell
   npm start
   ```

   - Starts the Hono server, initializes the Genkit AI, and indexes the PDF if present.

8. **Access the Application**:
   - **Chat Endpoint**: `POST /chat` (expects a JSON body with a `prompt` field).
   - **Health Check**: `GET /`.

## Example Usage

### Chat Endpoint

Send a POST request to `/chat`:

```json
{
  "prompt": "Can you help me schedule a meeting?"
}
```

**Response**:

```json
{
  "ok": true,
  "res": "Sure! I found a great slot for a meeting tomorrow at 10:00 AM UTC. Does that work for you?"
}
```

### Booking a Meeting

- **User**: "I want to schedule a demo."
- **Assistant**: "Great! Let me check your availability. The best time is tomorrow at 10:00 AM UTC. Alternatives: 2:00 PM, 3:00 PM. Which works for you?"
- **User**: "Let's go with 10:00 AM."
- **Assistant**: "Perfect! Could you share your email address for the meeting notification?"
- **User**: "<user@example.com>"
- **Assistant**: "Thanks! A confirmation email with all the details has been sent to your inbox."

## Project Structure

```plaintext
.
├── src/
│   ├── index.ts          # Application entry point (Hono server setup)
│   ├── constants/        # Static files (e.g., PDF) and configuration constants
│   ├── flows/            # AI workflows (indexMenu, savannahAgentFlow)
│   ├── lib/              # Shared utilities (AI config, session store, calendar service)
│   ├── tools/            # Tool implementations (getUserSchedule, searchTool for both search and email)
│   ├── utils/            # Helper functions (e.g., PDF text extraction)
│   ├── models/           # MongoDB schema models (Branch Two only)
│   └── ...
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # This documentation
```

## Additional Resources

- [Resend Documentation](https://resend.com/docs): For email sending capabilities.
- [Google Service Accounts](https://cloud.google.com/iam/docs/service-accounts): Understanding server-to-server authentication.
- [Google Calendar API Scopes](https://developers.google.com/identity/protocols/oauth2/scopes#calendar): Required permissions for calendar operations.
- [MongoDB Documentation](https://www.mongodb.com/docs/): For Branch Two database integration.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
