/**
 * Fetch latest picker OTP from MongoDB (plaintext in picker_otps for non-prod).
 * Uses selorg-service .env MONGO_URI — no separate secrets file.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = path.resolve(__dirname, "../../../selorg-service Ai");
const requireFromService = createRequire(path.join(SERVICE_ROOT, "package.json"));

function loadEnv() {
  const envPath = path.join(SERVICE_ROOT, ".env");
  if (!fs.existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPickerOtp(phone, { attempts = 4 } = {}) {
  loadEnv();
  const mongoose = requireFromService("mongoose");
  const digits = String(phone).replace(/\D/g, "").slice(-10);
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 12000,
        connectTimeoutMS: 12000,
      });
      try {
        // Prefer newest OTP; brief wait helps when send-otp just wrote the row.
        if (i > 0) await sleep(800 * i);
        // Role-scoped keys: `picker|phone|9556686269` (and legacy bare phone).
        const doc = await mongoose.connection.db.collection("picker_otps").findOne(
          {
            $or: [
              { identifier: digits },
              { identifier: `picker|phone|${digits}` },
              { identifier: { $regex: `${digits}$` } },
            ],
          },
          { sort: { updatedAt: -1 } },
        );
        if (!doc?.otp) throw new Error(`No OTP found for ${digits}`);
        return String(doc.otp);
      } finally {
        await mongoose.disconnect().catch(() => undefined);
      }
    } catch (e) {
      lastErr = e;
      await sleep(1000 * (i + 1));
    }
  }
  throw lastErr || new Error(`OTP fetch failed for ${digits}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("fetch-otp.mjs")) {
  const phone = process.argv[2] || process.env.PICKER_TEST_MOBILE || "9556686269";
  fetchPickerOtp(phone)
    .then((otp) => {
      process.stdout.write(otp);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
