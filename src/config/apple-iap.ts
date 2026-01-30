/**
 * Apple In-App Purchase (IAP) configuration and receipt verification.
 * Used for iOS subscription purchases (App Store compliance).
 */

const APPLE_VERIFY_PRODUCTION = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_VERIFY_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";

// Status 21007 = receipt is for sandbox, send to sandbox URL
const STATUS_RECEIPT_IS_SANDBOX = 21007;

export interface AppleVerifyReceiptResponse {
  status: number;
  receipt?: {
    in_app?: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date_ms?: string;
      expires_date_ms?: string;
    }>;
    bundle_id?: string;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date_ms?: string;
    expires_date_ms?: string;
  }>;
  pending_renewal_info?: Array<{
    auto_renew_product_id: string;
    auto_renew_status: string;
  }>;
}

/**
 * Verify Apple IAP receipt with Apple's verifyReceipt API.
 * Tries production first; if status 21007, retries with sandbox.
 */
export async function verifyAppleReceipt(
  receiptDataBase64: string,
  sharedSecret: string
): Promise<AppleVerifyReceiptResponse> {
  const body = {
    "receipt-data": receiptDataBase64,
    password: sharedSecret,
    "exclude-old-transactions": true,
  };

  let response = await fetch(APPLE_VERIFY_PRODUCTION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as AppleVerifyReceiptResponse;

  if (data.status === STATUS_RECEIPT_IS_SANDBOX) {
    response = await fetch(APPLE_VERIFY_SANDBOX, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as AppleVerifyReceiptResponse;
  }

  return data;
}

/**
 * Map App Store product IDs to our membership tier names.
 * Configure these to match your App Store Connect product IDs.
 */
export const APPLE_PRODUCT_TO_TIER: Record<string, string> = {
  gold: "Gold Lounge",
  platinum: "Platinum Lounge",
  diamond: "Diamond Lounge",
  "com.tan1007.privatemessage.gold_monthly": "Gold Lounge",
  "com.tan1007.privatemessage.platinum_monthly": "Platinum Lounge",
  "com.tan1007.privatemessage.diamond_monthly": "Diamond Lounge",
  "com.yourapp.gold_monthly": "Gold Lounge",
  "com.yourapp.platinum_monthly": "Platinum Lounge",
  "com.yourapp.diamond_monthly": "Diamond Lounge",
};

export function getTierFromProductId(productId: string): string | null {
  const normalized = productId.toLowerCase().replace(/[.-]/g, "_");
  if (APPLE_PRODUCT_TO_TIER[productId]) return APPLE_PRODUCT_TO_TIER[productId];
  if (normalized.includes("gold")) return "Gold Lounge";
  if (normalized.includes("platinum")) return "Platinum Lounge";
  if (normalized.includes("diamond")) return "Diamond Lounge";
  return null;
}
