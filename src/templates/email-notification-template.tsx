import * as React from "react";
import moment from "moment";
import { formatDateTime } from "../lib/helpers";

interface EmailTemplateProps {
  firstName: string;
  meetingSummary: string;
  meetingDescription?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  meetingSummary,
  meetingDescription,
  startTime,
  endTime,
}) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px" }}>
      <div
        style={{
          backgroundColor: "#663399",
          padding: "20px",
          textAlign: "center" as const,
          borderRadius: "8px 8px 0 0",
        }}
      >
        <h1 style={{ color: "white", margin: "0" }}>Your Demo is Scheduled!</h1>
      </div>

      <div
        style={{
          padding: "30px",
          backgroundColor: "#ffffff",
          borderRadius: "0 0 8px 8px",
          border: "1px solid #eaeaea",
          borderTop: "none",
        }}
      >
        <p style={{ fontSize: "18px" }}>Hi {firstName}! 👋</p>

        <p>
          Great news! Your meeting for <strong>{meetingSummary}</strong> has been confirmed.
        </p>

        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "20px",
            borderRadius: "8px",
            margin: "20px 0",
            borderLeft: "4px solid #663399",
          }}
        >
          <p style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 10px 0" }}>
            📅 {formatDateTime(startTime)}
          </p>
          <p style={{ fontSize: "14px", color: "#666", margin: "0 0 10px 0" }}>
            Duration: {moment.duration(moment(endTime).diff(moment(startTime))).asMinutes()} minutes
          </p>

          {meetingDescription && (
            <p style={{ margin: "10px 0 0 0", fontSize: "14px" }}>{meetingDescription}</p>
          )}
        </div>

        <p>
          We're looking forward to showing you how Savannah Intelligence can boost your marketing
          efforts!
        </p>

        <p style={{ marginTop: "30px" }}>
          See you soon,
          <br />
          The Savannah Intelligence Team
        </p>

        <div style={{ marginTop: "30px", fontSize: "13px", color: "#888" }}>
          <p>
            Need to reschedule? Just reply to this email and we'll find another time that works.
          </p>
        </div>
      </div>
    </div>
  );
};
