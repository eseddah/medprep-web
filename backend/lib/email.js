const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    const error = new Error('Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  let response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    const error = new Error('Email provider could not be reached. Try again later.');
    error.code = 'EMAIL_PROVIDER_UNAVAILABLE';
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`Email provider rejected the message (HTTP ${response.status}).`);
    error.code = 'EMAIL_DELIVERY_FAILED';
    throw error;
  }

  return response.json();
}

function sendEmailNotificationsEnabled(user) {
  const name = escapeHtml(user.name || 'student');
  return sendEmail({
    to: user.email,
    subject: 'MedPrep email notifications are on',
    text: `Hi ${user.name || 'student'},\n\nEmail notifications are now enabled for your MedPrep account. You can change this preference at any time in Settings.\n\nMedPrep`,
    html: `<main style="font-family:Arial,sans-serif;line-height:1.6;color:#182622"><h1 style="font-size:22px">Email notifications are on</h1><p>Hi ${name},</p><p>Email notifications are now enabled for your MedPrep account.</p><p>You can change this preference at any time in Settings.</p><p>MedPrep</p></main>`,
  });
}

function sendDailyStudyReminder(user) {
  const name = escapeHtml(user.name || 'student');
  const streak = Math.max(0, user.currentStreak || 0);
  const streakLine = streak
    ? `Your current study streak is ${streak} day${streak === 1 ? '' : 's'}.`
    : 'A short study session today is a good way to get started.';
  return sendEmail({
    to: user.email,
    subject: 'Your MedPrep study reminder',
    text: `Hi ${user.name || 'student'},\n\n${streakLine} Complete a lesson, quiz, or review in MedPrep today.\n\nMedPrep`,
    html: `<main style="font-family:Arial,sans-serif;line-height:1.6;color:#182622"><h1 style="font-size:22px">A little study goes a long way</h1><p>Hi ${name},</p><p>${escapeHtml(streakLine)}</p><p>Complete a lesson, quiz, or review in MedPrep today.</p><p>MedPrep</p></main>`,
  });
}

module.exports = { sendEmail, sendEmailNotificationsEnabled, sendDailyStudyReminder };