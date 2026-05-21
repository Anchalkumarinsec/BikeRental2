const sendEmail = async (options) => {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.EMAIL_PASS;
  
  if (!brevoApiKey) {
    console.error('Brevo API key is missing. Please set BREVO_API_KEY in .env');
    return;
  }

  const payload = {
    sender: {
      name: 'BikeRentLelo',
      email: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@bikerentlelo.com',
    },
    to: [{ email: options.email }],
    subject: options.subject,
    textContent: options.message,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo email failed:', errorData);
      throw new Error(`Email sending failed: ${response.statusText}`);
    }

    console.log(`Email successfully sent to ${options.email} via Brevo API`);
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
};

module.exports = sendEmail;
