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
            /* Reset and base styles */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Baloo 2', cursive;
                background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%);
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                color: #ffffff;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            
            .email-header {
                background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            
            .email-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="0.5" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.8" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
                opacity: 0.3;
            }
            
            .logo {
                font-size: 2.5rem;
                font-weight: 700;
                color: white;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            
            .email-title {
                font-size: 1.75rem;
                font-weight: 600;
                color: white;
                margin: 0;
                position: relative;
                z-index: 1;
            }
            
            .email-body {
                padding: 40px 30px;
                text-align: center;
            }
            
            .message {
                font-size: 1.1rem;
                line-height: 1.6;
                color: #cbd5e1;
                margin-bottom: 40px;
            }
            
            .otp-container {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(124, 58, 237, 0.5);
                border-radius: 16px;
                padding: 30px 20px;
                margin: 40px 0;
                position: relative;
            }
            
            .otp-label {
                font-size: 0.9rem;
                color: #94a3b8;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 500;
            }
            
            .otp-code {
                font-family: 'Montserrat', monospace;
                font-size: 2.5rem;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 8px;
                margin: 10px 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .otp-expires {
                font-size: 0.85rem;
                color: #94a3b8;
                margin-top: 15px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 1rem;
                margin: 20px 0;
                box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
                transition: all 0.3s ease;
            }
            
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(124, 58, 237, 0.4);
            }
            
            .security-notice {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 30px 0;
                text-align: left;
            }
            
            .security-notice .icon {
                display: inline-block;
                margin-right: 8px;
                font-size: 1.2rem;
            }
            
            .security-notice .title {
                font-weight: 600;
                color: #fca5a5;
                margin-bottom: 8px;
            }
            
            .security-notice .text {
                font-size: 0.9rem;
                color: #cbd5e1;
                line-height: 1.5;
            }
            
            .email-footer {
                background: rgba(15, 23, 42, 0.8);
                padding: 30px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .footer-text {
                color: #64748b;
                font-size: 0.85rem;
                line-height: 1.5;
                margin-bottom: 15px;
            }
            
            .footer-links {
                margin-top: 20px;
            }
            
            .footer-links a {
                color: #a855f7;
                text-decoration: none;
                margin: 0 15px;
                font-size: 0.85rem;
            }
            
            .footer-links a:hover {
                color: #c084fc;
            }
            
            /* Responsive design */
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                
                .email-header {
                    padding: 30px 20px;
                }
                
                .email-body {
                    padding: 30px 20px;
                }
                
                .logo {
                    font-size: 2rem;
                }
                
                .email-title {
                    font-size: 1.5rem;
                }
                
                .otp-code {
                    font-size: 2rem;
                    letter-spacing: 4px;
                }
                
                .message {
                    font-size: 1rem;
                }
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
                        If you didn't request this verification code, please ignore this email and ensure your account is secure. 
                        Consider changing your password if you suspect unauthorized access.
                    </div>
                </div>
                `
                    : ''
                }
                
                <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 30px;">
                    Having trouble? Copy and paste this code manually: <strong style="color: #ffffff;">${otp}</strong>
                </p>
            </div>
            
            <div class="email-footer">
                <p class="footer-text">
                    This email was sent from Vigilo. If you didn't request this, please ignore this email.
                </p>
                <p class="footer-text">
                    For security reasons, never share this code with anyone.
                </p>
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
