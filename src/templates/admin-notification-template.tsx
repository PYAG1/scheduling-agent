import * as React from "react";
import { formatDateTime } from "../lib/helpers";

interface AdminEmailTemplateProps {
  meetingSummary: string;
  meetingDescription?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  phoneNumber?: string;
  firstName: string;
}

export const AdminEmailTemplate: React.FC<Readonly<AdminEmailTemplateProps>> = ({
  meetingSummary,
  meetingDescription,
  startTime,
  endTime,
  attendees,
  phoneNumber,
  firstName,
}) => {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px" }}>
      <h2>New Meeting Request</h2>

      <div
        style={{
          padding: "20px",
          backgroundColor: "#f0f7ff",
          borderRadius: "5px",
          margin: "20px 0",
          border: "1px solid #cce5ff",
        }}
      >
        <h3 style={{ color: "#004085", margin: "0 0 15px 0" }}>Meeting Details</h3>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: "bold", width: "120px" }}>Summary:</td>
              <td style={{ padding: "8px 0" }}>{meetingSummary}</td>
            </tr>
            {meetingDescription && (
              <tr>
                <td style={{ padding: "8px 0", fontWeight: "bold", verticalAlign: "top" }}>
                  Description:
                </td>
                <td style={{ padding: "8px 0" }}>{meetingDescription}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "8px 0", fontWeight: "bold" }}>Start:</td>
              <td style={{ padding: "8px 0" }}>{formatDateTime(startTime)}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: "bold" }}>End:</td>
              <td style={{ padding: "8px 0" }}>{formatDateTime(endTime)}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: "bold" }}>Contact:</td>
              <td style={{ padding: "8px 0" }}>{firstName}</td>
            </tr>
            {phoneNumber && (
              <tr>
                <td style={{ padding: "8px 0", fontWeight: "bold" }}>Phone:</td>
                <td style={{ padding: "8px 0" }}>{phoneNumber}</td>
              </tr>
            )}
          </tbody>
        </table>

        {attendees && attendees.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <p style={{ fontWeight: "bold", margin: "0 0 5px 0" }}>Attendees:</p>
            <ul style={{ margin: "0", paddingLeft: "20px" }}>
              {attendees.map((email, index) => (
                <li key={index}>{email}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p>Please review and confirm this meeting request at your earliest convenience.</p>
    </div>
  );
};
