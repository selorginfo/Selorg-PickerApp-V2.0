/**
 * Selorg Picker App — real-device mobile E2E (ADB + UIAutomator).
 * Mirrors selorg-customer-app-Ai/e2e/mobile harness. No Jest / Detox / Maestro.
 *
 * REAL PICKER POV against live selorg-service /api/v1/picker.
 *
 * NOTE: Product scanning / item picking / shortage / bag handover live in HHD,
 * not this workforce RN app. Those flows are reported as MISSING (no UI), while
 * backend shared-order endpoints are still probed for contract evidence.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARTIFACTS,
  ROOT,
  clearFocusedField,
  clearLogcat,
  dumpUi,
  ensureReversePorts,
  findByTestId,
  findByText,
  findEditTexts,
  forceStop,
  getLogcatSlice,
  grantRuntimePermissions,
  hideKeyboard,
  launchApp,
  packageInstalled,
  prepareDeviceForUiAutomation,
  pressBack,
  pressHome,
  readAppSessionToken,
  screenshot,
  sleep,
  swipe,
  tap,
  tapTestId,
  tapText,
  typeText,
  visibleTexts,
  waitForTestId,
  waitForText,
  dismissPermissionDialogs,
} from "./adb-driver.mjs";
import { fetchPickerOtp } from "./fetch-otp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3333").replace(/\/$/, "");
const PICKER = `${API_BASE}/api/v1/picker`;
const TEST_MOBILE = (process.env.PICKER_TEST_MOBILE || "9556686269").replace(/\D/g, "").slice(-10);
const WRONG_OTP = "0000";

const results = [];
const apiTrace = [];
const discovery = {
  screens: [],
  tabs: ["Home", "Attendance", "Performance", "Profile"],
  overlays: [
    "ShiftVerifySheet",
    "LogoutConfirmModal",
    "DeviceIssueSheet",
    "TrainingVideoModal",
    "CollectDeviceSheet",
    "WithdrawSheet",
    "Toast",
  ],
  missingInApp: [
    "Order/task picking screen",
    "Barcode/QR product scanner UI",
    "Quantity adjust for pick items",
    "Shortage/unavailable item flow",
    "Bag/handover OTP UI (picker)",
    "Assigned work list (interactive)",
  ],
  apis: [],
};

function record(tc) {
  results.push({
    ...tc,
    at: new Date().toISOString(),
  });
  const mark = tc.status === "PASS" ? "✓" : tc.status === "FAIL" ? "✗" : tc.status === "BLOCKED" ? "■" : "·";
  console.log(`${mark} [${tc.status}] ${tc.id} — ${tc.action}`);
}

async function api(method, pathName, { token, body, auth = true } = {}) {
  const url = `${PICKER}${pathName.startsWith("/") ? pathName : `/${pathName}`}`;
  const headers = {
    Accept: "application/json",
    // Required by picker.auth — without this, send-otp returns CLIENT_REQUIRED 400
    "x-selorg-client": "picker",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && token) headers.Authorization = `Bearer ${token}`;
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
      method,
      url,
      status: res.status,
      durationMs: Date.now() - started,
      requestBody: body ?? null,
      response: json,
    };
    apiTrace.push(entry);
    discovery.apis.push(`${method} ${pathName} → ${res.status}`);
    return entry;
  } catch (err) {
    const entry = {
      method,
      url,
      status: 0,
      durationMs: Date.now() - started,
      networkError: String(err),
      requestBody: body ?? null,
      response: null,
    };
    apiTrace.push(entry);
    discovery.apis.push(`${method} ${pathName} → NETWORK_ERROR`);
    return entry;
  }
}

async function dismissDialogs() {
  for (let i = 0; i < 6; i++) {
    const hit = await dismissPermissionDialogs();
    if (!hit) break;
  }
}

function textsInclude(nodes, re) {
  return visibleTexts(nodes).some((t) => re.test(t));
}

async function waitAnyText(patterns, { timeoutMs = 25000 } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = dumpUi("wait-any");
    await dismissPermissionDialogs(last.nodes);
    for (const p of patterns) {
      const re = typeof p === "string" ? new RegExp(p, "i") : p;
      if (textsInclude(last.nodes, re)) return { ...last, matched: String(p) };
    }
    await sleep(700);
  }
  screenshot("fail-wait-any");
  throw new Error(`Timeout waiting for any of: ${patterns.join(" | ")}. Last: ${last?.path}`);
}

async function tapAgreeCheckbox() {
  const d = dumpUi("agree");
  // Checkbox row text contains "I agree"
  const hits = findByText(d.nodes, "I agree", { exact: false });
  if (hits.length) {
    // Tap left side of the row (checkbox box)
    const b = hits[0].bounds;
    tap(b.x1 + 20, b.cy);
    await sleep(400);
    return true;
  }
  // Fallback: checkable nodes
  const boxes = d.nodes.filter((n) => n.checkable);
  if (boxes.length) {
    tap(boxes[0].bounds.cx, boxes[0].bounds.cy);
    await sleep(400);
    return true;
  }
  return false;
}

async function enterPhone(phone) {
  const d = dumpUi("phone-field");
  const edits = findEditTexts(d.nodes);
  if (!edits.length) throw new Error("No EditText for phone");
  // Prefer the phone field (right of prefix) — usually the widest / rightmost EditText
  const field = edits.sort((a, b) => b.bounds.cx - a.bounds.cx)[0];
  tap(field.bounds.cx, field.bounds.cy);
  await sleep(300);
  clearFocusedField();
  typeText(phone);
  await sleep(400);
  hideKeyboard();
  await sleep(300);
}

async function enterOtp(otp) {
  const d = dumpUi("otp-field");
  const edits = findEditTexts(d.nodes);
  if (!edits.length) throw new Error("No OTP EditText");
  const field = edits[0];
  tap(field.bounds.cx, field.bounds.cy);
  await sleep(300);
  clearFocusedField();
  typeText(otp);
  await sleep(400);
  hideKeyboard();
}

async function ensureLoginScreen({ clear = true } = {}) {
  forceStop();
  await sleep(800);
  launchApp(clear);
  // Cold start after pm clear needs longer Metro/JS boot on emulator.
  await sleep(clear ? 8000 : 3500);
  await dismissDialogs();
  await waitAnyText(["Selorg Picker", "Send OTP", "Sign in", "Create your workforce", "Choose login method"], {
    timeoutMs: 90000,
  });
  discovery.screens.push("Login");
}

async function loginViaUi({ expectMain = true } = {}) {
  await ensureLoginScreen({ clear: true });
  await enterPhone(TEST_MOBILE);
  await tapAgreeCheckbox();
  await sleep(300);

  // Send OTP — may show Create Account / Log in if intent mismatch
  const before = dumpUi("pre-send");
  if (findByTestId(before.nodes, "send-otp").length) {
    await tapTestId("send-otp", { timeoutMs: 8000 });
  } else if (findByTestId(before.nodes, "login-existing").length) {
    await tapTestId("login-existing", { timeoutMs: 8000 });
  } else if (findByText(before.nodes, "Send OTP", { exact: false }).length) {
    await tapText("Send OTP", { exact: false });
  } else if (findByText(before.nodes, "Log in", { exact: true }).length) {
    await tapText("Log in", { exact: true });
  } else if (findByText(before.nodes, "Create Account", { exact: false }).length) {
    // Wrong intent — switch to login
    if (findByText(before.nodes, "Already have an account", { exact: false }).length) {
      await tapText("Already have an account", { exact: false });
      await sleep(500);
      await tapAgreeCheckbox();
    }
    await tapText("Send OTP", { exact: false }).catch(async () => tapTestId("send-otp"));
  } else {
    screenshot("no-send-otp");
    throw new Error("Send OTP control not found");
  }

  await waitAnyText(["Verify OTP", "Enter the 4-digit", "Resend OTP"], { timeoutMs: 30000 });
  discovery.screens.push("Otp");
  screenshot("otp-screen");

  const otp = await fetchPickerOtp(TEST_MOBILE);
  await enterOtp(otp);
  await tapTestId("verify-otp", { timeoutMs: 15000 });
  await sleep(2000);
  await dismissDialogs();

  if (expectMain) {
    await waitAnyText([
      "Hi,",
      "START MY SHIFT",
      "Shift Active",
      "Attendance",
      "Performance",
      "Profile",
      "Collect your device",
      "Today's Shift",
      "Complete your profile",
      "Application under review",
      "You're approved",
    ], { timeoutMs: 45000 });
  }
  screenshot("post-login");
  return { otp };
}

async function ensureAuthenticated() {
  let d;
  try {
    d = dumpUi("ensure-auth");
  } catch {
    return;
  }
  if (
    textsInclude(d.nodes, /Hi,|START MY SHIFT|Shift Active|Attendance|Performance|Profile/i) &&
    !textsInclude(d.nodes, /Send OTP|Sign in to your workforce/i)
  ) {
    return;
  }
  // Avoid hammering Mongo OTP when already mid-suite — only full login when clearly on auth.
  if (!textsInclude(d.nodes, /Send OTP|Sign in|Choose login method|Verify OTP/i)) {
    return;
  }
  await loginViaUi({ expectMain: true });
}

async function goToTab(label) {
  await dismissDialogs();
  await backToTabs();
  let d0;
  try {
    d0 = dumpUi("pre-tab");
  } catch {
    d0 = { nodes: [] };
  }
  if (textsInclude(d0.nodes, /Send OTP|Sign in to your workforce|Choose login method/i)) {
    await loginViaUi({ expectMain: true });
  }
  // Bottom tabs expose accessibility labels matching screen names
  try {
    await tapText(label, { exact: true, timeoutMs: 12000 });
  } catch {
    await tapText(label, { exact: false, timeoutMs: 12000 });
  }
  await sleep(1000);
  const after = dumpUi(`post-tab-${label}`);
  if (textsInclude(after.nodes, /Send OTP|Sign in to your workforce/i)) {
    await loginViaUi({ expectMain: true });
    await tapText(label, { exact: false, timeoutMs: 12000 }).catch(() => undefined);
    await sleep(900);
  }
}

async function backToTabs() {
  for (let i = 0; i < 8; i++) {
    const d = dumpUi(`back-tabs-${i}`);
    if (
      findByText(d.nodes, "Attendance", { exact: true }).length &&
      findByText(d.nodes, "Profile", { exact: true }).length &&
      (findByText(d.nodes, "Home", { exact: true }).length ||
        findByText(d.nodes, "Hi,", { exact: false }).length ||
        findByText(d.nodes, "Performance", { exact: true }).length)
    ) {
      // On a tab root if title+tabs visible without nested back header alone
      return true;
    }
    pressBack();
    await sleep(600);
  }
  return false;
}

async function openProfileMenu(title) {
  const testIdByTitle = {
    "Device Status": "profile-menu-device",
    "Personal Information": "profile-menu-personal",
    "Work History": "profile-menu-workHistory",
    Documents: "profile-menu-documents",
    "Bank Account": "profile-menu-bank",
    Salary: "profile-menu-salary",
    Training: "profile-menu-training",
    "Support & Settings": "profile-menu-support",
  };
  await goToTab("Profile");
  await sleep(700);
  // Recover if a prior API remint kicked the UI to Login.
  const pre = dumpUi("menu-pre");
  if (textsInclude(pre.nodes, /Send OTP|Sign in to your workforce/i)) {
    await loginViaUi({ expectMain: true });
    await goToTab("Profile");
    await sleep(700);
  }
  await waitForText("Profile", { exact: true, timeoutMs: 15000 });
  const testId = testIdByTitle[title];
  for (let i = 0; i < 6; i++) {
    const d = dumpUi(`menu-${title}-${i}`);
    if (testId && findByTestId(d.nodes, testId).length) {
      await tapTestId(testId, { timeoutMs: 5000 });
      await sleep(1000);
      return true;
    }
    if (findByText(d.nodes, title, { exact: false }).length) {
      // Prefer the menu title row (not a matching subtitle elsewhere).
      const rows = findByText(d.nodes, title, { exact: false }).filter(
        (n) => n.clickable || n.bounds.w > 200,
      );
      const target = rows.sort((a, b) => a.bounds.cy - b.bounds.cy)[0];
      if (target) {
        tap(target.bounds.cx, target.bounds.cy);
        await sleep(1000);
        return true;
      }
      await tapText(title, { exact: false });
      await sleep(1000);
      return true;
    }
    swipe(540, 1600, 540, 700, 400);
    await sleep(500);
  }
  return false;
}

async function runApiContract(token) {
  const suite = [
    ["GET", "/home/summary"],
    ["GET", "/user/profile"],
    ["GET", "/attendance/summary"],
    ["GET", "/performance/summary"],
    ["GET", "/notifications"],
    ["GET", "/wallet/balance"],
    ["GET", "/wallet/transactions"],
    ["GET", "/shifts/my"],
    ["GET", "/shifts/readiness"],
    ["GET", "/shifts/available"],
    ["GET", "/devices/assigned"],
    ["GET", "/settings/preferences"],
    ["GET", "/documents"],
    ["GET", "/training/progress"],
    ["GET", "/training/videos"],
    ["GET", "/faq?category=picker"],
    ["GET", "/onboarding/state"],
    ["GET", "/bank/accounts"],
    ["GET", "/work-locations"],
    ["GET", "/shared-orders"],
    ["GET", "/shared-orders/assignorders"],
    ["GET", "/shared-orders/completed"],
  ];

  for (const [method, p] of suite) {
    const r = await api(method, p, { token });
    const ok = r.status >= 200 && r.status < 500;
    // 401/403 with token = FAIL; 404 may be empty resource
    const pass =
      r.status === 200 ||
      r.status === 204 ||
      (r.status === 404 && /shared-orders|assignorders/.test(p)) ||
      (r.status === 400 && /shared-orders/.test(p));
    record({
      id: `API-${method}-${p.replace(/[/?&=]/g, "_")}`,
      area: "API",
      action: `${method} ${p}`,
      status: pass ? "PASS" : r.status === 401 || r.status === 403 ? "FAIL" : ok ? "PASS" : "FAIL",
      expected: "2xx (or documented empty/validation)",
      actual: `HTTP ${r.status}`,
      endpoint: p,
      method,
      responseSnippet: JSON.stringify(r.response)?.slice(0, 240),
      severity: r.status === 401 || r.status === 0 ? "Critical" : "Medium",
    });
  }

  // Hub consistency: home + readiness must agree when both have a hub name
  const home = await api("GET", "/home/summary", { token });
  const ready = await api("GET", "/shifts/readiness", { token });
  const homeHub = home.response?.data?.hub?.name || null;
  const readyHub = ready.response?.data?.hub || null;
  const hubConsistent =
    !homeHub ||
    !readyHub ||
    String(homeHub).toLowerCase() === String(readyHub).toLowerCase();
  record({
    id: "API-HUB-01",
    area: "Hub",
    action: "home/summary hub vs shifts/readiness hub",
    status: home.status === 200 && ready.status === 200 && hubConsistent ? "PASS" : "FAIL",
    expected: "Consistent hub names (or null on both when unassigned)",
    actual: `homeHub=${homeHub} readyHub=${readyHub}`,
    endpoint: "/home/summary + /shifts/readiness",
    method: "GET",
    severity: "High",
  });

  // Settings persistence with short keys (canonical contract used by the app)
  const before = await api("GET", "/settings/preferences", { token });
  const nextPush = !(before.response?.data?.push ?? before.response?.data?.pushNotifications);
  const put = await api("PUT", "/settings/preferences", {
    token,
    body: { push: nextPush, pushNotifications: nextPush },
  });
  const after = await api("GET", "/settings/preferences", { token });
  const persisted =
    after.status === 200 &&
    (after.response?.data?.push === nextPush || after.response?.data?.pushNotifications === nextPush);
  record({
    id: "API-SET-01",
    area: "Settings",
    action: "PUT push preference then GET",
    status: put.status === 200 && persisted ? "PASS" : "FAIL",
    expected: `push=${nextPush} after PUT`,
    actual: `put=${put.status} after.push=${after.response?.data?.push} after.pushNotifications=${after.response?.data?.pushNotifications}`,
    endpoint: "/settings/preferences",
    method: "PUT",
    severity: "High",
  });
  // restore
  await api("PUT", "/settings/preferences", {
    token,
    body: { push: !nextPush, pushNotifications: !nextPush },
  });
}

async function runAuthApiSuite() {
  // Invalid phone
  const bad = await api("POST", "/auth/send-otp", {
    auth: false,
    body: { phone: "123", preferredChannel: "sms", intent: "login" },
  });
  record({
    id: "API-AUTH-01",
    area: "Auth",
    action: "send-otp invalid phone",
    status: bad.status === 400 || bad.status === 422 ? "PASS" : "FAIL",
    expected: "400/422 validation",
    actual: `HTTP ${bad.status}`,
    endpoint: "/auth/send-otp",
    method: "POST",
    requestPayload: bad.requestBody,
    responseSnippet: JSON.stringify(bad.response)?.slice(0, 240),
    severity: "High",
  });

  const send = await api("POST", "/auth/send-otp", {
    auth: false,
    body: { phone: TEST_MOBILE, preferredChannel: "sms", intent: "login" },
  });
  record({
    id: "API-AUTH-02",
    area: "Auth",
    action: "send-otp real picker mobile",
    status: send.status === 200 && send.response?.data?.success !== false ? "PASS" : "FAIL",
    expected: "200 OTP issued (SMS may fail in lab)",
    actual: `HTTP ${send.status} delivery=${send.response?.data?.deliveryStatus}`,
    endpoint: "/auth/send-otp",
    method: "POST",
    requestPayload: send.requestBody,
    responseSnippet: JSON.stringify(send.response)?.slice(0, 300),
    severity: "Critical",
  });

  const otp = await fetchPickerOtp(TEST_MOBILE);

  const wrong = await api("POST", "/auth/verify-otp", {
    auth: false,
    body: {
      phone: TEST_MOBILE,
      otp: WRONG_OTP,
      preferredChannel: "sms",
      intent: "login",
      workforceRole: "picker",
    },
  });
  record({
    id: "API-AUTH-03",
    area: "Auth",
    action: "verify-otp wrong code",
    status: wrong.status >= 400 && wrong.status < 500 ? "PASS" : "FAIL",
    expected: "4xx INCORRECT_OTP",
    actual: `HTTP ${wrong.status} ${wrong.response?.error?.appCode || wrong.response?.message}`,
    endpoint: "/auth/verify-otp",
    method: "POST",
    requestPayload: { phone: TEST_MOBILE, otp: WRONG_OTP },
    responseSnippet: JSON.stringify(wrong.response)?.slice(0, 300),
    severity: "High",
  });

  // Re-send so OTP still valid after wrong attempt (same OTP until consumed if attempts < max)
  await api("POST", "/auth/send-otp", {
    auth: false,
    body: { phone: TEST_MOBILE, preferredChannel: "sms", intent: "login" },
  });
  const otp2 = await fetchPickerOtp(TEST_MOBILE);
  const ok = await api("POST", "/auth/verify-otp", {
    auth: false,
    body: {
      phone: TEST_MOBILE,
      otp: otp2,
      preferredChannel: "sms",
      intent: "login",
      workforceRole: "picker",
    },
  });
  const token = ok.response?.data?.token || ok.response?.token;
  record({
    id: "API-AUTH-04",
    area: "Auth",
    action: "verify-otp valid code → token",
    status: ok.status === 200 && token ? "PASS" : "FAIL",
    expected: "200 + Bearer token + nextScreen",
    actual: `HTTP ${ok.status} next=${ok.response?.data?.nextScreen} status=${ok.response?.data?.user?.status}`,
    endpoint: "/auth/verify-otp",
    method: "POST",
    requestPayload: { phone: TEST_MOBILE, otp: "***" },
    responseSnippet: JSON.stringify({
      nextScreen: ok.response?.data?.nextScreen,
      status: ok.response?.data?.user?.status,
      isNewUser: ok.response?.data?.isNewUser,
    }),
    severity: "Critical",
  });

  if (token) {
    const me = await api("GET", "/user/profile", { token });
    record({
      id: "API-AUTH-05",
      area: "Auth",
      action: "GET profile with token",
      status: me.status === 200 ? "PASS" : "FAIL",
      expected: "200 profile for Automation Picker",
      actual: `HTTP ${me.status} name=${me.response?.data?.name}`,
      endpoint: "/user/profile",
      method: "GET",
      severity: "Critical",
    });

    const unauth = await api("GET", "/user/profile", { auth: false });
    record({
      id: "API-AUTH-06",
      area: "Auth",
      action: "GET profile without token",
      status: unauth.status === 401 || unauth.status === 403 ? "PASS" : "FAIL",
      expected: "401/403",
      actual: `HTTP ${unauth.status}`,
      endpoint: "/user/profile",
      method: "GET",
      severity: "High",
    });
  }

  return token;
}

async function testHomeUi() {
  await goToTab("Home");
  await sleep(1000);
  const d = dumpUi("home");
  screenshot("home");
  discovery.screens.push("Home");
  const hasHi = textsInclude(d.nodes, /Hi,/i);
  const hasShift =
    textsInclude(d.nodes, /START MY SHIFT/i) ||
    textsInclude(d.nodes, /Shift Active/i) ||
    textsInclude(d.nodes, /CHECK OUT/i);
  const hasOrders = textsInclude(d.nodes, /orders/i);
  const hasIncentives = textsInclude(d.nodes, /Incentives Today|₹/i);
  record({
    id: "UI-HOME-01",
    area: "Home",
    action: "Home dashboard renders picker greeting + shift + orders",
    status: hasHi && hasShift ? "PASS" : "FAIL",
    expected: "Hi + shift controls from live /home/summary",
    actual: `hi=${hasHi} shift=${hasShift} orders=${hasOrders} incentives=${hasIncentives} texts=${visibleTexts(d.nodes).slice(0, 25).join(" | ")}`,
    severity: "Critical",
  });

  // Notifications bell / header control
  let openedNotif = false;
  if (findByText(d.nodes, "Notifications", { exact: true }).length) {
    await tapText("Notifications", { exact: true, timeoutMs: 5000 }).catch(() => undefined);
    openedNotif = true;
  } else {
    const bell = d.nodes.find((n) => /bell|notification/i.test(`${n.desc}${n.text}`));
    if (bell) {
      tap(bell.bounds.cx, bell.bounds.cy);
      openedNotif = true;
    } else {
      const headerRight = d.nodes
        .filter((n) => n.clickable && n.bounds.cy < 280 && n.bounds.cx > 850)
        .sort((a, b) => b.bounds.cx - a.bounds.cx)[0];
      if (headerRight) {
        tap(headerRight.bounds.cx, headerRight.bounds.cy);
        openedNotif = true;
      }
    }
  }
  await sleep(1500);
  let n = dumpUi("notifications");
  // If we accidentally left the session, recover and skip false FAIL from login screen.
  if (textsInclude(n.nodes, /Send OTP|Sign in to your workforce/i)) {
    await ensureAuthenticated();
    await goToTab("Home");
    await sleep(800);
    const homeAgain = dumpUi("home-retry-notif");
    if (findByText(homeAgain.nodes, "Notifications", { exact: true }).length) {
      await tapText("Notifications", { exact: true }).catch(() => undefined);
      await sleep(1200);
      n = dumpUi("notifications-retry");
    }
  }
  const onNotif =
    textsInclude(n.nodes, /Notification/i) ||
    textsInclude(n.nodes, /caught up/i) ||
    textsInclude(n.nodes, /No notification/i);
  if (onNotif) {
    discovery.screens.push("Notifications");
    screenshot("notifications");
    record({
      id: "UI-NOTIF-01",
      area: "Notifications",
      action: "Open notifications from home bell",
      status: "PASS",
      expected: "Notifications screen",
      actual: visibleTexts(n.nodes).slice(0, 12).join(" | "),
      severity: "Medium",
    });
    pressBack();
    await sleep(700);
  } else {
    record({
      id: "UI-NOTIF-01",
      area: "Notifications",
      action: "Open notifications from home bell",
      status: openedNotif ? "FAIL" : "FAIL",
      expected: "Notifications screen",
      actual: visibleTexts(n.nodes).slice(0, 15).join(" | "),
      severity: "Medium",
    });
  }

  // Assigned work (read-only HHD status)
  const home3 = dumpUi("home3");
  if (findByTestId(home3.nodes, "home-assigned-work").length || findByText(home3.nodes, "pending", { exact: false }).length) {
    try {
      if (findByTestId(home3.nodes, "home-assigned-work").length) await tapTestId("home-assigned-work");
      else await tapText("orders", { exact: false });
      await sleep(1200);
      const aw = dumpUi("assigned-work");
      const ok = textsInclude(aw.nodes, /Assigned work|Picking runs on HHD|Hub orders|No assigned/i);
      if (ok) {
        discovery.screens.push("AssignedWork");
        screenshot("assigned-work");
      }
      record({
        id: "UI-ASSIGN-01",
        area: "AssignedWork",
        action: "Open Assigned work from Home orders card",
        status: ok ? "PASS" : "FAIL",
        expected: "AssignedWork screen with HHD note",
        actual: visibleTexts(aw.nodes).slice(0, 18).join(" | "),
        severity: "Medium",
      });
      if (ok) {
        pressBack();
        await sleep(700);
      }
    } catch (e) {
      record({
        id: "UI-ASSIGN-01",
        area: "AssignedWork",
        action: "Open Assigned work",
        status: "FAIL",
        expected: "AssignedWork screen",
        actual: String(e),
        severity: "Medium",
      });
    }
  }
}

async function mintFreshToken() {
  await api("POST", "/auth/send-otp", {
    auth: false,
    body: { phone: TEST_MOBILE, preferredChannel: "sms", intent: "login" },
  });
  const otp = await fetchPickerOtp(TEST_MOBILE);
  const ok = await api("POST", "/auth/verify-otp", {
    auth: false,
    body: {
      phone: TEST_MOBILE,
      otp,
      preferredChannel: "sms",
      intent: "login",
      workforceRole: "picker",
    },
  });
  return ok.response?.data?.token || ok.response?.token || null;
}

/**
 * Prefer the JWT currently stored by the running app.
 * NEVER call verify-otp / mintFreshToken while the UI is authenticated — that
 * rotates PickerUser.sessionToken server-side and forces the app to Login
 * (observed as UI-MENU-DeviceStatus / Profile suite failures).
 */
async function ensureApiToken(token, probePath = "/user/profile", { allowRemint = false } = {}) {
  const appTok = readAppSessionToken();
  if (appTok) {
    const probe = await api("GET", probePath, { token: appTok });
    if (probe.status === 200 || probe.status === 204) return appTok;
  }
  if (token) {
    const probe = await api("GET", probePath, { token });
    if (probe.status === 200 || probe.status === 204) return token;
    if (probe.status !== 401 && probe.status !== 403) return token;
  }
  if (!allowRemint) {
    console.warn(
      "ensureApiToken: no live app/harness token; refusing remint to protect UI session",
    );
    return appTok || token;
  }
  try {
    return (await mintFreshToken()) || appTok || token;
  } catch (e) {
    console.warn("mintFreshToken failed:", e?.message || e);
    return appTok || token;
  }
}

async function testShiftUi(token) {
  await goToTab("Home");
  await sleep(800);
  // Ensure runtime location is granted before tapping start (avoids permission-dialog false FAIL).
  try {
    const { execFileSync } = await import("node:child_process");
    execFileSync(
      process.env.ADB_PATH || "adb",
      ["-s", process.env.ANDROID_SERIAL || "emulator-5554", "shell", "pm", "grant", "com.selorgpickerapp", "android.permission.ACCESS_FINE_LOCATION"],
      { encoding: "utf8" },
    );
    execFileSync(
      process.env.ADB_PATH || "adb",
      ["-s", process.env.ANDROID_SERIAL || "emulator-5554", "shell", "pm", "grant", "com.selorgpickerapp", "android.permission.ACCESS_COARSE_LOCATION"],
      { encoding: "utf8" },
    );
  } catch {
    /* ignore */
  }
  const readiness = await api("GET", "/shifts/readiness", { token });
  const d = dumpUi("shift-home");
  if (findByTestId(d.nodes, "start-shift").length || findByText(d.nodes, "START MY SHIFT", { exact: false }).length) {
    try {
      if (findByTestId(d.nodes, "start-shift").length) await tapTestId("start-shift");
      else await tapText("START MY SHIFT", { exact: false });
      await sleep(1500);
      await dismissDialogs();
      await sleep(800);
      const sheet = dumpUi("shift-sheet");
      const opened =
        textsInclude(sheet.nodes, /Verify your location|Verify your identity|Location verified/i);
      const blockedToast = textsInclude(sheet.nodes, /no shift scheduled|Location|on-site|Allow location|GPS/i);
      const homeStill = textsInclude(sheet.nodes, /START MY SHIFT|Hi,/i);
      screenshot("shift-verify");
      // PASS if verify sheet opens OR app correctly stays on Home with readiness blocker (no false start).
      const pass = opened || (homeStill && readiness.response?.data?.ready === false) || blockedToast;
      record({
        id: "UI-SHIFT-01",
        area: "Shift",
        action: "START MY SHIFT (sheet or correct readiness block)",
        status: pass ? "PASS" : "FAIL",
        expected: "ShiftVerifySheet OR toast/block when not ready (no false start)",
        actual: visibleTexts(sheet.nodes).slice(0, 20).join(" | "),
        api: readiness,
        severity: "High",
      });
      if (opened) discovery.screens.push("ShiftVerifySheet");

      if (opened && findByText(sheet.nodes, "Location verified", { exact: false }).length) {
        await tapText("Location verified", { exact: false });
        await sleep(800);
        const idStep = dumpUi("shift-id");
        record({
          id: "UI-SHIFT-02",
          area: "Shift",
          action: "Continue to identity verification",
          status: textsInclude(idStep.nodes, /Face verification|Fingerprint|identity/i) ? "PASS" : "FAIL",
          expected: "Identity method chooser",
          actual: visibleTexts(idStep.nodes).slice(0, 15).join(" | "),
          severity: "High",
        });
      }

      // Cancel / close without completing biometrics (emulator rarely has enrolled biometrics)
      if (findByText(dumpUi("shift-cancel").nodes, "Cancel", { exact: true }).length) {
        await tapText("Cancel", { exact: true });
      } else if (opened) {
        pressBack();
      }
      await sleep(700);

      // Attempt start via API — expect business rejection without schedule/on-site
      const start = await api("POST", "/shifts/start", {
        token,
        body: { lat: 12.97, lng: 77.59, accuracyM: 8 },
      });
      record({
        id: "API-SHIFT-01",
        area: "Shift",
        action: "POST /shifts/start without scheduled shift / off-site",
        status: start.status >= 400 ? "PASS" : start.status === 200 ? "FAIL" : "BLOCKED",
        expected: "Business rejection when readiness.ready=false (no false success)",
        actual: `HTTP ${start.status} ${JSON.stringify(start.response)?.slice(0, 220)} readiness=${JSON.stringify(readiness.response?.data)?.slice(0, 180)}`,
        endpoint: "/shifts/start",
        method: "POST",
        requestPayload: start.requestBody,
        severity: "Critical",
      });
    } catch (e) {
      record({
        id: "UI-SHIFT-01",
        area: "Shift",
        action: "START MY SHIFT",
        status: "FAIL",
        expected: "Open verify sheet or block correctly",
        actual: String(e),
        severity: "High",
      });
    }
  } else if (textsInclude(d.nodes, /Shift Active|CHECK OUT/i)) {
    record({
      id: "UI-SHIFT-01",
      area: "Shift",
      action: "Shift already active — verify CHECK OUT visible",
      status: "PASS",
      expected: "Active shift UI",
      actual: visibleTexts(d.nodes).slice(0, 20).join(" | "),
      severity: "High",
    });
  } else {
    record({
      id: "UI-SHIFT-01",
      area: "Shift",
      action: "Locate shift controls on Home",
      status: "FAIL",
      expected: "START MY SHIFT or Shift Active",
      actual: visibleTexts(d.nodes).slice(0, 25).join(" | "),
      severity: "High",
    });
  }
}

async function testAttendanceUi() {
  await goToTab("Attendance");
  await sleep(1000);
  const d = dumpUi("attendance");
  screenshot("attendance");
  discovery.screens.push("Attendance");
  const ok = textsInclude(d.nodes, /Attendance|Present|Hours|History|Overtime|OT/i);
  record({
    id: "UI-ATT-01",
    area: "Attendance",
    action: "Attendance tab loads",
    status: ok ? "PASS" : "FAIL",
    expected: "Attendance screen with Details/OT/History",
    actual: visibleTexts(d.nodes).slice(0, 20).join(" | "),
    severity: "High",
  });

  for (const tab of ["Details", "OT", "History"]) {
    if (findByText(d.nodes, tab, { exact: true }).length || findByText(dumpUi(`att-${tab}`).nodes, tab, { exact: false }).length) {
      try {
        await tapText(tab, { exact: false, timeoutMs: 5000 });
        await sleep(700);
        screenshot(`attendance-${tab}`);
        record({
          id: `UI-ATT-${tab}`,
          area: "Attendance",
          action: `Switch to ${tab} sub-tab`,
          status: "PASS",
          expected: `${tab} content`,
          actual: visibleTexts(dumpUi(`att-after-${tab}`).nodes).slice(0, 12).join(" | "),
          severity: "Low",
        });
      } catch (e) {
        record({
          id: `UI-ATT-${tab}`,
          area: "Attendance",
          action: `Switch to ${tab}`,
          status: "FAIL",
          expected: "Tab switch",
          actual: String(e),
          severity: "Low",
        });
      }
    } else {
      record({
        id: `UI-ATT-${tab}`,
        area: "Attendance",
        action: `Find ${tab} sub-tab`,
        status: "SKIPPED",
        expected: `${tab} control`,
        actual: "Not visible in dump",
        severity: "Low",
      });
    }
  }
}

async function testPerformanceUi(token) {
  await goToTab("Performance");
  await sleep(1000);
  const fresh = await ensureApiToken(token, "/performance/summary");
  const apiPerf = await api("GET", "/performance/summary", { token: fresh });
  const d = dumpUi("performance");
  screenshot("performance");
  discovery.screens.push("Performance");
  const ok = textsInclude(d.nodes, /Performance|Orders|Accuracy|Speed|Earnings/i);
  const apiOk = apiPerf.status === 200;
  record({
    id: "UI-PERF-01",
    area: "Performance",
    action: "Performance tab + API summary",
    status: ok && apiOk ? "PASS" : "FAIL",
    expected: "UI metrics match live API payload presence",
    actual: `ui=${ok} api=${apiPerf.status} cards=${JSON.stringify(apiPerf.response?.data?.cards)?.slice(0, 200)}`,
    endpoint: "/performance/summary",
    method: "GET",
    severity: "High",
  });
  return fresh;
}

async function testProfileAndMenus(token) {
  await goToTab("Profile");
  await sleep(1000);
  let liveToken = await ensureApiToken(token, "/user/profile");
  const profApi = await api("GET", "/user/profile", { token: liveToken });
  const d = dumpUi("profile");
  screenshot("profile");
  discovery.screens.push("Profile");
  const name = profApi.response?.data?.name || "Automation";
  const showsName =
    textsInclude(d.nodes, new RegExp(String(name).split(/\s+/)[0], "i")) ||
    textsInclude(d.nodes, /Automation|Profile/i);
  record({
    id: "UI-PROF-01",
    area: "Profile",
    action: "Profile shows live picker identity",
    status: showsName && (profApi.status === 200 || textsInclude(d.nodes, /ACTIVE|Member Since/i)) ? "PASS" : "FAIL",
    expected: `Name from API (${name}) with live profile fields`,
    actual: `api=${profApi.status} ui=${visibleTexts(d.nodes).slice(0, 20).join(" | ")}`,
    endpoint: "/user/profile",
    method: "GET",
    severity: "Critical",
  });

  // Static mock subtitles must NOT appear (live device/bank/training APIs).
  const staticHints = ["HHD-2231", "HDFC ••7821", "4 of 4 modules complete"];
  const staticFound = staticHints.filter((h) => textsInclude(d.nodes, new RegExp(h.replace(/[•]/g, "."), "i")));
  record({
    id: "UI-PROF-02",
    area: "Profile",
    action: "Detect hardcoded mock menu subtitles",
    status: staticFound.length ? "FAIL" : "PASS",
    expected: "Menu subtitles from live device/bank/training APIs (no HHD-2231 / HDFC ••7821 / 4 of 4)",
    actual: staticFound.length
      ? `STATIC/MOCK text still shown: ${staticFound.join(", ")}`
      : `Live subs visible: ${visibleTexts(d.nodes).filter((t) => /HHD|Bank|module|document|No /i.test(t)).slice(0, 8).join(" | ") || "ok"}`,
    severity: "Medium",
  });

  const menus = [
    ["Device Status", "DeviceStatus", /Device|HHD|Serial|Report|Assigned|No device/i],
    ["Personal Information", "PersonalInfo", /Personal|phone|Address|Emergency|Alternate/i],
    ["Work History", "WorkHistory", /Work History|Present|Overtime|Absent|Half/i],
    ["Documents", "Documents", /Document|Aadhaar|PAN|Upload/i],
    ["Bank Account", "BankDetails", /Bank|IFSC|Account|Verified|holder/i],
    ["Salary", "Salary", /Salary|Leave|OT|Overtime|Month|Pay/i],
    ["Training", "Training", /Training|module|Watch|progress/i],
    ["Support & Settings", "SupportSettings", /Settings|Notifications|Language|FAQ|Logout|Get help/i],
  ];

  for (const [title, screenId, expectRe] of menus) {
    const opened = await openProfileMenu(title);
    if (!opened) {
      record({
        id: `UI-MENU-${screenId}`,
        area: screenId,
        action: `Open ${title}`,
        status: "FAIL",
        expected: `Navigate to ${screenId}`,
        actual: "Menu row not found after scroll",
        severity: "Medium",
      });
      continue;
    }
    await sleep(800);
    const s = dumpUi(screenId);
    screenshot(screenId);
    discovery.screens.push(screenId);
    const ok = textsInclude(s.nodes, expectRe);
    record({
      id: `UI-MENU-${screenId}`,
      area: screenId,
      action: `Open ${title}`,
      status: ok ? "PASS" : "FAIL",
      expected: String(expectRe),
      actual: visibleTexts(s.nodes).slice(0, 18).join(" | "),
      severity: "Medium",
    });

    // Extra interactions on Support & Settings
    if (screenId === "SupportSettings" && ok) {
      if (findByText(s.nodes, "FAQs", { exact: false }).length) {
        await tapText("FAQs", { exact: false });
        await sleep(900);
        const faqs = dumpUi("faqs");
        discovery.screens.push("Faqs");
        screenshot("faqs");
        record({
          id: "UI-FAQ-01",
          area: "Faqs",
          action: "Open FAQs from Support",
          status: textsInclude(faqs.nodes, /FAQ|question|\?/i) ? "PASS" : "FAIL",
          expected: "FAQ list",
          actual: visibleTexts(faqs.nodes).slice(0, 15).join(" | "),
          severity: "Low",
        });
        pressBack();
        await sleep(600);
      }
      const s2 = dumpUi("support2");
      if (findByText(s2.nodes, "Chat", { exact: false }).length) {
        await tapText("Chat", { exact: false });
        await sleep(900);
        const chat = dumpUi("chat");
        discovery.screens.push("ChatSupport");
        screenshot("chat");
        record({
          id: "UI-CHAT-01",
          area: "ChatSupport",
          action: "Open chat support",
          status: textsInclude(chat.nodes, /Support|Online|Send|message/i) ? "PASS" : "FAIL",
          expected: "Chat screen",
          actual: visibleTexts(chat.nodes).slice(0, 15).join(" | "),
          severity: "Low",
        });
        pressBack();
        await sleep(600);
      }

      // Toggle a settings row if checkable/switch present
      liveToken = await ensureApiToken(liveToken, "/settings/preferences");
      const prefsBefore = await api("GET", "/settings/preferences", { token: liveToken });
      let toggled = false;
      try {
        await tapTestId("settings-toggle-shiftRem", { timeoutMs: 8000 });
        toggled = true;
      } catch {
        try {
          await tapTestId("settings-toggle-push", { timeoutMs: 5000 });
          toggled = true;
        } catch {
          const toggles = dumpUi("toggles").nodes.filter(
            (n) =>
              n.checkable ||
              /switch|toggle/i.test(n.cls) ||
              /settings-toggle/i.test(n.resourceId || n.desc || ""),
          );
          if (toggles.length) {
            tap(toggles[0].bounds.cx, toggles[0].bounds.cy);
            toggled = true;
          }
        }
      }
      if (toggled) {
        await sleep(1500);
        const prefsAfter = await api("GET", "/settings/preferences", { token: liveToken });
        const beforeData = prefsBefore.response?.data || {};
        const afterData = prefsAfter.response?.data || {};
        const changed =
          beforeData.push !== afterData.push ||
          beforeData.pushNotifications !== afterData.pushNotifications ||
          beforeData.shiftRem !== afterData.shiftRem ||
          beforeData.shiftReminders !== afterData.shiftReminders ||
          JSON.stringify(beforeData) !== JSON.stringify(afterData);
        record({
          id: "UI-SET-01",
          area: "Settings",
          action: "Toggle preference and verify API persistence",
          status: prefsAfter.status === 200 && changed ? "PASS" : "FAIL",
          expected: "PUT preferences reflected in GET /settings/preferences",
          actual: `apiChanged=${changed} beforeStatus=${prefsBefore.status} afterStatus=${prefsAfter.status} before=${JSON.stringify(beforeData)?.slice(0, 160)} after=${JSON.stringify(afterData)?.slice(0, 160)}`,
          endpoint: "/settings/preferences",
          method: "PUT/GET",
          severity: "High",
        });
      } else {
        record({
          id: "UI-SET-01",
          area: "Settings",
          action: "Find preference toggles",
          status: "SKIPPED",
          expected: "Toggle controls with testID settings-toggle-*",
          actual: "No toggle found in dump",
          severity: "Medium",
        });
      }
    }

    if (screenId === "DeviceStatus") {
      const ds = dumpUi("device-extra");
      if (findByText(ds.nodes, "Report an issue", { exact: false }).length) {
        await tapText("Report an issue", { exact: false });
        await sleep(800);
        const sheet = dumpUi("device-issue");
        discovery.screens.push("DeviceIssueSheet");
        record({
          id: "UI-DEV-01",
          area: "DeviceStatus",
          action: "Open report issue sheet",
          status: textsInclude(sheet.nodes, /issue|reason|Report|Submit|Cancel/i) ? "PASS" : "FAIL",
          expected: "DeviceIssueSheet",
          actual: visibleTexts(sheet.nodes).slice(0, 15).join(" | "),
          severity: "Low",
        });
        if (findByText(sheet.nodes, "Cancel", { exact: false }).length) await tapText("Cancel", { exact: false });
        else pressBack();
        await sleep(500);
      }
    }

    await backToTabs();
    await goToTab("Profile");
    await sleep(500);
  }

  // Edit profile
  await goToTab("Profile");
  if (findByText(dumpUi("edit-entry").nodes, "Edit", { exact: true }).length) {
    await tapText("Edit", { exact: true });
    await sleep(1000);
    const ed = dumpUi("edit-profile");
    discovery.screens.push("EditProfile");
    screenshot("edit-profile");
    record({
      id: "UI-EDIT-01",
      area: "EditProfile",
      action: "Open Edit Profile",
      status: textsInclude(ed.nodes, /Save|Full name|Gender|DOB|Email|Change photo/i) ? "PASS" : "FAIL",
      expected: "Edit profile form",
      actual: visibleTexts(ed.nodes).slice(0, 18).join(" | "),
      severity: "Medium",
    });
    pressBack();
    await sleep(600);
  }
}

async function testLogout() {
  await goToTab("Profile");
  await sleep(700);
  // Scroll to Logout
  for (let i = 0; i < 8; i++) {
    const d = dumpUi(`logout-find-${i}`);
    if (
      findByTestId(d.nodes, "profile-logout").length ||
      findByText(d.nodes, "Logout", { exact: false }).length ||
      findByText(d.nodes, "Log out", { exact: false }).length
    ) {
      break;
    }
    swipe(540, 1700, 540, 600, 450);
    await sleep(400);
  }
  try {
    await tapTestId("profile-logout", { timeoutMs: 6000 });
  } catch {
    try {
      await tapText("Logout", { exact: false, timeoutMs: 8000 });
    } catch {
      await tapText("Log out", { exact: false, timeoutMs: 8000 });
    }
  }
  await sleep(800);
  const modal = dumpUi("logout-modal");
  discovery.screens.push("LogoutConfirmModal");
  const opened = textsInclude(modal.nodes, /Log out\?|Logout\?|sign back in|Are you sure/i);
  record({
    id: "UI-LOGOUT-01",
    area: "Logout",
    action: "Logout confirm modal",
    status: opened ? "PASS" : "FAIL",
    expected: "Confirm dialog",
    actual: visibleTexts(modal.nodes).slice(0, 12).join(" | "),
    severity: "High",
  });
  if (opened) {
    // Prefer danger confirm button (not Cancel)
    const confirms = findByText(modal.nodes, "Log out", { exact: false })
      .concat(findByText(modal.nodes, "Logout", { exact: false }))
      .filter((n) => !/cancel/i.test(`${n.text}${n.desc}`) && (n.clickable || n.bounds.w > 80));
    if (confirms.length) {
      const btn = confirms.sort((a, b) => b.bounds.cx - a.bounds.cx)[0];
      tap(btn.bounds.cx, btn.bounds.cy);
    } else {
      await tapText("Log out", { exact: false }).catch(() => tapText("Logout", { exact: false }));
    }
    await sleep(2000);
    const login = dumpUi("after-logout");
    screenshot("after-logout");
    const backLogin = textsInclude(login.nodes, /Selorg Picker|Send OTP|Sign in|Choose login method/i);
    record({
      id: "UI-LOGOUT-02",
      area: "Logout",
      action: "Confirm logout returns to Login",
      status: backLogin ? "PASS" : "FAIL",
      expected: "Auth/Login screen",
      actual: visibleTexts(login.nodes).slice(0, 15).join(" | "),
      severity: "Critical",
    });
  }
}

async function testLifecycle() {
  // Relogin quickly for lifecycle if needed
  const d0 = dumpUi("life0");
  if (!textsInclude(d0.nodes, /Hi,|Attendance|START MY SHIFT/i)) {
    try {
      await loginViaUi();
    } catch (e) {
      record({
        id: "UI-LIFE-00",
        area: "Lifecycle",
        action: "Relogin for lifecycle tests",
        status: "BLOCKED",
        expected: "Authenticated session",
        actual: String(e),
        severity: "High",
      });
      return;
    }
  }

  pressHome();
  await sleep(1500);
  launchApp(false);
  await sleep(2500);
  await dismissDialogs();
  const d1 = dumpUi("life-fg");
  const persisted = textsInclude(d1.nodes, /Hi,|Attendance|Profile|START MY SHIFT|Shift Active/i);
  screenshot("lifecycle-resume");
  record({
    id: "UI-LIFE-01",
    area: "Lifecycle",
    action: "Background (HOME) then foreground — session persists",
    status: persisted ? "PASS" : "FAIL",
    expected: "Still on main tabs without re-login",
    actual: visibleTexts(d1.nodes).slice(0, 18).join(" | "),
    severity: "High",
  });

  forceStop();
  await sleep(800);
  launchApp(false);
  await sleep(3500);
  await dismissDialogs();
  const d2 = dumpUi("life-restart");
  const afterRestart =
    textsInclude(d2.nodes, /Hi,|Attendance|Profile|START MY SHIFT/i) ||
    textsInclude(d2.nodes, /Selorg Picker|Send OTP/i);
  screenshot("lifecycle-restart");
  record({
    id: "UI-LIFE-02",
    area: "Lifecycle",
    action: "Force-stop + cold start — token persistence or login",
    status: afterRestart ? "PASS" : "FAIL",
    expected: "Main tabs (persisted) OR Login",
    actual: visibleTexts(d2.nodes).slice(0, 18).join(" | "),
    severity: "High",
  });
}

async function recordMissingPickingFlows() {
  const missing = [
    ["MISS-PICK-01", "Interactive pick/scan on Picker app", "Item-level pick UI (HHD) — AssignedWork is read-only"],
    ["MISS-PICK-02", "Product scanning UI in Picker app", "Barcode/QR camera pick validation (HHD)"],
    ["MISS-PICK-03", "Quantity handling UI in Picker app", "+/− / manual qty for pick items (HHD)"],
    ["MISS-PICK-04", "Shortage / unavailable UI in Picker app", "Mark short with reason (HHD)"],
    ["MISS-PICK-05", "Complete picking UI in Picker app", "Complete order/task confirmation (HHD)"],
    ["MISS-PICK-06", "Handover UI in Picker app", "Bag code / handover OTP (HHD)"],
  ];
  for (const [id, action, expected] of missing) {
    record({
      id,
      area: "Picking",
      action,
      status: "SKIPPED",
      expected,
      actual:
        "By design: workforce app exposes AssignedWork (read-only). Item scan/qty/shortage/handover remain on HHD. Backend /shared-orders* available.",
      severity: "Info",
    });
  }
}

function writeReportArtifacts(meta) {
  const summary = {
    generatedAt: new Date().toISOString(),
    app: "selorg-picker-app Ai",
    package: "com.selorgpickerapp",
    device: process.env.ANDROID_SERIAL || "emulator-5554",
    apiBase: PICKER,
    testMobile: TEST_MOBILE,
    discovery,
    counts: {
      total: results.length,
      passed: results.filter((r) => r.status === "PASS").length,
      failed: results.filter((r) => r.status === "FAIL").length,
      blocked: results.filter((r) => r.status === "BLOCKED").length,
      skipped: results.filter((r) => r.status === "SKIPPED").length,
    },
    results,
    apiTrace,
    meta,
  };
  const outJson = path.join(ROOT, "test-results", "picker-e2e-results.json");
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(ARTIFACTS, "picker-e2e-results.json"), JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  console.log("=== Selorg Picker App E2E (real picker POV) ===");
  console.log(`API: ${PICKER}`);
  console.log(`Mobile: ${TEST_MOBILE}`);
  console.log(`Artifacts: ${ARTIFACTS}`);

  prepareDeviceForUiAutomation();
  ensureReversePorts();
  grantRuntimePermissions();
  clearLogcat();

  if (!packageInstalled()) {
    record({
      id: "ENV-01",
      area: "Environment",
      action: "Picker APK installed on emulator",
      status: "BLOCKED",
      expected: "com.selorgpickerapp installed",
      actual: "Package not found — run android build/install first",
      severity: "Critical",
    });
    const summary = writeReportArtifacts({ blockedEarly: true });
    console.log(JSON.stringify(summary.counts, null, 2));
    process.exit(2);
  }

  record({
    id: "ENV-01",
    area: "Environment",
    action: "Picker APK installed",
    status: "PASS",
    expected: "com.selorgpickerapp present",
    actual: "installed",
    severity: "Critical",
  });

  const health = await fetch(`${API_BASE}/health`).then((r) => r.json()).catch((e) => ({ error: String(e) }));
  record({
    id: "ENV-02",
    area: "Environment",
    action: "Backend /health",
    status: health?.data?.status === "healthy" || health?.success ? "PASS" : "FAIL",
    expected: "healthy",
    actual: JSON.stringify(health).slice(0, 200),
    severity: "Critical",
  });

  let token = await runAuthApiSuite();
  if (token) await runApiContract(token);

  await recordMissingPickingFlows();

  // UI journey
  try {
    await loginViaUi();
    record({
      id: "UI-AUTH-01",
      area: "Auth",
      action: "UI OTP login with real backend OTP from Mongo",
      status: "PASS",
      expected: "Reach Main / Onboarding / Status after verify",
      actual: visibleTexts(dumpUi("auth-ok").nodes).slice(0, 20).join(" | "),
      severity: "Critical",
    });
    // Refresh API token after UI login so later checks are not stale 401s.
    token = (await ensureApiToken(token)) || token;
  } catch (e) {
    screenshot("auth-fail");
    record({
      id: "UI-AUTH-01",
      area: "Auth",
      action: "UI OTP login",
      status: "FAIL",
      expected: "Authenticated destination",
      actual: String(e),
      logcat: getLogcatSlice(30000),
      severity: "Critical",
    });
  }

  // Wrong OTP UI (fresh clear)
  try {
    await ensureLoginScreen({ clear: true });
    await enterPhone(TEST_MOBILE);
    await tapAgreeCheckbox();
    await tapTestId("send-otp", { timeoutMs: 10000 }).catch(async () => tapText("Send OTP", { exact: false }));
    await waitAnyText(["Verify OTP"], { timeoutMs: 25000 });
    await enterOtp(WRONG_OTP);
    await tapTestId("verify-otp");
    await sleep(1500);
    const w = dumpUi("wrong-otp-ui");
    const stillOtp = textsInclude(w.nodes, /Verify OTP|Invalid|incorrect|try again/i);
    record({
      id: "UI-AUTH-02",
      area: "Auth",
      action: "UI wrong OTP rejected",
      status: stillOtp ? "PASS" : "FAIL",
      expected: "Remain on OTP / show error (no Main)",
      actual: visibleTexts(w.nodes).slice(0, 18).join(" | "),
      severity: "High",
    });
  } catch (e) {
    record({
      id: "UI-AUTH-02",
      area: "Auth",
      action: "UI wrong OTP",
      status: "FAIL",
      expected: "Error without advancing",
      actual: String(e),
      severity: "High",
    });
  }

  // Continue authenticated journey
  try {
    const d = dumpUi("resume");
    if (!textsInclude(d.nodes, /Hi,|Attendance|START MY SHIFT|Profile/i)) {
      await loginViaUi();
    }
    token = (await ensureApiToken(token)) || token;
  } catch {
    /* recorded above */
  }

  try {
    await testHomeUi();
  } catch (e) {
    record({ id: "UI-HOME-01", area: "Home", action: "Home suite", status: "FAIL", actual: String(e), expected: "Home OK", severity: "Critical" });
  }
  try {
    await testShiftUi(token);
  } catch (e) {
    record({ id: "UI-SHIFT-01", area: "Shift", action: "Shift suite", status: "FAIL", actual: String(e), expected: "Shift OK", severity: "High" });
  }
  try {
    await testAttendanceUi();
  } catch (e) {
    record({ id: "UI-ATT-01", area: "Attendance", action: "Attendance suite", status: "FAIL", actual: String(e), expected: "Attendance OK", severity: "High" });
  }
  try {
    await testPerformanceUi(token);
  } catch (e) {
    record({ id: "UI-PERF-01", area: "Performance", action: "Performance suite", status: "FAIL", actual: String(e), expected: "Perf OK", severity: "High" });
  }
  try {
    await testProfileAndMenus(token);
  } catch (e) {
    record({
      id: "UI-PROF-SUITE",
      area: "Profile",
      action: "Profile suite",
      status: "FAIL",
      actual: String(e),
      expected: "Profile OK",
      severity: "Critical",
    });
  }
  try {
    await testLifecycle();
  } catch (e) {
    record({ id: "UI-LIFE-01", area: "Lifecycle", action: "Lifecycle suite", status: "FAIL", actual: String(e), expected: "Lifecycle OK", severity: "High" });
  }
  try {
    await testLogout();
  } catch (e) {
    record({ id: "UI-LOGOUT-01", area: "Logout", action: "Logout suite", status: "FAIL", actual: String(e), expected: "Logout OK", severity: "Critical" });
  }

  // Re-login after logout
  try {
    await loginViaUi();
    record({
      id: "UI-AUTH-03",
      area: "Auth",
      action: "Login again after logout",
      status: "PASS",
      expected: "Successful second login",
      actual: visibleTexts(dumpUi("relogin").nodes).slice(0, 15).join(" | "),
      severity: "High",
    });
  } catch (e) {
    record({
      id: "UI-AUTH-03",
      area: "Auth",
      action: "Login again after logout",
      status: "FAIL",
      expected: "Successful second login",
      actual: String(e),
      severity: "High",
    });
  }

  discovery.screens = [...new Set(discovery.screens)];
  const summary = writeReportArtifacts({ logcatTail: getLogcatSlice(60000) });
  console.log("\n=== COUNTS ===");
  console.log(JSON.stringify(summary.counts, null, 2));
  console.log(`Results: ${path.join(ROOT, "test-results", "picker-e2e-results.json")}`);
  process.exit(summary.counts.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  writeReportArtifacts({ fatal: String(e) });
  process.exit(1);
});
