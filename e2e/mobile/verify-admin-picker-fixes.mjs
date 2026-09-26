/**
 * Quick verify: Admin ↔ Picker directory / salary / OT fixes.
 * Prints PASS/FAIL lines. Does not invent salary numbers.
 *
 * Usage: node e2e/mobile/verify-admin-picker-fixes.mjs
 */
const API_BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3333").replace(/\/$/, "");
const ADMIN = `${API_BASE}/api/v1/admin`;
const ADMIN_PICKER = `${API_BASE}/api/v1/admin/picker`;

const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || "hemanathc0112@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || "Selorg@2024";
const PICKER_PHONE = (process.env.PICKER_TEST_MOBILE || "9556686269").replace(/\D/g, "").slice(-10);
const PICKER_OID = process.env.PICKER_TEST_ID || "6aaa77cf6d1b1c92cacfd3b6";

let pass = 0;
let fail = 0;

function line(ok, msg) {
  if (ok) {
    pass += 1;
    console.log(`PASS  ${msg}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${msg}`);
  }
}

async function api(method, url, { token, body } = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function pickersFrom(json) {
  const d = json?.data ?? json;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.pickers)) return d.pickers;
  if (Array.isArray(d?.list)) return d.list;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

async function loginAdmin() {
  const primary = await api("POST", `${ADMIN}/auth/login`, {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "admin" },
  });
  let token = primary.json?.data?.token;
  if (primary.status === 200 && token) return token;
  const alt = await api("POST", `${ADMIN}/auth/login`, {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "Operations Admin" },
  });
  token = alt.json?.data?.token;
  if (alt.status === 200 && token) return token;
  throw new Error(`Admin login failed: ${primary.status}/${alt.status}`);
}

async function main() {
  console.log(`API_BASE=${API_BASE}`);
  console.log(`Target picker phone=${PICKER_PHONE} id=${PICKER_OID}\n`);

  let token;
  try {
    token = await loginAdmin();
    line(true, "Admin login");
  } catch (err) {
    line(false, `Admin login — ${err.message || err}`);
    console.log(`\nRESULT: FAIL (${fail} failed, ${pass} passed)`);
    process.exit(1);
  }

  // 1) Directory: picker-role only by default (no rider pollution)
  const listRes = await api("GET", `${ADMIN_PICKER}/pickers?limit=200`, { token });
  const pickers = pickersFrom(listRes.json);
  line(listRes.status === 200, `GET /pickers → ${listRes.status} (n=${pickers.length})`);

  const riders = pickers.filter((p) => {
    const role = String(p.workforceRole || "").toLowerCase();
    const source = String(p.source || "").toLowerCase();
    if (source === "hhd" || source === "hhd_users") return false; // tagged HSD ok if present
    return role === "rider" || role === "";
  });
  const hsdUntagged = pickers.filter((p) => {
    const role = String(p.workforceRole || "").toLowerCase();
    const source = String(p.source || "").toLowerCase();
    return role === "hsd" && source !== "hhd" && source !== "hhd_users";
  });
  const good = pickers.filter((p) => {
    const role = String(p.workforceRole || "").toLowerCase();
    const source = String(p.source || "").toLowerCase();
    return role === "picker" || source === "hhd" || source === "hhd_users" || source === "picker_users";
  });
  line(
    riders.length === 0,
    `Directory rider pollution ≈ 0 (polluted=${riders.length}, good=${good.length}/${pickers.length})`,
  );
  line(
    hsdUntagged.length === 0,
    `HSD rows tagged when present (untagged=${hsdUntagged.length})`,
  );
  line(
    pickers.every((p) => {
      const id = String(p.id || p._id || "");
      return /^[a-f0-9]{24}$/i.test(id);
    }) || pickers.length === 0,
    "List ids are Mongo ObjectIds (24 hex)",
  );

  // 2) Salary monthly for target picker
  const salaryById = await api(
    "GET",
    `${ADMIN_PICKER}/salary/monthly?pickerId=${encodeURIComponent(PICKER_OID)}`,
    { token },
  );
  const salaryByPhone = await api(
    "GET",
    `${ADMIN_PICKER}/salary/monthly?pickerId=${encodeURIComponent(PICKER_PHONE)}`,
    { token },
  );
  const sal =
    salaryById.status === 200 ? salaryById : salaryByPhone.status === 200 ? salaryByPhone : salaryById;
  const finalSalary = sal.json?.data?.finalSalary ?? sal.json?.finalSalary;
  const fixedSalary =
    sal.json?.data?.fixedSalary ??
    sal.json?.data?.regular?.fixedSalary ??
    sal.json?.data?.config?.monthlySalary;
  line(
    sal.status === 200 && Number(finalSalary) === 13000 && Number(fixedSalary) === 13000,
    `GET /salary/monthly (picker ${PICKER_PHONE}/${PICKER_OID}) → ${sal.status} fixed=${fixedSalary ?? "n/a"} final=${finalSalary ?? "n/a"} (expect ₹13000)`,
  );

  const payroll = await api("GET", `${ADMIN_PICKER}/payroll`, { token });
  const payrollRows =
    payroll.json?.data?.rows ||
    payroll.json?.data?.payroll ||
    payroll.json?.data?.items ||
    [];
  line(
    payroll.status === 200 && Array.isArray(payrollRows),
    `GET /payroll → ${payroll.status} rows=${Array.isArray(payrollRows) ? payrollRows.length : "n/a"}`,
  );

  // 3) OT requests (array; empty is OK)
  const ot = await api("GET", `${ADMIN_PICKER}/ot-requests`, { token });
  const otReq = ot.json?.data?.requests ?? ot.json?.requests;
  line(
    ot.status === 200 && Array.isArray(otReq),
    `GET /ot-requests → ${ot.status} array=${Array.isArray(otReq)} len=${Array.isArray(otReq) ? otReq.length : "n/a"}`,
  );

  console.log(`\nRESULT: ${fail === 0 ? "PASS" : "FAIL"} (${pass} passed, ${fail} failed)`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  console.log("\nRESULT: FAIL (uncaught)");
  process.exit(1);
});
