const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async function sendMail({ to, subject, text, html }) {
    return transporter.sendMail({
      from: `"Social Network" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
  }
  
  module.exports = { sendMail };