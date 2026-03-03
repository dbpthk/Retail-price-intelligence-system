import "server-only";
import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Price Alerts <onboarding@resend.dev>";

export type PriceDropEmailParams = {
  to: string;
  productTitle: string;
  oldPrice: string;
  newPrice: string;
  percentDrop: number;
  productUrl: string;
};

function buildPriceDropEmailHtml(params: PriceDropEmailParams): string {
  const { productTitle, oldPrice, newPrice, percentDrop, productUrl } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Drop Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 24px; font-size: 20px; font-weight: 600; color: #18181b;">
                Price Drop Alert
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; color: #52525b;">
                Good news — the price has dropped on a product you're watching.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #fafafa; border-radius: 6px; border: 1px solid #e4e4e7;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #71717a;">Product</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #18181b;">${escapeHtml(productTitle)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 13px; color: #71717a;">Previous price</span>
                          <span style="display: block; font-size: 18px; font-weight: 600; color: #71717a; text-decoration: line-through;">${escapeHtml(oldPrice)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <span style="font-size: 13px; color: #71717a;">New price</span>
                          <span style="display: block; font-size: 22px; font-weight: 600; color: #16a34a;">${escapeHtml(newPrice)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 13px; color: #71717a;">Savings</span>
                          <span style="display: block; font-size: 18px; font-weight: 600; color: #16a34a;">${percentDrop.toFixed(1)}% off</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <a href="${escapeHtml(productUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">View Product</a>
              <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa;">
                You're receiving this because you added this product to your watchlist.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

export async function sendPriceDropEmail(
  params: PriceDropEmailParams
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Price drop: ${params.productTitle} — ${params.percentDrop.toFixed(1)}% off`,
      html: buildPriceDropEmailHtml(params),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
