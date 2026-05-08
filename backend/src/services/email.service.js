const { emailFromAddress, emailProvider, isProduction, resendApiKey } = require('../config/env');
const AppError = require('../utils/AppError');

const resendEndpoint = 'https://api.resend.com/emails';

const formatExpiryCopy = (expiresAt) => {
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) {
    return 'This link expires soon.';
  }

  return `This link expires at ${expiresAt.toISOString()}.`;
};

const buildPasswordResetMessage = ({ name, resetUrl, expiresAt }) => {
  const recipientName = name || 'there';
  const expiryCopy = formatExpiryCopy(expiresAt);

  return {
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Reset your Rivo password</h1>
        <p>Hello ${recipientName},</p>
        <p>We received a request to reset your password. Use the secure link below to choose a new one.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #234edf; color: #ffffff; text-decoration: none; font-weight: 700;">
            Reset password
          </a>
        </p>
        <p>${expiryCopy}</p>
        <p>If you did not request this change, you can ignore this email.</p>
      </div>
    `,
    subject: 'Reset your Rivo password',
    text: `Reset your Rivo password\n\nHello ${recipientName},\n\nUse the secure link below to choose a new password:\n${resetUrl}\n\n${expiryCopy}\n\nIf you did not request this change, you can ignore this email.`,
  };
};

const buildEmailVerificationMessage = ({ name, verificationUrl, expiresAt }) => {
  const recipientName = name || 'there';
  const expiryCopy = formatExpiryCopy(expiresAt);

  return {
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Verify your Rivo email</h1>
        <p>Hello ${recipientName},</p>
        <p>Use the secure link below to confirm that this email address belongs to your Rivo workspace.</p>
        <p style="margin: 24px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #234edf; color: #ffffff; text-decoration: none; font-weight: 700;">
            Verify email
          </a>
        </p>
        <p>${expiryCopy}</p>
        <p>If you did not create this account or change your email, you can ignore this message.</p>
      </div>
    `,
    subject: 'Verify your Rivo email',
    text: `Verify your Rivo email\n\nHello ${recipientName},\n\nUse the secure link below to confirm your account email:\n${verificationUrl}\n\n${expiryCopy}\n\nIf you did not create this account or change your email, you can ignore this message.`,
  };
};

const sendMessageWithResend = async ({ email, message, purpose }) => {
  if (!resendApiKey || !emailFromAddress) {
    throw new AppError(`${purpose} email delivery is not configured.`, 501, {
      missing: [
        !resendApiKey ? 'RESEND_API_KEY' : null,
        !emailFromAddress ? 'EMAIL_FROM_ADDRESS' : null,
      ].filter(Boolean),
    });
  }

  const response = await fetch(resendEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFromAddress,
      html: message.html,
      subject: message.subject,
      text: message.text,
      to: [email],
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AppError(`${purpose} email delivery failed.`, 502, {
      detail: payload,
      provider: 'resend',
    });
  }

  return {
    message_id: payload?.id || null,
    mode: 'email',
    provider: 'resend',
  };
};

const sendWithResend = async ({ email, expiresAt, name, resetUrl }) => {
  const message = buildPasswordResetMessage({
    expiresAt,
    name,
    resetUrl,
  });

  return sendMessageWithResend({
    email,
    message,
    purpose: 'Password reset',
  });
};

const sendPasswordResetEmail = async ({ email, expiresAt, name, resetUrl }) => {
  if (emailProvider === 'resend') {
    return sendWithResend({ email, expiresAt, name, resetUrl });
  }

  if (isProduction) {
    throw new AppError('Password reset email delivery is not configured.', 501, {
      missing: ['EMAIL_PROVIDER'],
    });
  }

  return {
    mode: 'preview',
    reset_url: resetUrl,
  };
};

const sendVerificationWithResend = async ({ email, expiresAt, name, verificationUrl }) => {
  const message = buildEmailVerificationMessage({
    expiresAt,
    name,
    verificationUrl,
  });

  return sendMessageWithResend({
    email,
    message,
    purpose: 'Email verification',
  });
};

const sendEmailVerificationEmail = async ({ email, expiresAt, name, verificationUrl }) => {
  if (emailProvider === 'resend') {
    return sendVerificationWithResend({ email, expiresAt, name, verificationUrl });
  }

  if (isProduction) {
    throw new AppError('Email verification delivery is not configured.', 501, {
      missing: ['EMAIL_PROVIDER'],
    });
  }

  return {
    mode: 'preview',
    verification_url: verificationUrl,
  };
};

module.exports = {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
};
