const { sendTrackingPush } = require("./notification");

/** status_number → card step (contract §02). Status 16 uses last reached step. */
const STATUS_TO_STEP = {
  1: "0",
  11: "0",
  14: "1",
  8: "2",
  18: "4",
  10: "5",
  4: "6",
  15: "5",
};

const TRACKING_STATUSES = new Set([1, 11, 14, 8, 18, 10, 4, 15, 16]);
const TERMINAL_STATUSES = new Set([4, 15, 16]);

function isTrackingStatus(statusNumber) {
  return TRACKING_STATUSES.has(parseInt(statusNumber, 10));
}

function resolveStep(statusNumber, previousStatus) {
  const status = parseInt(statusNumber, 10);
  if (status === 16) {
    const prev = parseInt(previousStatus, 10);
    if (!Number.isNaN(prev) && STATUS_TO_STEP[prev] != null) {
      return STATUS_TO_STEP[prev];
    }
    return "0";
  }
  return STATUS_TO_STEP[status] != null ? STATUS_TO_STEP[status] : null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatClock(date, lang) {
  let hours = date.getHours();
  const minutes = pad2(date.getMinutes());
  if (lang === "ar") {
    const isPm = hours >= 12;
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${isPm ? "م" : "ص"}`;
  }
  const isPm = hours >= 12;
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes} ${isPm ? "PM" : "AM"}`;
}

function formatEtaRange(deliveryTime, lang = "en") {
  if (!deliveryTime) return "";
  const start = new Date(deliveryTime);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  return `${formatClock(start, lang)} – ${formatClock(end, lang)}`;
}

function resolveCopy(local, statusNumber, orderId) {
  const status = parseInt(statusNumber, 10);
  const titleKey = `tracking_title_${status}`;
  const bodyKey = `tracking_body_${status}`;
  const title = local[titleKey] || "";
  const bodyFn = local[bodyKey];
  const body =
    typeof bodyFn === "function"
      ? bodyFn(orderId)
      : bodyFn || title;

  return {
    title,
    body,
    status: body,
    etaLabel: local.tracking_eta_label || "",
    onTime: local.tracking_on_time || "",
    guarantee: local.tracking_guarantee || "",
  };
}

/**
 * Send live-order tracking push for a status change when the status is in the tracking map.
 * Non-tracking statuses should keep using common.send_to_multiple.
 */
async function notifyOrderTracking({
  token,
  orderId,
  statusNumber,
  previousStatus,
  local,
  lang = "en",
  deliveryTime,
  alert = "true",
}) {
  if (!token || !orderId || !isTrackingStatus(statusNumber)) {
    return { success: false, skipped: true };
  }

  const step = resolveStep(statusNumber, previousStatus);
  if (step == null) {
    return { success: false, skipped: true };
  }

  const status = parseInt(statusNumber, 10);
  const ongoing = TERMINAL_STATUSES.has(status) ? "false" : "true";
  const copy = resolveCopy(local, status, orderId);
  const etaRange = formatEtaRange(deliveryTime, lang);

  return sendTrackingPush({
    token,
    orderId: String(orderId),
    step,
    ongoing,
    alert: String(alert),
    etaLabel: copy.etaLabel,
    etaRange,
    onTime: copy.onTime,
    status: copy.status,
    guarantee: copy.guarantee,
    title: copy.title,
    body: copy.body,
  });
}

module.exports = {
  isTrackingStatus,
  resolveStep,
  formatEtaRange,
  notifyOrderTracking,
  TRACKING_STATUSES,
  STATUS_TO_STEP,
};
