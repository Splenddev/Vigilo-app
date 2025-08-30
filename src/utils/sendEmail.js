import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // your Gmail App Password
  },
});

const sendEmail = async (data) => {
  const { to, text = '', subject, html } = data;
  try {
    const info = await transporter.sendMail({
      from: `"Vigilo App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || 'Your email client does not support HTML messages',
      html: html,
    });

    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    throw err;
  }
};

export default sendEmail;
