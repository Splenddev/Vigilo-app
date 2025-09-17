import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
