export interface EmailEnv {
  RESEND_API_KEY: string;
  /** One address, or several separated by commas. */
  NOTIFY_EMAIL: string;
  /** Sender; defaults to Resend's sandbox sender, which can only deliver to
   * the Resend account's own signup address. */
  NOTIFY_FROM?: string;
}

const DEFAULT_FROM = "SEPTA Consist Logger <onboarding@resend.dev>";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function sendDailyExportEmail(
  env: EmailEnv,
  date: string,
  xlsxBytes: Uint8Array,
  tripCount: number
): Promise<void> {
  const content = toBase64(xlsxBytes);
  const recipients = env.NOTIFY_EMAIL.split(",").map((r) => r.trim()).filter(Boolean);

  // One send per recipient, so a rejected address (e.g. the sandbox sender
  // refusing a non-owner address) doesn't stop delivery to the others.
  const failures: string[] = [];
  for (const to of recipients) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.NOTIFY_FROM || DEFAULT_FROM,
        to: [to],
        subject: `SEPTA consists — ${date} (${tripCount} trips)`,
        text: `Attached: every train logged on ${date}, with car consists where observed.`,
        attachments: [
          {
            filename: `septa-consists-${date}.xlsx`,
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      failures.push(`${to}: ${response.status} ${body}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Resend send failed for ${failures.length}/${recipients.length}: ${failures.join("; ")}`);
  }
}
