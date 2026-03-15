// config/emailTemplates.js
// Beautiful HTML email templates for CineVerse

/* ─────────────────────────────────────────────────────────────────
   Shared shell (header + footer wrapper)
───────────────────────────────────────────────────────────────── */
function shell(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CineVerse</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#141414;border-radius:16px;
                    overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a0a0a 0%,#2d0d0d 100%);
                     padding:32px 40px;text-align:center;border-bottom:2px solid #e50914;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <span style="font-size:28px;">🎬</span>
              <span style="font-size:26px;font-weight:800;
                           background:linear-gradient(90deg,#e50914,#ff6b6b);
                           -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                           background-clip:text;letter-spacing:-0.5px;">CineVerse</span>
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0d0d0d;padding:24px 40px;text-align:center;
                     border-top:1px solid #222;">
            <p style="margin:0 0 8px;color:#555;font-size:12px;">
              © 2025 CineVerse · The Ultimate Movie Experience
            </p>
            <p style="margin:0;color:#444;font-size:11px;">
              You received this email because you have an account on CineVerse.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────────
   OTP Email Template
───────────────────────────────────────────────────────────────── */
export function otpEmailTemplate({ name = "Movie Fan", otp }) {
  const content = `
    <h1 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:700;">
      Verify your email 🔐
    </h1>
    <p style="margin:0 0 28px;color:#999;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#e50914;">${name}</strong>, welcome to CineVerse!
      Use the one-time password below to complete your sign-up.
    </p>

    <!-- OTP BOX -->
    <div style="background:#1e1e1e;border:1.5px solid #e50914;border-radius:12px;
                 padding:28px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 12px;color:#888;font-size:13px;letter-spacing:1px;
                 text-transform:uppercase;">Your one-time password</p>
      <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#fff;
                   font-family:'Courier New',monospace;
                   text-shadow:0 0 20px rgba(229,9,20,0.5);">
        ${otp}
      </div>
      <p style="margin:14px 0 0;color:#666;font-size:12px;">
        ⏱ Valid for <strong style="color:#e50914;">10 minutes</strong> only
      </p>
    </div>

    <p style="margin:0 0 6px;color:#777;font-size:13px;line-height:1.6;">
      If you didn't request this code, you can safely ignore this email.
    </p>
    <p style="margin:0;color:#555;font-size:12px;">
      Do not share this OTP with anyone.
    </p>
  `;
  return shell(content);
}

/* ─────────────────────────────────────────────────────────────────
   Booking Confirmation Email Template
───────────────────────────────────────────────────────────────── */
export function bookingConfirmationTemplate({ name, booking }) {
  const {
    _id,
    movie = {},
    showtime,
    auditorium,
    seats = [],
    amountPaise,
    amount,
    paymentIntentId,
    currency = "INR",
  } = booking;

  const bookingId = (_id || "").toString();
  const movieTitle = movie.title || movie.movieName || "Your Movie";
  const posterUrl = movie.poster || "";

  // Format showtime
  const showtimeDate = showtime ? new Date(showtime) : null;
  const dateStr = showtimeDate
    ? showtimeDate.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" })
    : "—";
  const timeStr = showtimeDate
    ? showtimeDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    : "—";

  // Seats
  const seatList = seats
    .map((s) => {
      const id   = typeof s === "string" ? s : (s.seatId || s.id || "");
      const type = typeof s === "object" ? (s.type || "standard") : "standard";
      return `<span style="display:inline-block;margin:3px;padding:6px 10px;
                background:#1e1e1e;border:1px solid #333;border-radius:6px;
                color:#fff;font-size:13px;font-family:'Courier New',monospace;">
              ${id} <span style="color:${type === "recliner" ? "#e50914" : "#888"};font-size:11px;">${type}</span>
            </span>`;
    })
    .join("");

  // Amount
  const totalRupees = amountPaise ? (Number(amountPaise) / 100).toLocaleString("en-IN") : amount ? Number(amount).toLocaleString("en-IN") : "—";

  const posterHtml = posterUrl
    ? `<img src="${posterUrl}" alt="${movieTitle}" width="120"
            style="border-radius:8px;object-fit:cover;height:160px;
                   box-shadow:0 4px 16px rgba(229,9,20,.3);float:left;margin-right:20px;" />`
    : "";

  const content = `
    <h1 style="margin:0 0 6px;color:#fff;font-size:22px;font-weight:700;">
      Booking Confirmed! 🎉
    </h1>
    <p style="margin:0 0 28px;color:#999;font-size:14px;">
      Hi <strong style="color:#e50914;">${name}</strong>, your seats are locked in. Enjoy the show!
    </p>

    <!-- MOVIE CARD -->
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;
                 padding:24px;margin-bottom:24px;overflow:hidden;">
      <div style="overflow:hidden;">
        ${posterHtml}
        <div>
          <h2 style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:800;">
            ${movieTitle}
          </h2>
          <p style="margin:0 0 4px;color:#888;font-size:13px;">
            📅 ${dateStr}
          </p>
          <p style="margin:0 0 4px;color:#888;font-size:13px;">
            🕐 ${timeStr}
          </p>
          <p style="margin:0;color:#888;font-size:13px;">
            🏛 ${auditorium || "Audi 1"}
          </p>
        </div>
        <div style="clear:both;"></div>
      </div>
    </div>

    <!-- SEATS -->
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:12px;
                 padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 12px;color:#888;font-size:12px;letter-spacing:1px;
                 text-transform:uppercase;">Your Seats (${seats.length})</p>
      <div>${seatList || '<span style="color:#666">No seats listed</span>'}</div>
    </div>

    <!-- AMOUNT & BOOKING ID -->
    <div style="background:#1e1e1e;border:1.5px solid #e50914;border-radius:12px;
                 padding:20px;margin-bottom:24px;display:flex;">
      <table width="100%">
        <tr>
          <td style="color:#888;font-size:13px;padding-bottom:8px;">Booking ID</td>
          <td align="right" style="color:#ccc;font-size:12px;font-family:'Courier New',monospace;
                                    padding-bottom:8px;">${bookingId}</td>
        </tr>
        ${paymentIntentId ? `
        <tr>
          <td style="color:#888;font-size:13px;padding-bottom:8px;">Payment ID</td>
          <td align="right" style="color:#ccc;font-size:12px;font-family:'Courier New',monospace;
                                    padding-bottom:8px;">${paymentIntentId}</td>
        </tr>` : ""}
        <tr>
          <td style="color:#fff;font-size:16px;font-weight:700;border-top:1px solid #2a2a2a;
                      padding-top:12px;">Total Paid</td>
          <td align="right" style="color:#e50914;font-size:20px;font-weight:800;
                                    border-top:1px solid #2a2a2a;padding-top:12px;">
            ₹${totalRupees}
          </td>
        </tr>
      </table>
    </div>

    <!-- REMINDER -->
    <div style="background:#0f1a10;border:1px solid #1a3a1a;border-radius:10px;padding:16px;
                 text-align:center;">
      <p style="margin:0;color:#4caf50;font-size:13px;">
        📱 Show this email or your QR code at the venue for entry.
      </p>
    </div>
  `;

  return shell(content);
}
