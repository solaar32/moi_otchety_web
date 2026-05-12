import nodemailer from 'nodemailer';

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://vek32work.ru';
}

export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.FROM_EMAIL);
}

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP не настроен');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  await transporter.sendMail({ from: process.env.FROM_EMAIL, to, subject, text, html });
}
