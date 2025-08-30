import crypto from 'crypto';

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const getOtpKey = (email, purpose = 'email_verification') =>
  `${email}:${purpose}`;

const getAttemptKey = (email, purpose = 'email_verification') =>
  `attempts:${email}:${purpose}`;

const getEmailTemplate = (otp, purpose) => {
  const templates = {
    email_verification: {
      subject: 'Verify Your Email Address - Vigilo',
      html: generateEmailHTML(otp, {
        title: 'Verify Your Email',
        message:
          'Welcome! Please verify your email address to complete your registration.',
        ctaText: 'Verify Email',
        purpose: 'email_verification',
      }),
    },
    password_reset: {
      subject: 'Reset Your Password - Vigilo',
      html: generateEmailHTML(otp, {
        title: 'Reset Your Password',
        message:
          'We received a request to reset your password. Use the code below to create a new password.',
        ctaText: 'Reset Password',
        purpose: 'password_reset',
      }),
    },
    login_verification: {
      subject: 'Login Verification - Vigilo',
      html: generateEmailHTML(otp, {
        title: 'Verify Your Login',
        message:
          "Someone is trying to access your account. Please verify it's you with the code below.",
        ctaText: 'Verify Login',
        purpose: 'login_verification',
      }),
    },
  };
  return templates[purpose] || templates.email_verification;
};

const generateEmailHTML = (otp, config) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        /* Reset */
        * { margin:0; padding:0; box-sizing:border-box; }

        body {
          font-family: 'Baloo 2', cursive, sans-serif;
          background: #f9fafb;
          color: #111827;
          padding: 20px;
        }

        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .email-header {
          background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }

        .logo { font-size: 2rem; font-weight: 700; }
        .email-title { font-size: 1.5rem; font-weight: 600; }

        .email-body { padding: 30px 20px; text-align:center; }
        .message { font-size: 1rem; color: #374151; margin-bottom: 30px; }

        .otp-container {
          border: 2px solid #6366f1;
          border-radius: 12px;
          padding: 20px;
          margin: 30px 0;
          background: #f3f4f6;
        }
        .otp-label { font-size: 0.8rem; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
        .otp-code {
          font-family: 'Montserrat', monospace;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: 6px;
          color: #111827;
        }
        .otp-expires { font-size: 0.8rem; color: #6b7280; margin-top: 10px; }

        .security-notice {
          border: 1px solid #f87171;
          background: #fee2e2;
          border-radius: 10px;
          padding: 15px;
          text-align: left;
          margin-top: 20px;
        }
        .security-notice .title { font-weight:600; color:#b91c1c; margin-bottom:5px; }
        .security-notice .text { font-size:0.9rem; color:#374151; }

        .email-footer {
          background: #f9fafb;
          padding: 20px;
          text-align:center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text { font-size: 0.8rem; color: #6b7280; margin-bottom: 10px; }
        .footer-links a { color: #6366f1; margin: 0 10px; font-size:0.8rem; text-decoration:none; }

        /* Dark Mode Overrides */
        @media (prefers-color-scheme: dark) {
          body { background:#0f172a; color:#f1f5f9; }
          .email-container { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); }
          .message { color:#cbd5e1; }
          .otp-container { background:rgba(255,255,255,0.1); border-color:#7c3aed; }
          .otp-code { color:white; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
          .otp-label, .otp-expires { color:#94a3b8; }
          .security-notice { background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.4); }
          .security-notice .text { color:#cbd5e1; }
          .email-footer { background:rgba(15,23,42,0.9); border-color:rgba(255,255,255,0.1); }
          .footer-text { color:#64748b; }
          .footer-links a { color:#a855f7; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="logo">Vigilo</div>
          <h1 class="email-title">${config.title}</h1>
        </div>

        <div class="email-body">
          <p class="message">${config.message}</p>
          <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expires">⏱️ Expires in 10 minutes</div>
          </div>
          ${
            config.purpose === 'login_verification'
              ? `
              <div class="security-notice">
                <div class="title">🔒 Security Notice</div>
                <div class="text">
                  If you didn’t request this verification code, ignore this email and check your account security.
                </div>
              </div>`
              : ''
          }
          <p style="font-size:0.85rem;color:#6b7280;margin-top:25px;">
            Trouble? Copy this code manually: <strong>${otp}</strong>
          </p>
        </div>

        <div class="email-footer">
          <p class="footer-text">This email was sent from Vigilo. If you didn’t request this, please ignore it.</p>
          <p class="footer-text">For security, never share this code with anyone.</p>
          <div class="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export { generateOTP, hashOTP, getOtpKey, getAttemptKey, getEmailTemplate };
