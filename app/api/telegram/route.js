export async function POST(request) {
    try {
      const { message } = await request.json();
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({chat_id: chatId, text: message})
        }
      );
      
      const data = await response.json();
      
      return Response.json({ success: true, data });
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }
  }