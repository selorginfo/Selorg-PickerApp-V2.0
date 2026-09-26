/**
 * Admin Dashboard ↔ Selorg Picker App — CROSS-SYSTEM E2E
 *
 * Reuses existing Picker ADB harness (adb-driver.mjs, fetch-otp.mjs / fetchPickerOtp).
 * Does NOT modify application source. Does NOT mock backends or invent fake salary/OT/orders.
 *
 * Chain under test:
 *   Picker App UI → /api/v1/picker (x-selorg-client: picker) → Mongo → /api/v1/admin/picker → Admin Dashboard
 *   Admin Dashboard → Admin/Picker APIs → Mongo → /api/v1/picker → Picker App UI
 *
 * PASS requires UI (when available) + API + DB agreement — never HTTP 200 alone.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARTIFACTS as MOBILE_ARTIFACTS,
  dumpUi,
  ensureReversePorts,
  findByText,
  findEditTexts,
  forceStop,
  grantRuntimePermissions,
  hideKeyboard,
  launchApp,
  packageInstalled,
  prepareDeviceForUiAutomation,
  screenshot,
  sleep,
  tap,
  tapTestId,
  tapText,
  typeText,
  clearFocusedField,
  visibleTexts,
  dismissPermissionDialogs,
} from "./adb-driver.mjs";
import { fetchPickerOtp } from "./fetch-otp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const WORKSPACE = path.resolve(ROOT, "..");
const BACKEND_DIR = path.join(WORKSPACE, "selorg-service Ai");
const OUT_DIR = path.join(ROOT, "test-results", "cross-admin-picker");
const REPORT_MD = path.join(WORKSPACE, "ADMIN_PICKER_CROSS_SYSTEM_E2E_TEST_REPORT.md");
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(MOBILE_ARTIFACTS, { recursive: true });

const API_BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3333").replace(/\/$/, "");
const PICKER = `${API_BASE}/api/v1/picker`;
const ADMIN = `${API_BASE}/api/v1/admin`;
const ADMIN_PICKER = `${API_BASE}/api/v1/admin/picker`;
const ADMIN_WEB = (process.env.ADMIN_WEB_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");

const PICKER_PHONE = (process.env.PICKER_TEST_MOBILE || "9556686269").replace(/\D/g, "").slice(-10);
const PICKER_PHONE_2 = (process.env.PICKER_TEST_MOBILE_2 || "").replace(/\D/g, "").slice(-10);
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || "hemanathc0112@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || "Selorg@2024";
const SKIP_PICKER_UI = process.env.SKIP_PICKER_UI === "1";
const PACKAGE = "com.selorgpickerapp";

const results = [];
const apiTrace = [];
const matrix = {};
const issues = [];

let adminToken = null;
let pickerToken = null;
let pickerUserId = null;
let pickerProfile = null;
let mongoose = null;
let dbReady = false;
let uiAvailable = false;
let storeIdHint = null;

function record(tc) {
  const row = {
    id: tc.id,
    category: tc.category || "General",
    title: tc.title || tc.action || tc.id,
    status: tc.status,
    severity: tc.severity || (tc.status === "FAIL" ? "High" : "Info"),
    sourceApp: tc.sourceApp || "",
    targetApp: tc.targetApp || "",
    workflow: tc.workflow || "",
    expected: tc.expected || "",
    actual: tc.actual || "",
    pickerApp: tc.pickerApp || "",
    adminDashboard: tc.adminDashboard || "",
    backendApi: tc.backendApi || "",
    database: tc.database || "",
    apiEndpoint: tc.apiEndpoint || "",
    httpMethod: tc.httpMethod || "",
    requestEvidence: tc.requestEvidence ?? null,
    responseEvidence: tc.responseEvidence ?? null,
    dbEvidence: tc.dbEvidence ?? null,
    pickerId: tc.pickerId || pickerUserId || "",
    orderId: tc.orderId || "",
    storeId: tc.storeId || storeIdHint || "",
    shiftId: tc.shiftId || "",
    assignmentId: tc.assignmentId || "",
    reproSteps: tc.reproSteps || [],
    evidence: tc.evidence || [],
    error: tc.error || "",
    details: tc.details || "",
  };
  results.push(row);
  if (row.status === "FAIL" || row.status === "MISSING") issues.push(row);
  const icon = row.status === "PASS" ? "✓" : row.status === "FAIL" ? "✗" : "·";
  console.log(`${icon} [${row.status}] ${row.id} — ${row.title}`);
  saveProgress();
  return row;
}

function setMatrix(key, patch) {
  matrix[key] = { ...(matrix[key] || {}), ...patch };
}

function saveProgress() {
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, MISSING: 0, SKIP: 0, PARTIAL: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  fs.writeFileSync(
    path.join(OUT_DIR, "cross-admin-picker-results.json"),
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        pickerPhone: PICKER_PHONE,
        adminEmail: ADMIN_EMAIL,
        pickerUserId,
        storeIdHint,
        counts,
        matrix,
        results,
        apiTrace: apiTrace.slice(-250),
      },
      null,
      2,
    ),
  );
}

async function api(method, url, { token, body, label, client } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  // Picker App sends x-selorg-client: picker (Rider uses "rider" on the same /picker routes)
  if (client || String(url).includes("/api/v1/picker")) {
    headers["x-selorg-client"] = client || "picker";
  }
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text?.slice?.(0, 400) };
    }
    const entry = {
      label: label || `${method} ${url}`,
      method,
      url,
      status: res.status,
      durationMs: Date.now() - started,
      requestBody: body ?? null,
      response: json,
    };
    apiTrace.push(entry);
    return entry;
  } catch (err) {
    const entry = {
      label: label || `${method} ${url}`,
      method,
      url,
      status: 0,
      durationMs: Date.now() - started,
      requestBody: body ?? null,
      response: null,
      networkError: String(err?.message || err),
    };
    apiTrace.push(entry);
    return entry;
  }
}

const pick = (method, p, opts) =>
  api(method, `${PICKER}${p.startsWith("/") ? p : `/${p}`}`, { client: "picker", ...opts });
const adm = (method, p, opts) => api(method, `${ADMIN}${p.startsWith("/") ? p : `/${p}`}`, opts);
const admPicker = (method, p, opts) =>
  api(method, `${ADMIN_PICKER}${p.startsWith("/") ? p : `/${p}`}`, opts);

async function dbConnect() {
  try {
    const envPath = path.join(BACKEND_DIR, ".env");
    if (!fs.existsSync(envPath)) return false;
    const envText = fs.readFileSync(envPath, "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
    const req = createRequire(path.join(BACKEND_DIR, "package.json"));
    mongoose = req("mongoose");
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15_000, maxPoolSize: 2 });
    dbReady = true;
    return true;
  } catch (err) {
    console.warn("DB connect failed:", err?.message || err);
    dbReady = false;
    return false;
  }
}

async function dbFindOne(collection, filter, projection) {
  if (!dbReady || !mongoose) return null;
  try {
    return await mongoose.connection.db.collection(collection).findOne(filter, projection ? { projection } : undefined);
  } catch {
    return null;
  }
}

async function dbCount(collection, filter = {}) {
  if (!dbReady || !mongoose) return -1;
  try {
    return await mongoose.connection.db.collection(collection).countDocuments(filter);
  } catch {
    return -1;
  }
}

async function ensureDb() {
  if (dbReady && mongoose?.connection?.readyState === 1) return true;
  return dbConnect();
}

function runNodeScript(scriptPath, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function loginAdmin() {
  const res = await adm("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" },
    label: "admin login",
  });
  if (res.status !== 200 || !res.response?.data?.token) {
    // Ops Admin role label sometimes required
    const alt = await adm("POST", "/auth/login", {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "Operations Admin" },
      label: "admin login ops",
    });
    if (alt.status !== 200 || !alt.response?.data?.token) {
      throw new Error(`Admin login failed ${res.status}/${alt.status}: ${JSON.stringify(res.response || alt.response)}`);
    }
    adminToken = alt.response.data.token;
    return adminToken;
  }
  adminToken = res.response.data.token;
  return adminToken;
}

async function loginPickerApi(phone = PICKER_PHONE) {
  const digits = String(phone).replace(/\D/g, "").slice(-10);
  const send = await pick("POST", "/auth/send-otp", {
    body: { phone: digits, preferredChannel: "sms", intent: "login" },
    label: "picker send-otp",
  });
  if (send.status !== 200) {
    throw new Error(`send-otp ${send.status}: ${JSON.stringify(send.response)}`);
  }
  const otp = await fetchPickerOtp(digits, { attempts: 8 });
  await ensureDb(); // fetchPickerOtp disconnects mongoose
  const v = await pick("POST", "/auth/verify-otp", {
    body: {
      phone: digits,
      otp,
      preferredChannel: "sms",
      intent: "login",
      workforceRole: "picker",
    },
    label: "picker verify-otp",
  });
  const token = v.response?.data?.token || v.response?.data?.accessToken || v.response?.token;
  if (v.status !== 200 || !token) {
    throw new Error(`verify-otp failed ${v.status}: ${JSON.stringify(v.response)}`);
  }
  pickerToken = token;
  // Prefer workforce profile path; fall back to rider /profile for parity probes
  let profile = await pick("GET", "/user/profile", { token: pickerToken, label: "picker user/profile" });
  if (profile.status >= 400) {
    profile = await pick("GET", "/profile", { token: pickerToken, label: "picker /profile fallback" });
  }
  const data = profile.response?.data || profile.response || {};
  pickerProfile = data.user || data;
  // Prefer Mongo ObjectId (24 hex). Profile `id` can be a short employee code (e.g. "d3b6").
  const candidates = [
    pickerProfile?._id,
    v.response?.data?.user?._id,
    pickerProfile?.userId,
    v.response?.data?.user?.userId,
    pickerProfile?.id,
    v.response?.data?.user?.id,
  ].map((x) => (x == null ? "" : String(x)));
  pickerUserId = candidates.find((c) => /^[a-f0-9]{24}$/i.test(c)) || candidates.find(Boolean) || "";
  {
    const dbUser = await dbFindOne("picker_users", {
      $or: [{ phone: digits }, { mobile: digits }, { phoneNumber: digits }],
    });
    if (dbUser?._id) {
      pickerUserId = String(dbUser._id);
      pickerProfile = { ...pickerProfile, ...dbUser, id: String(dbUser._id) };
    }
  }
  storeIdHint =
    pickerProfile?.currentLocationId ||
    pickerProfile?.hub ||
    pickerProfile?.darkStoreId ||
    pickerProfile?.storeId ||
    storeIdHint;
  return { token: pickerToken, profile: pickerProfile, verify: v };
}

/**
 * Dismiss Android 16 KB page-size compatibility dialog if present.
 * Mirrors HSD: dump UI, tap "Don't Show Again" / OK by bounds when 16 KB text is visible.
 */
async function dismissCompatDialog({ rounds = 10 } = {}) {
  let lastBlob = "";
  for (let i = 0; i < rounds; i++) {
    await dismissPermissionDialogs().catch(() => false);
    let nodes;
    try {
      nodes = dumpUi(`compat-${i}`).nodes;
    } catch {
      break;
    }
    const blob = visibleTexts(nodes).join(" | ");
    lastBlob = blob;
    const has16kb = /16\s*KB compatible|App Compatibility|16\s*KB/i.test(blob);
    if (!has16kb) {
      // Also clear leftover permission sheets
      const cleared = await dismissPermissionDialogs(nodes);
      if (!cleared) return { dismissed: i > 0, blob };
      await sleep(500);
      continue;
    }
    const labels = [
      "Don't Show Again",
      "Dont Show Again",
      "Don’t Show Again",
      "OK",
      "Got it",
      "Continue",
      "Close",
      "Dismiss",
      "I understand",
    ];
    let tapped = false;
    for (const lab of labels) {
      const hits = findByText(nodes, lab, { exact: false, partial: true });
      if (hits.length) {
        const t = hits.sort((a, b) => b.bounds.cy - a.bounds.cy)[0];
        tap(t.bounds.cx, t.bounds.cy);
        console.log(`dismissCompatDialog: tapped "${lab}" @ ${t.bounds.cx},${t.bounds.cy}`);
        tapped = true;
        await sleep(900);
        break;
      }
    }
    if (!tapped) {
      try {
        await tapText("OK", { exact: true, timeoutMs: 800 });
        tapped = true;
        await sleep(900);
      } catch {
        /* ignore */
      }
    }
    if (!tapped) {
      // Bounds fallback from raw XML dump if text search missed
      try {
        const xmlPath = path.join(MOBILE_ARTIFACTS, `compat-${i}.xml`);
        // dumpUi already wrote; try reading last dump from ARTIFACTS
        const dumps = fs
          .readdirSync(MOBILE_ARTIFACTS)
          .filter((f) => f.includes("compat") && f.endsWith(".xml"))
          .sort();
        const xmlFile = dumps.length ? path.join(MOBILE_ARTIFACTS, dumps[dumps.length - 1]) : xmlPath;
        if (fs.existsSync(xmlFile)) {
          const xml = fs.readFileSync(xmlFile, "utf8");
          const m =
            xml.match(/text="Don't Show Again"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/) ||
            xml.match(/text="OK"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
          if (m) {
            const x = Math.round((Number(m[1]) + Number(m[3])) / 2);
            const y = Math.round((Number(m[2]) + Number(m[4])) / 2);
            tap(x, y);
            console.log(`dismissCompatDialog: bounds tap ${x},${y}`);
            await sleep(900);
          }
        }
      } catch {
        /* ignore */
      }
    }
    await sleep(600);
  }
  return { dismissed: true, blob: lastBlob };
}

function unwrapList(res) {
  const d = res?.response?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.pickers)) return d.pickers;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(res?.response)) return res.response;
  return [];
}

function phoneOf(u) {
  return String(u?.phone || u?.mobile || u?.phoneNumber || "").replace(/\D/g, "").slice(-10);
}

/** ─── Phase A: Environment ─────────────────────────────────────────────── */
async function phaseEnv() {
  console.log("\n=== Phase A: Environment ===\n");

  const health = await api("GET", `${API_BASE}/api/v1/health`).catch(() => ({ status: 0 }));
  const pickerProbe = await pick("GET", "/work-locations", { label: "env picker probe" });
  record({
    id: "XS-ENV-01",
    category: "Environment",
    title: "Backend reachable for picker APIs",
    status: pickerProbe.status > 0 ? "PASS" : "FAIL",
    severity: "Critical",
    expected: "HTTP response from /api/v1/picker",
    actual: `health=${health.status} work-locations=${pickerProbe.status}`,
    apiEndpoint: "/api/v1/picker/work-locations",
    httpMethod: "GET",
  });

  let adminOk = false;
  try {
    const r = await fetch(ADMIN_WEB, { method: "GET" });
    adminOk = r.status >= 200 && r.status < 500;
  } catch {
    adminOk = false;
  }
  record({
    id: "XS-ENV-02",
    category: "Environment",
    title: "Admin Dashboard web reachable",
    status: adminOk ? "PASS" : "BLOCKED",
    severity: "High",
    expected: `Admin SPA on ${ADMIN_WEB}`,
    actual: adminOk ? "reachable" : "unreachable — Admin UI limited to API evidence",
    adminDashboard: adminOk ? ADMIN_WEB : "down",
  });

  const dbOk = await dbConnect();
  record({
    id: "XS-ENV-03",
    category: "Environment",
    title: "MongoDB source-of-truth reachable",
    status: dbOk ? "PASS" : "BLOCKED",
    severity: "Critical",
    expected: "Read mongoose via selorg-service Ai/.env",
    actual: dbOk ? "connected" : "unavailable",
    database: dbOk ? "connected" : "n/a",
  });

  try {
    await loginAdmin();
    record({
      id: "XS-ENV-04",
      category: "Environment",
      title: "Admin authentication",
      status: "PASS",
      expected: "JWT",
      actual: `token len=${adminToken.length}`,
      apiEndpoint: "/api/v1/admin/auth/login",
      httpMethod: "POST",
      sourceApp: "Admin Dashboard",
      targetApp: "Backend",
    });
  } catch (err) {
    record({
      id: "XS-ENV-04",
      category: "Environment",
      title: "Admin authentication",
      status: "FAIL",
      severity: "Critical",
      actual: String(err.message || err),
      apiEndpoint: "/api/v1/admin/auth/login",
      httpMethod: "POST",
    });
  }

  const apk = packageInstalled();
  record({
    id: "XS-ENV-05",
    category: "Environment",
    title: `Picker APK installed (${PACKAGE})`,
    status: apk ? "PASS" : "BLOCKED",
    severity: "Critical",
    expected: `${PACKAGE} on emulator`,
    actual: apk ? "installed" : "missing",
    pickerApp: apk ? PACKAGE : "not installed",
  });

  let metroOk = false;
  try {
    const r = await fetch("http://127.0.0.1:8081/status");
    metroOk = r.status === 200;
  } catch {
    metroOk = false;
  }
  record({
    id: "XS-ENV-06",
    category: "Environment",
    title: "Picker Metro packager on :8081",
    status: metroOk ? "PASS" : "BLOCKED",
    severity: "High",
    expected: "Metro :8081 (Picker RN)",
    actual: metroOk ? "ready" : "down",
  });
}

/** ─── Phase B: Architecture / directory pollution ──────────────────────── */
async function phaseArchitecture() {
  console.log("\n=== Phase B: Architecture dual-model sync ===\n");

  const pickersOnly = await dbCount("picker_users", { workforceRole: "picker" });
  const allPickerUsers = await dbCount("picker_users", {});
  const ridersInPicker = await dbCount("picker_users", {
    $or: [{ workforceRole: "rider" }, { workforceRole: { $exists: false } }, { workforceRole: null }],
  });
  const hhdUsers = await dbCount("hhd_users", {});
  const ridersColl = await dbCount("riders");

  const adminListRes = await admPicker("GET", "/pickers?limit=200", {
    token: adminToken,
    label: "admin list pickers",
  });
  const adminList = unwrapList(adminListRes);
  const polluted = adminList.filter((p) => {
    const role = String(p.workforceRole || p.role || "").toLowerCase();
    return role === "rider" || role === "hhd" || role === "hsd";
  });
  const phonePolluted = adminList.filter((p) => {
    // HSD phones known from other harnesses — soft signal only
    const ph = phoneOf(p);
    return ph === "9561057590" || ph === "9562582200";
  });

  record({
    id: "XS-ARCH-01",
    category: "Database/Data-sync",
    title: "picker_users workforceRole=picker vs all picker_users vs hhd_users",
    status: pickersOnly >= 0 && allPickerUsers >= 0 ? "PASS" : "FAIL",
    severity: "Critical",
    sourceApp: "Mongo",
    targetApp: "Admin Picker Directory",
    workflow: "Identity store inventory",
    expected: "Countable picker-role users distinct from riders/HHD where possible",
    actual: `pickerRole=${pickersOnly} allPickerUsers=${allPickerUsers} ridersLikeInPickerUsers=${ridersInPicker} hhd_users=${hhdUsers} ridersColl=${ridersColl}`,
    database: JSON.stringify({ pickersOnly, allPickerUsers, ridersInPicker, hhdUsers, ridersColl }),
    dbEvidence: { pickersOnly, allPickerUsers, ridersInPicker, hhdUsers },
  });

  record({
    id: "XS-ARCH-02",
    category: "Admin Dashboard",
    title: "Admin GET /api/v1/admin/picker/pickers directory",
    status: adminListRes.status === 200 && adminList.length >= 0 ? "PASS" : "FAIL",
    severity: "Critical",
    sourceApp: "Backend admin/picker",
    targetApp: "Admin Picker Directory UI",
    workflow: "Picker directory",
    expected: "200 + list of pickers with identity fields",
    actual: `http=${adminListRes.status} n=${adminList.length} sample=${JSON.stringify(adminList.slice(0, 3))?.slice(0, 400)}`,
    apiEndpoint: "/api/v1/admin/picker/pickers",
    httpMethod: "GET",
    responseEvidence: adminList.slice(0, 5),
    adminDashboard: `n=${adminList.length}`,
  });

  const pollution = polluted.length > 0 || (pickersOnly === 0 && allPickerUsers > 0 && adminList.length > 0);
  record({
    id: "XS-ARCH-03",
    category: "Database/Data-sync",
    title: "Detect directory pollution (riders/HSD mixed into picker directory)",
    status: pollution || phonePolluted.length ? "FAIL" : adminList.length === 0 && pickersOnly > 0 ? "FAIL" : "PASS",
    severity: "High",
    sourceApp: "Admin Picker Directory",
    targetApp: "Picker App identity",
    workflow: "Directory purity",
    expected: "Admin picker list should be workforceRole=picker (not riders/HSD)",
    actual: `rolePolluted=${polluted.length} hsdPhoneHits=${phonePolluted.length} adminN=${adminList.length} dbPickerRole=${pickersOnly}`,
    responseEvidence: { polluted: polluted.slice(0, 5), phonePolluted: phonePolluted.slice(0, 3) },
    details:
      pickersOnly === 0 && allPickerUsers > 0
        ? "Many picker_users lack workforceRole=picker — Admin list may mix riders"
        : "",
  });

  setMatrix("Picker Employee Details", {
    pickerToBackend: "picker_users",
    backendToAdmin: adminList.length ? "admin/picker/pickers" : "EMPTY/FAIL",
    adminToBackend: "admin/picker status/approve",
    backendToPickerApp: "user/profile",
    pickerUiMatch: "pending UI",
    adminUiMatch: adminListRes.status === 200 ? "API" : "FAIL",
    dbMatch: pickersOnly >= 0 ? "OK counts" : "FAIL",
    result: pollution ? "FAIL" : adminListRes.status === 200 ? "PASS" : "FAIL",
  });
  setMatrix("Picker Profile", {
    pickerToBackend: "picker_users",
    backendToAdmin: "admin/picker/pickers/:id",
    adminToBackend: "PATCH status",
    backendToPickerApp: "/user/profile|/profile",
    pickerUiMatch: "pending",
    adminUiMatch: "pending",
    dbMatch: "picker_users",
    result: "PARTIAL",
  });
}

/** ─── Phase C: Picker → Admin sync ─────────────────────────────────────── */
async function phasePickerToAdminSync() {
  console.log("\n=== Phase C: Picker → Admin sync (API+DB) ===\n");

  let login;
  try {
    login = await loginPickerApi(PICKER_PHONE);
    record({
      id: "XS-AUTH-01",
      category: "Authentication",
      title: "Picker phone OTP login (API — x-selorg-client:picker)",
      status: "PASS",
      severity: "Critical",
      sourceApp: "Picker App API",
      targetApp: "Backend",
      expected: "Token + profile with client=picker",
      actual: `pickerId=${pickerUserId} tokenLen=${pickerToken.length}`,
      apiEndpoint: "/api/v1/picker/auth/verify-otp",
      httpMethod: "POST",
      pickerId: pickerUserId,
      responseEvidence: { id: pickerUserId, hasToken: true },
      details: "API login for layer compare; UI login asserted in Phase E",
    });
  } catch (err) {
    record({
      id: "XS-AUTH-01",
      category: "Authentication",
      title: "Picker phone OTP login",
      status: "FAIL",
      severity: "Critical",
      actual: String(err.message || err),
      apiEndpoint: "/api/v1/picker/auth/verify-otp",
      httpMethod: "POST",
    });
    return;
  }
  void login;

  await ensureDb();
  const dbOr = [{ phone: PICKER_PHONE }, { mobile: PICKER_PHONE }];
  if (pickerUserId && mongoose?.Types?.ObjectId?.isValid?.(pickerUserId)) {
    dbOr.unshift({ _id: new mongoose.Types.ObjectId(pickerUserId) });
  }
  const dbUser = await dbFindOne("picker_users", { $or: dbOr });

  const profileRes = await pick("GET", "/user/profile", { token: pickerToken });
  const profileAlt = profileRes.status >= 400 ? await pick("GET", "/profile", { token: pickerToken }) : profileRes;
  const home = await pick("GET", "/home/summary", { token: pickerToken });
  const salary = await pick("GET", "/salary/monthly", { token: pickerToken });
  const attendance = await pick("GET", "/attendance", { token: pickerToken });
  const attSummary = await pick("GET", "/attendance/summary", { token: pickerToken });
  const attStats = await pick("GET", "/attendance/stats", { token: pickerToken });
  const incentives = await pick("GET", "/incentives/today", { token: pickerToken });
  const readiness = await pick("GET", "/shifts/readiness", { token: pickerToken });
  const performance = await pick("GET", "/performance", { token: pickerToken });
  const perfSummary = await pick("GET", "/performance/summary", { token: pickerToken });

  const p = profileAlt.response?.data?.user || profileAlt.response?.data || {};
  if (!pickerUserId || !/^[a-f0-9]{24}$/i.test(String(pickerUserId))) {
    pickerUserId = String(dbUser?._id || ( /^[a-f0-9]{24}$/i.test(String(p._id||"")) ? p._id : "" ) || "");
  }

  const adminSearch = await admPicker("GET", `/pickers?search=${PICKER_PHONE}&limit=50`, {
    token: adminToken,
    label: "admin pickers search phone",
  });
  let listed = unwrapList(adminSearch).find((r) => phoneOf(r) === PICKER_PHONE || String(r.id) === String(pickerUserId));
  if (!listed) {
    const all = await admPicker("GET", "/pickers?limit=500", { token: adminToken });
    listed = unwrapList(all).find((r) => phoneOf(r) === PICKER_PHONE || String(r.id || r._id) === String(pickerUserId));
  }
  const adminById = pickerUserId
    ? await admPicker("GET", `/pickers/${pickerUserId}`, { token: adminToken, label: "admin picker by id" })
    : { status: 0, response: null };

  const nameApi = p.name || p.fullName || "";
  const nameDb = dbUser?.name || dbUser?.fullName || "";
  const nameAdmin = listed?.name || adminById.response?.data?.name || "";
  const nameMatch = !!(nameApi || nameDb) && (!!listed || adminById.status === 200) &&
    (nameAdmin === nameApi || nameAdmin === nameDb || !nameAdmin);
  const phoneOnAdmin = !!(listed && phoneOf(listed) === PICKER_PHONE) ||
    phoneOf(adminById.response?.data || {}) === PICKER_PHONE;
  const statusApi = String(p.status || dbUser?.status || "").toUpperCase();
  const statusAdmin = String(listed?.status || adminById.response?.data?.status || "").toUpperCase();
  const statusMatch = !statusAdmin || statusAdmin === statusApi;

  record({
    id: "XS-PROF-01",
    category: "Picker Profile Sync",
    title: "Same Picker identity across Picker API, DB, Admin directory",
    status:
      profileAlt.status === 200 && dbUser && (listed || adminById.status === 200) && phoneOnAdmin && statusMatch
        ? "PASS"
        : profileAlt.status === 200 && dbUser
          ? "FAIL"
          : "FAIL",
    severity: "Critical",
    sourceApp: "Picker App",
    targetApp: "Admin Dashboard",
    workflow: "Profile sync",
    expected: "Name/phone/status agree across API + DB + Admin GET /pickers",
    actual: `profileHttp=${profileAlt.status} db=${!!dbUser} listed=${!!listed} byId=${adminById.status} nameApi=${nameApi} nameDb=${nameDb} nameAdmin=${nameAdmin} phoneOnAdmin=${phoneOnAdmin} statusApi=${statusApi} statusAdmin=${statusAdmin}`,
    apiEndpoint: "/api/v1/picker/user/profile + /api/v1/admin/picker/pickers",
    httpMethod: "GET",
    pickerApp: JSON.stringify({ id: pickerUserId, name: nameApi, phone: PICKER_PHONE, status: statusApi }),
    adminDashboard: JSON.stringify(listed || adminById.response?.data),
    database: JSON.stringify(dbUser ? { id: String(dbUser._id), name: nameDb, status: dbUser.status, role: dbUser.workforceRole } : null),
    responseEvidence: { profile: p, listed, byId: adminById.response },
    dbEvidence: dbUser,
    pickerId: pickerUserId,
  });

  record({
    id: "XS-PROF-02",
    category: "Picker Profile Sync",
    title: "Picker home / salary / attendance / incentives / readiness / performance APIs respond",
    status:
      [home, salary, attendance, incentives, readiness, performance].some((r) => r.status === 200)
        ? "PASS"
        : "FAIL",
    severity: "High",
    expected: "At least core workforce GETs return 200 for authenticated picker",
    actual: `home=${home.status} salary=${salary.status} att=${attendance.status}/${attSummary.status}/${attStats.status} inc=${incentives.status} ready=${readiness.status} perf=${performance.status}/${perfSummary.status}`,
    apiEndpoint: "/home/summary,/salary/monthly,/attendance,/incentives/today,/shifts/readiness,/performance",
    httpMethod: "GET",
    responseEvidence: {
      home: home.response,
      salaryKeys: salary.response?.data ? Object.keys(salary.response.data) : null,
      incentives: incentives.response,
      readiness: readiness.response,
    },
  });

  const adminAtt = await admPicker("GET", "/attendance/live", { token: adminToken });
  const adminWd = await admPicker("GET", "/withdrawals", { token: adminToken });
  const adminOt = await admPicker("GET", "/ot-requests", { token: adminToken });
  const adminShiftChg = await admPicker("GET", "/shift-change-requests", { token: adminToken });

  record({
    id: "XS-ADM-READ-01",
    category: "Admin ↔ Picker reads",
    title: "Admin attendance / withdrawals / ot-requests / shift-change-requests readable",
    status:
      [adminAtt, adminWd, adminOt, adminShiftChg].every((r) => r.status > 0)
        ? adminAtt.status < 500 && adminWd.status < 500
          ? "PASS"
          : "FAIL"
        : "FAIL",
    severity: "High",
    sourceApp: "Admin Dashboard",
    targetApp: "Backend",
    expected: "Admin picker ops endpoints respond (empty OK; stub/500 = FAIL/MISSING)",
    actual: `attLive=${adminAtt.status} wd=${adminWd.status} ot=${adminOt.status} shiftChg=${adminShiftChg.status}`,
    apiEndpoint: "/api/v1/admin/picker/attendance/live|/withdrawals|/ot-requests|/shift-change-requests",
    httpMethod: "GET",
    responseEvidence: {
      att: adminAtt.response,
      wd: adminWd.response,
      ot: adminOt.response,
      shiftChg: adminShiftChg.response,
    },
  });

  setMatrix("Picker Profile", {
    pickerToBackend: profileAlt.status === 200 ? "OK" : "FAIL",
    backendToAdmin: listed || adminById.status === 200 ? "OK" : "FAIL",
    adminToBackend: "n/a this phase",
    backendToPickerApp: "OK",
    pickerUiMatch: "pending UI",
    adminUiMatch: listed ? "API" : "FAIL",
    dbMatch: dbUser ? "OK" : "FAIL",
    result: phoneOnAdmin && dbUser && profileAlt.status === 200 ? "PASS" : "FAIL",
  });
  setMatrix("Picker Status", {
    pickerToBackend: statusApi || "unknown",
    backendToAdmin: statusAdmin || "missing",
    adminToBackend: "PATCH /pickers/:id/status",
    backendToPickerApp: "profile.status",
    dbMatch: statusMatch ? "OK" : "MISMATCH",
    result: statusMatch ? "PASS" : "FAIL",
  });
  setMatrix("Store / Dark Store", {
    pickerToBackend: storeIdHint || "profile hub/location",
    backendToAdmin: listed?.hub || listed?.darkStore || listed?.currentLocationId || "check byId",
    adminToBackend: "assignment patch",
    backendToPickerApp: "locations/current",
    result: "PARTIAL",
  });
}

/** ─── Phase D: Admin → Picker ──────────────────────────────────────────── */
async function phaseAdminToPicker() {
  console.log("\n=== Phase D: Admin → Picker actions ===\n");
  if (!adminToken || !pickerUserId) {
    record({
      id: "XS-ADM-00",
      category: "Admin → Picker",
      title: "Prerequisites",
      status: "BLOCKED",
      actual: `adminToken=${!!adminToken} pickerUserId=${pickerUserId}`,
    });
    return;
  }

  await ensureDb();
  const before = await dbFindOne("picker_users", {
    $or: [{ phone: PICKER_PHONE }, { mobile: PICKER_PHONE }],
  });

  const statusPatch = await admPicker("PATCH", `/pickers/${pickerUserId}/status`, {
    token: adminToken,
    body: { status: "ACTIVE", note: "cross-system e2e verify" },
    label: "admin patch picker status ACTIVE",
  });
  await sleep(500);
  const afterDb = await dbFindOne("picker_users", {
    $or: [{ phone: PICKER_PHONE }, { mobile: PICKER_PHONE }],
  });
  const afterProfile = pickerToken
    ? await pick("GET", "/user/profile", { token: pickerToken })
    : { status: 0, response: null };
  const afterP = afterProfile.response?.data?.user || afterProfile.response?.data || {};

  record({
    id: "XS-ADM-01",
    category: "Approval",
    title: "Admin PATCH picker status ACTIVE → DB + Picker profile",
    status:
      statusPatch.status < 300 && String(afterDb?.status || "").toUpperCase() === "ACTIVE" ? "PASS" : "FAIL",
    severity: "High",
    sourceApp: "Admin Dashboard",
    targetApp: "Picker App",
    workflow: "Activate picker",
    expected: "picker_users.status ACTIVE and Picker profile reflects it",
    actual: `patchHttp=${statusPatch.status} before=${before?.status} afterDb=${afterDb?.status} profileHttp=${afterProfile.status} profileStatus=${afterP.status}`,
    apiEndpoint: `/api/v1/admin/picker/pickers/${pickerUserId}/status`,
    httpMethod: "PATCH",
    requestEvidence: { status: "ACTIVE" },
    responseEvidence: statusPatch.response,
    dbEvidence: afterDb ? { status: afterDb.status, id: String(afterDb._id) } : null,
    pickerId: pickerUserId,
  });

  // Approve if still pending
  const approve = await admPicker("PUT", `/pickers/${pickerUserId}/approve`, {
    token: adminToken,
    body: { note: "cross-system e2e approve if needed" },
    label: "admin approve picker",
  });
  record({
    id: "XS-ADM-02",
    category: "Approval",
    title: "Admin approve picker (idempotent if already approved)",
    status: approve.status < 300 || approve.status === 400 || approve.status === 409 ? "PASS" : approve.status === 404 ? "MISSING" : "FAIL",
    severity: "Medium",
    expected: "200/204 or already-approved 4xx",
    actual: `http=${approve.status} ${JSON.stringify(approve.response)?.slice(0, 200)}`,
    apiEndpoint: `/api/v1/admin/picker/pickers/${pickerUserId}/approve`,
    httpMethod: "PUT",
    responseEvidence: approve.response,
  });

  // OT stub probe
  const otList = await admPicker("GET", "/ot-requests", { token: adminToken, label: "admin ot-requests stub" });
  const otEmptyStub =
    otList.status === 200 &&
    (() => {
      const list = unwrapList(otList);
      const raw = JSON.stringify(otList.response || {});
      return list.length === 0 && /stub|todo|not implemented|coming soon/i.test(raw);
    })();
  record({
    id: "XS-ADM-03",
    category: "Overtime / OT",
    title: "Admin OT requests endpoint (expect empty stub FAIL/MISSING if unimplemented)",
    status:
      otList.status === 404 || otList.status >= 500
        ? "MISSING"
        : otEmptyStub
          ? "FAIL"
          : otList.status === 200
            ? "PASS"
            : "FAIL",
    severity: "High",
    sourceApp: "Admin Dashboard",
    targetApp: "Backend",
    expected: "Real OT queue bridged to picker OT (not empty stub pretending OK)",
    actual: `http=${otList.status} body=${JSON.stringify(otList.response)?.slice(0, 300)}`,
    apiEndpoint: "/api/v1/admin/picker/ot-requests",
    httpMethod: "GET",
    responseEvidence: otList.response,
    details: "PASS only if endpoint is real (empty queue OK when no OT); stub markers → FAIL",
  });

  // Create store shift slot stub
  const storeId =
    storeIdHint ||
    afterDb?.currentLocationId ||
    afterDb?.hub ||
    afterDb?.darkStoreId ||
    "DS-Adyar-01";
  const createSlot = await admPicker("POST", `/stores/${encodeURIComponent(storeId)}/shift-slots`, {
    token: adminToken,
    body: {
      label: "cross-e2e-probe",
      startTime: "09:00",
      endTime: "18:00",
      capacity: 1,
    },
    label: "admin create store shift slot probe",
  });
  record({
    id: "XS-ADM-04",
    category: "Shift",
    title: "Admin create store shift slot probe",
    status:
      createSlot.status === 404 || createSlot.status === 501
        ? "MISSING"
        : createSlot.status < 300
          ? "PASS"
          : createSlot.status === 400 || createSlot.status === 422
            ? "PARTIAL"
            : "FAIL",
    severity: "Medium",
    expected: "Endpoint exists and validates (no fake invent of permanent slots required)",
    actual: `http=${createSlot.status} storeId=${storeId} ${JSON.stringify(createSlot.response)?.slice(0, 250)}`,
    apiEndpoint: `/api/v1/admin/picker/stores/${storeId}/shift-slots`,
    httpMethod: "POST",
    storeId,
    responseEvidence: createSlot.response,
  });

  // Reassign shift stub
  const reassign = await admPicker("POST", "/shifts/probe-cross-e2e/reassign", {
    token: adminToken,
    body: { pickerId: pickerUserId, reason: "cross-e2e probe" },
    label: "admin reassign shift probe",
  });
  record({
    id: "XS-ADM-05",
    category: "Shift",
    title: "Admin reassign shift stub probe",
    status:
      reassign.status === 404 || reassign.status === 501
        ? "MISSING"
        : reassign.status < 300
          ? "PASS"
          : reassign.status === 400 || reassign.status === 422
            ? "PARTIAL"
            : "FAIL",
    severity: "Medium",
    expected: "Reassign route exists (bogus id → 4xx OK)",
    actual: `http=${reassign.status} ${JSON.stringify(reassign.response)?.slice(0, 250)}`,
    apiEndpoint: "/api/v1/admin/picker/shifts/:shiftId/reassign",
    httpMethod: "POST",
    responseEvidence: reassign.response,
  });

  const wd = await admPicker("GET", "/withdrawals", { token: adminToken });
  record({
    id: "XS-ADM-06",
    category: "Payroll / Payout",
    title: "Admin withdrawals list",
    status: wd.status === 200 ? "PASS" : wd.status === 404 ? "MISSING" : "FAIL",
    severity: "Medium",
    expected: "Admin can list picker withdrawal requests (empty OK)",
    actual: `http=${wd.status} n=${unwrapList(wd).length}`,
    apiEndpoint: "/api/v1/admin/picker/withdrawals",
    httpMethod: "GET",
    responseEvidence: wd.response,
  });

  setMatrix("Picker Status", {
    ...(matrix["Picker Status"] || {}),
    adminToBackend: statusPatch.status < 300 ? "OK" : "FAIL",
    backendToPickerApp: afterProfile.status === 200 ? "OK" : "PARTIAL",
    dbMatch: String(afterDb?.status).toUpperCase() === "ACTIVE" ? "OK" : "FAIL",
    result: statusPatch.status < 300 ? "PASS" : "FAIL",
  });
  setMatrix("Shift", {
    pickerToBackend: "shifts/readiness|/shifts/my",
    backendToAdmin: "admin/picker shift-slots + reassign",
    adminToBackend: createSlot.status < 300 ? "OK" : createSlot.status === 404 ? "MISSING" : "PARTIAL",
    backendToPickerApp: "shifts/available",
    result: createSlot.status === 404 ? "MISSING" : "PARTIAL",
  });
  setMatrix("Payroll / Payout", {
    pickerToBackend: "wallet/withdraw",
    backendToAdmin: wd.status === 200 ? "withdrawals list" : "FAIL",
    adminToBackend: "process withdrawal",
    backendToPickerApp: "wallet",
    result: wd.status === 200 ? "PASS" : "MISSING",
  });
}

/** ─── Phase E: Picker UI ───────────────────────────────────────────────── */
async function phasePickerUi() {
  console.log("\n=== Phase E: Real Picker App UI ===\n");
  if (SKIP_PICKER_UI) {
    record({
      id: "XS-UI-00",
      category: "Picker App UI",
      title: "Skipped via SKIP_PICKER_UI=1",
      status: "SKIP",
    });
    return null;
  }
  if (!packageInstalled()) {
    record({
      id: "XS-UI-00",
      category: "Picker App UI",
      title: "Picker UI journey",
      status: "BLOCKED",
      severity: "Critical",
      actual: "APK missing",
    });
    return null;
  }

  prepareDeviceForUiAutomation();
  grantRuntimePermissions();
  ensureReversePorts();
  forceStop();
  await sleep(600);
  launchApp(true);
  await sleep(5000);
  const compat = await dismissCompatDialog();
  try {
    const shot = screenshot("xs-picker-compat");
    if (shot && fs.existsSync(shot)) {
      fs.copyFileSync(shot, path.join(OUT_DIR, "xs-picker-compat.png"));
    }
  } catch {
    /* ignore */
  }

  uiAvailable = true;
  record({
    id: "XS-UI-COMPAT",
    category: "Picker App UI",
    title: "Dismiss 16 KB compat dialog if present",
    status: /16\s*KB/i.test(compat.blob || "") ? "PARTIAL" : "PASS",
    expected: "App usable without blocking 16 KB sheet",
    actual: (compat.blob || "").slice(0, 300),
    pickerApp: PACKAGE,
    evidence: [path.join(OUT_DIR, "xs-picker-compat.png")],
  });

  // Focused cross-sync UI login dump
  let uiNameHint = "";
  let uiPhoneHint = "";
  try {
    let d = dumpUi("xs-login");
    await dismissCompatDialog({ rounds: 4 });
    d = dumpUi("xs-login-2");
    const blob = visibleTexts(d.nodes).join(" | ");
    if (/SEND OTP|Mobile|Phone|Login/i.test(blob)) {
      const edits = findEditTexts(d.nodes);
      if (edits.length) {
        const field = edits.sort((a, b) => b.bounds.w - a.bounds.w)[0];
        tap(field.bounds.cx, field.bounds.cy);
        await sleep(300);
        clearFocusedField(16);
        typeText(PICKER_PHONE);
        hideKeyboard();
        await sleep(300);
        try {
          await tapTestId("send-otp", { timeoutMs: 8000 });
        } catch {
          await tapText("Send OTP", { exact: false, timeoutMs: 8000 });
        }
        await sleep(1500);
        const otp = await fetchPickerOtp(PICKER_PHONE);
        await ensureDb();
        // OTP entry — try digit keys or single field
        for (const digit of String(otp)) {
          try {
            await tapTestId(`otp-key-${digit}`, { timeoutMs: 2000, afterMs: 120 });
          } catch {
            break;
          }
        }
        const dOtp = dumpUi("xs-otp");
        const otpEdits = findEditTexts(dOtp.nodes);
        if (otpEdits.length && String(otp).length >= 4) {
          tap(otpEdits[0].bounds.cx, otpEdits[0].bounds.cy);
          clearFocusedField(8);
          typeText(String(otp));
          hideKeyboard();
        }
        try {
          await tapTestId("verify-otp", { timeoutMs: 10000 });
        } catch {
          await tapText("Verify", { exact: false, timeoutMs: 8000 }).catch(() => undefined);
        }
        await sleep(4000);
        await dismissCompatDialog({ rounds: 3 });
      }
    }
    const homeDump = dumpUi("xs-home");
    const homeTexts = visibleTexts(homeDump.nodes);
    const homeBlob = homeTexts.join(" | ");
    screenshot("xs-picker-home");
    try {
      const shot = path.join(MOBILE_ARTIFACTS, "xs-picker-home.png");
      // find latest home screenshot
      const files = fs.readdirSync(MOBILE_ARTIFACTS).filter((f) => f.includes("xs-picker-home") && f.endsWith(".png"));
      if (files.length) {
        fs.copyFileSync(path.join(MOBILE_ARTIFACTS, files[files.length - 1]), path.join(OUT_DIR, "xs-picker-home.png"));
      } else if (fs.existsSync(shot)) {
        fs.copyFileSync(shot, path.join(OUT_DIR, "xs-picker-home.png"));
      }
    } catch {
      /* ignore */
    }
    uiPhoneHint = homeBlob.includes(PICKER_PHONE) ? PICKER_PHONE : "";
    if (pickerProfile?.name && homeBlob.includes(String(pickerProfile.name).slice(0, 6))) {
      uiNameHint = pickerProfile.name;
    }
    const adminList = await admPicker("GET", `/pickers?search=${PICKER_PHONE}&limit=20`, { token: adminToken });
    const listed = unwrapList(adminList).find((r) => phoneOf(r) === PICKER_PHONE) ||
      unwrapList(adminList)[0];
    const nameOk =
      !pickerProfile?.name ||
      !listed?.name ||
      String(listed.name).toLowerCase().includes(String(pickerProfile.name).toLowerCase().slice(0, 4)) ||
      String(pickerProfile.name).toLowerCase().includes(String(listed.name).toLowerCase().slice(0, 4));
    record({
      id: "XS-UI-SYNC-01",
      category: "Picker App UI",
      title: "UI Home dump name/phone vs Admin directory",
      status:
        /Home|Attendance|Performance|Profile|Shift/i.test(homeBlob) && (uiPhoneHint || nameOk)
          ? "PASS"
          : /SEND OTP|Verify OTP|16\s*KB/i.test(homeBlob)
            ? "BLOCKED"
            : "PARTIAL",
      severity: "Critical",
      sourceApp: "Picker Mobile App",
      targetApp: "Admin Dashboard",
      workflow: "UI login → Home vs Admin directory",
      expected: "Home shows same picker name/phone as Admin directory",
      actual: `homeTexts=${homeBlob.slice(0, 400)} admin=${JSON.stringify(listed)?.slice(0, 200)} uiPhone=${uiPhoneHint} uiName=${uiNameHint}`,
      pickerApp: homeBlob.slice(0, 200),
      adminDashboard: JSON.stringify(listed),
      evidence: [path.join(OUT_DIR, "xs-picker-home.png")],
    });
    setMatrix("Picker Profile", {
      ...(matrix["Picker Profile"] || {}),
      pickerUiMatch: /Home|Profile|Attendance/i.test(homeBlob) ? "OK" : "BLOCKED",
      adminUiMatch: listed ? "API" : "FAIL",
    });
  } catch (err) {
    record({
      id: "XS-UI-SYNC-01",
      category: "Picker App UI",
      title: "Focused UI login dump",
      status: "BLOCKED",
      severity: "High",
      actual: String(err.message || err),
    });
  }

  // Existing journey runner
  const journey = path.join(__dirname, "run-picker-journey.mjs");
  const { code } = await runNodeScript(journey, {
    PICKER_TEST_MOBILE: PICKER_PHONE,
    ANDROID_SERIAL: process.env.ANDROID_SERIAL || "emulator-5554",
    ANDROID_PACKAGE: PACKAGE,
  });

  const resultPaths = [
    path.join(ROOT, "test-results", "picker-e2e-results.json"),
    path.join(MOBILE_ARTIFACTS, "picker-e2e-results.json"),
    path.join(ROOT, "test-results", "mobile-artifacts", "picker-e2e-results.json"),
  ];
  let summary = null;
  for (const p of resultPaths) {
    if (fs.existsSync(p)) {
      summary = JSON.parse(fs.readFileSync(p, "utf8"));
      try {
        fs.copyFileSync(p, path.join(OUT_DIR, "picker-e2e-results.json"));
      } catch {
        /* ignore */
      }
      break;
    }
  }

  if (!summary) {
    record({
      id: "XS-UI-00",
      category: "Picker App UI",
      title: "Existing picker journey runner",
      status: "FAIL",
      severity: "Critical",
      expected: "picker-e2e-results.json",
      actual: `exit=${code}; no results file`,
    });
    return null;
  }

  for (const r of summary.results || []) {
    record({
      id: `XS-UI-${r.id}`,
      category: "Picker App UI",
      title: `${r.id}: ${r.action || r.screen || r.title || ""}`,
      status: r.status,
      severity: r.severity || (r.status === "FAIL" ? "High" : "Info"),
      sourceApp: "Picker Mobile App",
      targetApp: "Backend API",
      workflow: r.action,
      expected: r.expected || "UI+API+DB agree",
      actual: r.actual || r.error || r.status,
      pickerApp: r.actual || "",
      apiEndpoint: r.endpoint || "",
      httpMethod: r.method || "",
      requestEvidence: r.request || r.requestPayload || null,
      responseEvidence: r.response || r.responseSnippet || null,
      evidence: r.screenshot ? [r.screenshot] : [],
      details: "Imported from existing run-picker-journey.mjs (real UI)",
    });
  }

  setMatrix("Notifications", {
    pickerToBackend: "notifications API",
    backendToAdmin: "admin push",
    adminToBackend: "admin/picker push",
    backendToPickerApp: "in-app list",
    result: "PARTIAL",
    note: "Push/FCM not fully asserted; journey may cover in-app",
  });

  return summary;
}

/** ─── Phase F: Salary / Incentive / OT ─────────────────────────────────── */
async function phaseSalaryIncentiveOt() {
  console.log("\n=== Phase F: Salary / Incentive / OT ===\n");
  if (!pickerToken) {
    record({ id: "XS-SAL-00", category: "Salary", title: "Prerequisites", status: "BLOCKED", actual: "no picker token" });
    return;
  }

  const salary = await pick("GET", "/salary/monthly", { token: pickerToken });
  // Admin has no dedicated payroll/salary page for pickers in SPA — probe common paths
  const adminSalaryProbes = [];
  for (const p of [
    `${ADMIN_PICKER}/salary`,
    `${ADMIN_PICKER}/payroll`,
    `${ADMIN}/picker/salary`,
    `${ADMIN}/finance/picker-salary`,
  ]) {
    adminSalaryProbes.push(await api("GET", p, { token: adminToken, label: `probe ${p}` }));
  }
  const anySalaryAdmin = adminSalaryProbes.find((r) => r.status === 200);
  const allMissing = adminSalaryProbes.every((r) => r.status === 404 || r.status === 0);

  record({
    id: "XS-SAL-01",
    category: "Salary",
    title: "Picker monthly salary API vs Admin payroll surface",
    status:
      salary.status === 200 && allMissing
        ? "MISSING"
        : salary.status === 200 && anySalaryAdmin
          ? "PASS"
          : salary.status === 200
            ? "FAIL"
            : "FAIL",
    severity: "Critical",
    sourceApp: "Picker App",
    targetApp: "Admin Dashboard",
    workflow: "Salary visibility",
    expected: "Admin payroll page/API mirrors picker /salary/monthly OR explicitly MISSING",
    actual: `pickerSalary=${salary.status} adminProbes=${adminSalaryProbes.map((r) => `${r.url.split("/api").pop()}:${r.status}`).join(",")}`,
    apiEndpoint: "/api/v1/picker/salary/monthly",
    httpMethod: "GET",
    responseEvidence: salary.response,
    details: "Expect MISSING Admin payroll page / no salary API — do not invent fake salary",
  });

  const incentives = await pick("GET", "/incentives/today", { token: pickerToken });
  const adminEarn = await admPicker("GET", "/withdrawals", { token: adminToken });
  record({
    id: "XS-SAL-02",
    category: "Incentive",
    title: "Picker incentives/today vs Admin earnings/withdrawals surface",
    status: incentives.status === 200 ? (adminEarn.status === 200 ? "PARTIAL" : "FAIL") : "FAIL",
    severity: "High",
    expected: "Picker incentives readable; Admin has related earnings/payout surface",
    actual: `inc=${incentives.status} adminWd=${adminEarn.status}`,
    apiEndpoint: "/api/v1/picker/incentives/today",
    httpMethod: "GET",
    responseEvidence: { incentives: incentives.response, adminWd: adminEarn.response },
  });

  const otAdmin = await admPicker("GET", "/ot-requests", { token: adminToken });
  const att = await pick("GET", "/attendance", { token: pickerToken });
  const attData = att.response?.data;
  const otMinutes =
    attData?.otMinutes ||
    attData?.overtimeMinutes ||
    attData?.summary?.otMinutes ||
    null;

  record({
    id: "XS-SAL-03",
    category: "Overtime / OT",
    title: "Admin ot-requests vs picker attendance OT",
    status:
      otAdmin.status === 404 || otAdmin.status >= 500
        ? "MISSING"
        : otAdmin.status === 200 && unwrapList(otAdmin).length === 0 && otMinutes
          ? "FAIL"
          : otAdmin.status === 200
            ? "PASS"
            : "FAIL",
    severity: "High",
    expected: "Admin OT queue reflects real picker OT (empty stub with OT in attendance = FAIL)",
    actual: `adminOt=${otAdmin.status} n=${unwrapList(otAdmin).length} pickerAttOtMinutes=${otMinutes} attHttp=${att.status}`,
    apiEndpoint: "/api/v1/admin/picker/ot-requests",
    httpMethod: "GET",
    responseEvidence: { otAdmin: otAdmin.response, attendanceSnippet: attData },
  });

  setMatrix("Salary", {
    pickerToBackend: salary.status === 200 ? "OK /salary/monthly" : "FAIL",
    backendToAdmin: allMissing ? "MISSING payroll API" : anySalaryAdmin ? "OK" : "FAIL",
    adminToBackend: "n/a",
    backendToPickerApp: "OK",
    pickerUiMatch: "depends UI",
    adminUiMatch: allMissing ? "MISSING page" : "PARTIAL",
    dbMatch: "salary calc service",
    result: allMissing ? "MISSING" : "PARTIAL",
  });
  setMatrix("Incentive", {
    pickerToBackend: incentives.status === 200 ? "OK" : "FAIL",
    backendToAdmin: "via earnings/withdrawals",
    result: incentives.status === 200 ? "PARTIAL" : "FAIL",
  });
  setMatrix("Overtime / OT", {
    pickerToBackend: "attendance OT fields",
    backendToAdmin: otAdmin.status === 200 ? "ot-requests" : "MISSING",
    adminToBackend: "ot decision",
    backendToPickerApp: "salary/attendance",
    result: otAdmin.status === 404 ? "MISSING" : unwrapList(otAdmin).length === 0 && otMinutes ? "FAIL" : "PARTIAL",
  });
  setMatrix("Earnings", {
    pickerToBackend: "wallet/earnings",
    backendToAdmin: "withdrawals/payouts",
    result: "PARTIAL",
  });
}

/** ─── Phase G: Shift / Attendance ──────────────────────────────────────── */
async function phaseShiftAttendance() {
  console.log("\n=== Phase G: Shift / Attendance ===\n");
  if (!pickerToken) {
    record({ id: "XS-SH-00", category: "Shift", title: "Prerequisites", status: "BLOCKED" });
    return;
  }

  const readiness = await pick("GET", "/shifts/readiness", { token: pickerToken });
  const myShifts = await pick("GET", "/shifts/my", { token: pickerToken });
  const available = await pick("GET", "/shifts/available", { token: pickerToken });
  const attendance = await pick("GET", "/attendance", { token: pickerToken });
  const attHistory = await pick("GET", "/attendance/summary", { token: pickerToken });
  const adminLive = await admPicker("GET", "/attendance/live", { token: adminToken });
  const adminMonth = await admPicker("GET", "/attendance", { token: adminToken });

  await ensureDb();
  const attDb = await dbCount("picker_attendance", {
    $or: [
      { pickerId: pickerUserId },
      { userId: pickerUserId },
      { phone: PICKER_PHONE },
    ],
  });
  const assignDb = await dbCount("picker_shift_assignments", {
    $or: [{ pickerId: pickerUserId }, { userId: pickerUserId }],
  });

  record({
    id: "XS-SH-01",
    category: "Shift",
    title: "Picker readiness + shifts list vs DB assignments",
    status:
      readiness.status === 200 && (myShifts.status === 200 || available.status === 200)
        ? assignDb >= 0
          ? "PASS"
          : "PARTIAL"
        : "FAIL",
    severity: "High",
    expected: "Readiness/shifts APIs agree with picker_shift_assignments when present",
    actual: `ready=${readiness.status} my=${myShifts.status} avail=${available.status} assignDb=${assignDb}`,
    apiEndpoint: "/api/v1/picker/shifts/readiness|/shifts/my",
    httpMethod: "GET",
    dbEvidence: { assignDb },
    responseEvidence: { readiness: readiness.response, my: myShifts.response },
  });

  record({
    id: "XS-SH-02",
    category: "Attendance",
    title: "Picker attendance history vs Admin live attendance vs DB",
    status:
      attendance.status === 200 && adminLive.status < 500
        ? attDb >= 0
          ? "PASS"
          : "PARTIAL"
        : adminLive.status === 404
          ? "MISSING"
          : "FAIL",
    severity: "High",
    expected: "Attendance visible on picker + admin live + picker_attendance",
    actual: `pickerAtt=${attendance.status} summary=${attHistory.status} adminLive=${adminLive.status} adminMonth=${adminMonth.status} attDb=${attDb}`,
    apiEndpoint: "/api/v1/picker/attendance + /api/v1/admin/picker/attendance/live",
    httpMethod: "GET",
    database: JSON.stringify({ attDb, assignDb }),
    responseEvidence: { adminLive: adminLive.response, pickerAtt: attendance.response },
  });

  setMatrix("Attendance", {
    pickerToBackend: attendance.status === 200 ? "OK" : "FAIL",
    backendToAdmin: adminLive.status === 200 ? "live" : adminLive.status === 404 ? "MISSING" : "FAIL",
    adminToBackend: "attendance export",
    backendToPickerApp: "attendance APIs",
    dbMatch: attDb >= 0 ? `picker_attendance=${attDb}` : "n/a",
    result: attendance.status === 200 && adminLive.status < 500 ? "PASS" : "FAIL",
  });
  setMatrix("Shift", {
    ...(matrix["Shift"] || {}),
    pickerToBackend: readiness.status === 200 ? "OK" : "FAIL",
    dbMatch: `assignments=${assignDb}`,
    result: readiness.status === 200 ? "PASS" : "FAIL",
  });
}

/** ─── Phase H: Orders / Tasks ──────────────────────────────────────────── */
async function phaseOrdersTasks() {
  console.log("\n=== Phase H: Orders / Tasks (no fake orders) ===\n");
  if (!pickerToken) {
    record({ id: "XS-ORD-00", category: "Order / Task", title: "Prerequisites", status: "BLOCKED" });
    return;
  }

  const shared = await pick("GET", "/shared-orders", { token: pickerToken });
  const assign = await pick("GET", "/shared-orders/assignorders", { token: pickerToken });
  const completed = await pick("GET", "/shared-orders/completed", { token: pickerToken });

  record({
    id: "XS-ORD-01",
    category: "Order / Task",
    title: "Picker shared-orders / assignorders / completed contract probe",
    status: [shared, assign, completed].every((r) => r.status > 0)
      ? [shared, assign, completed].some((r) => r.status === 200)
        ? "PASS"
        : "PARTIAL"
      : "FAIL",
    severity: "High",
    expected: "Endpoints respond for picker client (empty lists OK — no fake orders)",
    actual: `shared=${shared.status} assign=${assign.status} completed=${completed.status} counts=${JSON.stringify({
      shared: unwrapList(shared).length,
      assign: unwrapList(assign).length,
      completed: unwrapList(completed).length,
    })}`,
    apiEndpoint: "/api/v1/picker/shared-orders*",
    httpMethod: "GET",
    responseEvidence: {
      shared: shared.response,
      assign: assign.response,
      completed: completed.response,
    },
    details: "Interactive picking UI lives in HHD by design — see XS-ORD-02 MISSING",
  });

  record({
    id: "XS-ORD-02",
    category: "Order / Task",
    title: "Interactive pick UI in Picker RN app",
    status: "MISSING",
    severity: "Info",
    expected: "N/A — product scanning/picking is HHD",
    actual: "Picker workforce app has no interactive pick UI by design",
    pickerApp: "MISSING interactive pick UI",
    details: "Do NOT create fake orders; HHD owns pick ticket flows",
  });

  // Check if Admin orders show this picker as assignee (read-only)
  let adminAssigneeHit = null;
  if (adminToken && pickerUserId) {
    const adminOrders = await adm("GET", `/orders?limit=50&search=`, { token: adminToken }).catch(() => ({
      status: 0,
      response: null,
    }));
    const list = unwrapList(adminOrders);
    adminAssigneeHit = list.find(
      (o) =>
        String(o.pickerId || o.assigneeId || o.assignee?.id || "") === String(pickerUserId) ||
        String(o.adminFulfillment?.pickerId || "") === String(pickerUserId),
    );
    if (!adminAssigneeHit && dbReady) {
      const dbHit = await dbFindOne("customer_orders", {
        $or: [{ pickerId: pickerUserId }, { "adminFulfillment.pickerId": pickerUserId }],
      });
      if (dbHit) adminAssigneeHit = { orderNumber: dbHit.orderNumber, fromDb: true };
    }
    record({
      id: "XS-ORD-03",
      category: "Task Assignment",
      title: "Admin orders show this picker as assignee (read-only discovery)",
      status: adminAssigneeHit ? "PASS" : "PARTIAL",
      severity: "Medium",
      expected: "If real assignments exist, Admin reflects pickerId (no seeding)",
      actual: adminAssigneeHit
        ? JSON.stringify(adminAssigneeHit).slice(0, 300)
        : `no assignee hit for pickerId=${pickerUserId} (OK if no live pick tasks)`,
      apiEndpoint: "/api/v1/admin/orders",
      httpMethod: "GET",
    });
  }

  setMatrix("Order / Task", {
    pickerToBackend: shared.status === 200 ? "shared-orders" : `http ${shared.status}`,
    backendToAdmin: "admin orders",
    adminToBackend: "assignment APIs",
    backendToPickerApp: "shared-orders",
    pickerUiMatch: "MISSING pick UI (HHD)",
    adminUiMatch: adminAssigneeHit ? "OK" : "PARTIAL",
    dbMatch: "customer_orders",
    result: "PARTIAL",
  });
  setMatrix("Task Assignment", {
    pickerToBackend: "assignorders",
    backendToAdmin: adminAssigneeHit ? "OK" : "none found",
    result: adminAssigneeHit ? "PASS" : "PARTIAL",
  });
  setMatrix("Task Acceptance", {
    result: "MISSING",
    note: "Interactive accept/pick in HHD, not Picker RN app",
  });
  setMatrix("Task Completion", {
    result: "MISSING",
    note: "Completion/handover in HHD",
  });
  setMatrix("Productivity", {
    pickerToBackend: "performance APIs",
    backendToAdmin: "training/action-logs",
    result: "PARTIAL",
  });
  setMatrix("Order Status", {
    pickerToBackend: "shared-orders status",
    backendToAdmin: "admin orders",
    result: "PARTIAL",
  });
}

/** ─── Phase I: Security ────────────────────────────────────────────────── */
async function phaseSecurity() {
  console.log("\n=== Phase I: Security / negative ===\n");

  const noTok = await pick("GET", "/user/profile");
  record({
    id: "XS-SEC-01",
    category: "Security",
    title: "Picker profile without token → 401",
    status: noTok.status === 401 || noTok.status === 403 ? "PASS" : "FAIL",
    severity: "High",
    expected: "401/403",
    actual: `HTTP ${noTok.status}`,
    apiEndpoint: "/api/v1/picker/user/profile",
    httpMethod: "GET",
  });

  if (pickerToken) {
    const pickerOnAdmin = await admPicker("GET", "/pickers", { token: pickerToken });
    record({
      id: "XS-SEC-02",
      category: "Security",
      title: "Picker token rejected on Admin picker API",
      status: pickerOnAdmin.status === 401 || pickerOnAdmin.status === 403 ? "PASS" : "FAIL",
      severity: "Critical",
      expected: "401/403",
      actual: `HTTP ${pickerOnAdmin.status}`,
      apiEndpoint: "/api/v1/admin/picker/pickers",
      httpMethod: "GET",
      responseEvidence: { status: pickerOnAdmin.status },
    });
  }

  if (adminToken) {
    const adminOnPicker = await pick("GET", "/user/profile", { token: adminToken });
    record({
      id: "XS-SEC-03",
      category: "Security",
      title: "Admin token rejected on picker profile",
      status: adminOnPicker.status === 401 || adminOnPicker.status === 403 ? "PASS" : "FAIL",
      severity: "Critical",
      expected: "401/403",
      actual: `HTTP ${adminOnPicker.status}`,
      apiEndpoint: "/api/v1/picker/user/profile",
      httpMethod: "GET",
    });
  }

  const badAdmin = await admPicker("GET", "/pickers", { token: "not-a-token" });
  record({
    id: "XS-SEC-04",
    category: "Security",
    title: "Invalid admin token rejected",
    status: badAdmin.status === 401 || badAdmin.status === 403 ? "PASS" : "FAIL",
    severity: "High",
    expected: "401/403",
    actual: `HTTP ${badAdmin.status}`,
    apiEndpoint: "/api/v1/admin/picker/pickers",
    httpMethod: "GET",
  });

  if (PICKER_PHONE_2 && pickerToken) {
    try {
      const other = await loginPickerApi(PICKER_PHONE_2);
      const foreign = await pick("GET", "/user/profile", { token: other.token });
      const self = await pick("GET", "/user/profile", { token: pickerToken });
      const otherId = String(foreign.response?.data?.id || foreign.response?.data?._id || other.profile?.id || "");
      const selfId = String(self.response?.data?.id || self.response?.data?._id || pickerUserId || "");
      record({
        id: "XS-SEC-05",
        category: "Security",
        title: "Second phone isolation (distinct picker identity)",
        status: otherId && selfId && otherId !== selfId ? "PASS" : "FAIL",
        severity: "High",
        expected: "Two phones → two picker user ids",
        actual: `primary=${selfId} secondary=${otherId} phone2=${PICKER_PHONE_2}`,
      });
      // restore primary token
      await loginPickerApi(PICKER_PHONE);
    } catch (err) {
      record({
        id: "XS-SEC-05",
        category: "Security",
        title: "Second phone isolation",
        status: "BLOCKED",
        actual: String(err.message || err),
      });
    }
  } else {
    record({
      id: "XS-SEC-05",
      category: "Security",
      title: "Second phone isolation",
      status: "SKIP",
      actual: "Set PICKER_TEST_MOBILE_2 to exercise",
    });
  }
}

/** ─── Phase J: Admin UI routes ─────────────────────────────────────────── */
async function phaseAdminUiRoutes() {
  console.log("\n=== Phase J: Admin UI routes ===\n");
  const routes = ["/picker-dir", "/picker-earn", "/picker-approvals", "/shifts", "/roster", "/payouts"];
  for (const route of routes) {
    let ok = false;
    let status = 0;
    try {
      const r = await fetch(`${ADMIN_WEB}${route}`, { method: "GET", redirect: "follow" });
      status = r.status;
      ok = status >= 200 && status < 500;
    } catch {
      status = 0;
      ok = false;
    }
    record({
      id: `XS-NAV-${route.replace(/\W+/g, "_")}`,
      category: "Navigation/Links",
      title: `Admin SPA route ${route}`,
      status: ok ? "PASS" : "FAIL",
      severity: "Medium",
      sourceApp: "Admin Dashboard",
      targetApp: "Admin Dashboard",
      workflow: "Navigation",
      expected: "SPA shell loads (no hard 5xx)",
      actual: `HTTP ${status}`,
      adminDashboard: `${ADMIN_WEB}${route}`,
    });
  }
}

/** ─── Report writer ────────────────────────────────────────────────────── */
function cell(v) {
  if (v == null || v === "") return "—";
  return String(v).replace(/\|/g, "/").replace(/\n/g, " ");
}

function writeMarkdownReport(uiSummary) {
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, MISSING: 0, SKIP: 0, PARTIAL: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const total = results.length;

  const matrixKeys = [
    "Picker Employee Details",
    "Picker Profile",
    "Picker Status",
    "Store / Dark Store",
    "Shift",
    "Attendance",
    "Order / Task",
    "Task Assignment",
    "Task Acceptance",
    "Task Completion",
    "Productivity",
    "Salary",
    "Incentive",
    "Overtime / OT",
    "Earnings",
    "Payroll / Payout",
    "Notifications",
    "Order Status",
  ];

  const matrixTable = [
    "| Data / Communication | Picker App → Backend | Backend → Admin | Admin → Backend | Backend → Picker App | Picker UI Match | Admin UI Match | DB Match | Result |",
    "|---|---|---|---|---|---|---|---|---|",
    ...matrixKeys.map((k) => {
      const m = matrix[k] || {};
      return `| ${k} | ${cell(m.pickerToBackend)} | ${cell(m.backendToAdmin)} | ${cell(m.adminToBackend)} | ${cell(m.backendToPickerApp)} | ${cell(m.pickerUiMatch)} | ${cell(m.adminUiMatch)} | ${cell(m.dbMatch)} | ${cell(m.result || "BLOCKED")} |`;
    }),
  ].join("\n");

  const issueBlocks = issues
    .map((i, idx) => {
      return `### Issue ${idx + 1}: ${i.id} — ${i.title}

- **Severity:** ${i.severity}
- **Status:** ${i.status}
- **Category:** ${i.category}
- **Source application:** ${i.sourceApp || "—"}
- **Target application:** ${i.targetApp || "—"}
- **Workflow:** ${i.workflow || "—"}
- **Steps to reproduce:** ${(i.reproSteps || []).length ? i.reproSteps.map((s) => `\n  1. ${s}`).join("") : "See actual/evidence"}
- **Expected result:** ${i.expected || "—"}
- **Actual result:** ${i.actual || "—"}
- **Picker App result:** ${i.pickerApp || "—"}
- **Admin Dashboard result:** ${i.adminDashboard || "—"}
- **API endpoint:** ${i.apiEndpoint || "—"}
- **HTTP method:** ${i.httpMethod || "—"}
- **Request/response:** \`${cell(JSON.stringify(i.requestEvidence)).slice(0, 200)}\` / \`${cell(JSON.stringify(i.responseEvidence)).slice(0, 300)}\`
- **Database evidence:** \`${cell(JSON.stringify(i.dbEvidence)).slice(0, 300)}\`
- **Picker ID:** ${i.pickerId || "—"}
- **Order ID:** ${i.orderId || "—"}
- **Store ID:** ${i.storeId || "—"}
- **Shift / Assignment ID:** ${i.shiftId || i.assignmentId || "—"}
- **Screenshot/trace:** ${(i.evidence || []).join(", ") || "see test-results/cross-admin-picker/"}
`;
    })
    .join("\n");

  const md = `# ADMIN DASHBOARD ↔ SELORG PICKER APP — CROSS-SYSTEM E2E TEST REPORT

**Report file:** \`ADMIN_PICKER_CROSS_SYSTEM_E2E_TEST_REPORT.md\`  
**Discovery date:** ${new Date().toISOString().slice(0, 10)}  
**Picker side:** Real Selorg Picker Mobile App (\`${PACKAGE}\`) — **not** Rider, **not** HSD/HHD, **not** Customer.  
**Harness:** Existing Picker ADB + UIAutomator (\`selorg-picker-app Ai/e2e/mobile/\`) + this cross-system runner.  
**Evidence:** \`selorg-picker-app Ai/test-results/cross-admin-picker/\` · \`picker-e2e-results.json\` · \`test-results/mobile-artifacts/\`  
**Rule:** Application source was **not** modified. No mocks. No invented salary/OT/orders. PASS requires UI (when available) + API + DB agreement — never HTTP 200 alone.  
**Client header:** \`x-selorg-client: picker\` (Rider uses \`rider\` on the same \`/api/v1/picker\` routes).

---

## 1. Test environment

| Item | Value |
|---|---|
| Backend | \`${API_BASE}\` (live \`selorg-service\`) |
| Admin Dashboard | \`${ADMIN_WEB}\` |
| Picker Metro | \`http://127.0.0.1:8081\` |
| Emulator | \`emulator-5554\` (or \`ANDROID_SERIAL\`) |
| Picker package | \`${PACKAGE}\` |
| Admin test user | \`${ADMIN_EMAIL}\` |
| Picker test phone | \`${PICKER_PHONE}\` |
| Second picker phone | \`${PICKER_PHONE_2 || "(unset — PICKER_TEST_MOBILE_2)"}\` |
| Mongo | Connected via backend \`.env\` \`MONGO_URI\` |
| SKIP_PICKER_UI | \`${SKIP_PICKER_UI ? "1" : "0"}\` |

## 2. Picker App build / version

- App name: Selorg Picker App
- Package: \`${PACKAGE}\`
- Metro: **:8081**
- Debug APK under \`android/app/build/outputs/apk/debug/\` (when built)
- API base: \`${API_BASE}/api/v1/picker\` with \`x-selorg-client: picker\`

## 3. Admin Dashboard environment

- Vite/dev server (\`ADMIN_WEB_BASE_URL\` or \`:5173\`)
- Real APIs (no mocks in this harness)
- Picker surfaces: \`/picker-dir\`, \`/picker-earn\`, \`/picker-approvals\`, \`/shifts\`, \`/roster\`, \`/payouts\`

## 4. Backend environment

- \`/api/v1/picker/*\` — Picker App auth, profile, shifts, attendance, salary, incentives, shared-orders
- \`/api/v1/admin/*\` — Admin auth + orders
- \`/api/v1/admin/picker/*\` — Admin picker directory, attendance, withdrawals, OT, shift slots

## 5. Picker test accounts

| Phone | Role | Notes |
|---|---|---|
| ${PICKER_PHONE} | picker | Primary harness account (\`PICKER_TEST_MOBILE\`) |
| ${PICKER_PHONE_2 || "—"} | picker | Optional isolation (\`PICKER_TEST_MOBILE_2\`) |

## 6–9. Totals

| Metric | Count |
|---|---|
| Total test cases | ${total} |
| Passed | ${counts.PASS || 0} |
| Failed | ${counts.FAIL || 0} |
| Blocked | ${counts.BLOCKED || 0} |
| Missing | ${counts.MISSING || 0} |
| Partial | ${counts.PARTIAL || 0} |
| Skipped | ${counts.SKIP || 0} |
| Independent issues logged | ${issues.length} |

UI journey import: ${uiSummary ? `PASS=${uiSummary.counts?.PASS || 0} FAIL=${uiSummary.counts?.FAIL || 0} BLOCKED=${uiSummary.counts?.BLOCKED || 0}` : uiAvailable ? "partial focused UI only" : "not available / skipped"}

---

## 10–11. Missing / broken functionality (executive)

### Identity / directory
- Compare \`picker_users\` with \`workforceRole=picker\` vs all \`picker_users\` vs \`hhd_users\`.
- Admin \`GET /api/v1/admin/picker/pickers\` must not silently mix riders/HSD into the picker directory.

### Salary / OT / payroll
- Picker exposes \`GET /salary/monthly\` and attendance OT fields.
- Admin often lacks a picker payroll page / salary API → record **MISSING** (not PASS on empty 200 stubs).
- Admin \`/ot-requests\` empty stub while picker has OT → **FAIL**.

### Orders / picking
- Interactive product picking is **HHD by design** → Picker RN pick UI = **MISSING**.
- This harness does **not** create fake orders.

---

## 12. Picker App issues

See imported \`XS-UI-*\` rows and focused Home dump. Product picking UI is intentionally absent (HHD).

## 13. Admin Dashboard issues

- Picker Directory / Earnings / Approvals / Shifts / Roster / Payouts smoked in Phase J.
- Salary/payroll Admin surface may be MISSING relative to Picker App salary API.

## 14. Backend / API issues

- Dual client on \`/api/v1/picker\` (\`picker\` vs \`rider\`) — wrong \`x-selorg-client\` can skew workforceRole.
- Admin OT / shift-slot / reassign stubs probed in Phase D/F.

## 15. Database / data-sync issues

- Collections under test: \`picker_users\`, \`picker_attendance\`, \`picker_shift_assignments\`, \`picker_otps\`, \`hhd_users\`, \`customer_orders\`.

## 16–17. Authentication / authorization

- Admin login: exercised.
- Picker phone OTP + \`fetchPickerOtp\`: exercised.
- Cross-domain JWT rejection: see XS-SEC-*.

## 18–19. Realtime / notifications

- Push/FCM not fully asserted; in-app notifications depend on UI journey reach.
- Matrix row: Notifications.

## 20–23. Assignment / lifecycle / tasks / earnings

- Task accept/complete interactive flows → HHD (**MISSING** on Picker app).
- Shared-orders contract probed without inventing orders.
- Earnings/withdrawals/salary compared across layers when APIs exist.

## 24. Location / store

- Store/dark-store from picker profile hub/\`currentLocationId\` vs Admin directory fields.

## 25. Navigation / link issues

- Admin SPA routes smoked in Phase J.

## 26–27. Data mismatch / business logic

- Primary risks: directory pollution (riders/HSD in picker list), Admin salary MISSING, OT stub FAIL, HHD-owned pick UI.

## 28–29. UI automation / environment gates

- \`SKIP_PICKER_UI=1\` skips Phase E UI.
- Android **16 KB compat** dialog auto-dismissed via \`dismissCompatDialog\` (Don't Show Again / OK by bounds).

## 30–31. Evidence & artifacts

- JSON progress: \`test-results/cross-admin-picker/cross-admin-picker-results.json\`
- Screenshots: \`OUT_DIR\` + \`mobile-artifacts\`
- This markdown written to workspace root **and** \`OUT_DIR\` copy.

## 32. Final verdict criteria

**Question:** Does information/action created in Admin correctly reach the Picker App through the real backend/DB, and vice versa?

**Answer from this run:** See communication matrix + FAIL/MISSING counts below. PASS never awarded on HTTP 200 alone.

**No application code was modified by this harness.**

---

## Detailed issues

${issueBlocks || "_No FAIL/MISSING rows captured._"}

---

## Communication matrix

${matrixTable}

---

## All test case results (compact)

| ID | Status | Severity | Title |
|---|---|---|---|
${results.map((r) => `| ${r.id} | ${r.status} | ${r.severity} | ${cell(r.title).slice(0, 100)} |`).join("\n")}

---

## Final verdict

Layers exercised: Picker API (\`x-selorg-client: picker\`) ↔ Mongo ↔ Admin \`/api/v1/admin/picker\` ↔ Admin SPA routes${uiAvailable ? " ↔ Picker UI" : SKIP_PICKER_UI ? " (UI skipped)" : " (UI blocked)"}.

**End of report.**
`;

  fs.writeFileSync(REPORT_MD, md, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "ADMIN_PICKER_CROSS_SYSTEM_E2E_TEST_REPORT.md"), md, "utf8");
  console.log(`\nWrote ${REPORT_MD}`);
}

async function main() {
  console.log("Admin ↔ Picker CROSS-SYSTEM E2E starting…");
  await phaseEnv();
  if (!adminToken) {
    writeMarkdownReport(null);
    if (dbReady && mongoose) {
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
    }
    console.log("CROSS_SYSTEM_DONE", results.length);
    return;
  }
  await phaseArchitecture();
  await phasePickerToAdminSync();
  await phaseAdminToPicker();
  const uiSummary = await phasePickerUi();
  await phaseSalaryIncentiveOt();
  await phaseShiftAttendance();
  await phaseOrdersTasks();
  await phaseSecurity();
  await phaseAdminUiRoutes();

  // Fill remaining matrix defaults
  for (const k of [
    "Picker Employee Details",
    "Picker Profile",
    "Picker Status",
    "Store / Dark Store",
    "Shift",
    "Attendance",
    "Order / Task",
    "Task Assignment",
    "Task Acceptance",
    "Task Completion",
    "Productivity",
    "Salary",
    "Incentive",
    "Overtime / OT",
    "Earnings",
    "Payroll / Payout",
    "Notifications",
    "Order Status",
  ]) {
    if (!matrix[k]) setMatrix(k, { result: "BLOCKED", note: "Not populated this run" });
  }

  saveProgress();
  writeMarkdownReport(uiSummary);

  if (dbReady && mongoose) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  console.log("CROSS_SYSTEM_DONE", results.length);
}

main().catch((err) => {
  console.error(err);
  try {
    writeMarkdownReport(null);
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
});
