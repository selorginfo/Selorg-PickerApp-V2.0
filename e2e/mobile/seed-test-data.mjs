/**
 * Non-prod test-data helper for Picker E2E.
 * Reports (and optionally seeds) real Mongo/API state for the automation picker.
 * Does NOT write production data; uses the configured selorg_test DB via live API.
 *
 * Usage:
 *   node e2e/mobile/seed-test-data.mjs            # report only
 *   node e2e/mobile/seed-test-data.mjs --seed-shift
 */
import { fetchPickerOtp } from "./fetch-otp.mjs";

const API_BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3333").replace(/\/$/, "");
const PICKER = `${API_BASE}/api/v1/picker`;
const PHONE = (process.env.PICKER_TEST_MOBILE || "9556686269").replace(/\D/g, "").slice(-10);
const SEED_SHIFT = process.argv.includes("--seed-shift");

async function api(method, path, { token, body, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${PICKER}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function login() {
  await api("POST", "/auth/send-otp", {
    auth: false,
    body: { phone: PHONE, preferredChannel: "sms", intent: "login" },
  });
  const otp = await fetchPickerOtp(PHONE);
  const v = await api("POST", "/auth/verify-otp", {
    auth: false,
    body: {
      phone: PHONE,
      otp,
      preferredChannel: "sms",
      intent: "login",
      workforceRole: "picker",
    },
  });
  const token = v.json?.data?.token;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(v.json)}`);
  return token;
}

async function main() {
  const token = await login();
  const report = {};

  report.profile = (await api("GET", "/user/profile", { token })).json?.data;
  report.home = (await api("GET", "/home/summary", { token })).json?.data;
  report.readiness = (await api("GET", "/shifts/readiness", { token })).json?.data;
  report.myShifts = (await api("GET", "/shifts/my", { token })).json?.data;
  report.available = (await api("GET", "/shifts/available", { token })).json?.data;
  report.device = (await api("GET", "/devices/assigned", { token })).json?.data;
  report.bank = (await api("GET", "/bank/accounts", { token })).json?.data;
  report.training = (await api("GET", "/training/progress", { token })).json?.data;
  report.prefs = (await api("GET", "/settings/preferences", { token })).json?.data;
  report.performance = (await api("GET", "/performance/summary", { token })).json?.data;

  if (SEED_SHIFT) {
    const slots = Array.isArray(report.available)
      ? report.available
      : report.available?.shifts || report.available?.items || [];
    const slot = slots[0];
    const shiftId = slot?.id || slot?._id || slot?.shiftId;
    if (!shiftId) {
      report.seedShift = { ok: false, reason: "No available shift slots to select" };
    } else {
      const sel = await api("POST", "/shifts/select", { token, body: { shiftId: String(shiftId) } });
      report.seedShift = { ok: sel.status === 200, status: sel.status, body: sel.json?.data || sel.json };
      report.readinessAfter = (await api("GET", "/shifts/readiness", { token })).json?.data;
      report.myShiftsAfter = (await api("GET", "/shifts/my", { token })).json?.data;
      report.homeAfter = (await api("GET", "/home/summary", { token })).json?.data;
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
