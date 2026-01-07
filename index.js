const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

// Токен возьмём из переменной окружения
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);
const app = express();

app.use(express.json());

// Вебхук endpoint
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Обработка сообщений
bot.on('message', (msg) => {
  console.log('📩 Сообщение от:', msg.from.username);
  
  if (msg.text === '/start') {
    bot.sendMessage(msg.chat.id, 'Бот на Railway работает!');
  }
});

// Обработка данных от Mini App
bot.on('web_app_data', (msg) => {
  const data = msg.web_app_data.data;
  console.log('🎮 Данные от игры:', data);
  
  bot.sendMessage(msg.chat.id, `✅ Получил: ${data}`);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
