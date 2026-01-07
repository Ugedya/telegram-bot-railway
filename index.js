const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);
bot.on('raw', (update) => {
  console.log('📦 RAW update:', JSON.stringify(update));
});
// Telegram будет проверять этот endpoint
app.get('/webhook', (req, res) => {
  console.log('GET /webhook - проверка');
  res.send('OK');
});

// Основной endpoint
app.post('/webhook', (req, res) => {
  console.log('POST /webhook получил обновление');
  res.sendStatus(200); // ВАЖНО: сразу отвечаем
  
  // Обрабатываем обновление
  bot.processUpdate(req.body);
});

// Обработчик сообщений
bot.on('message', (msg) => {
  console.log('📩 Сообщение:', msg.text);
  
  if (msg.text === '/start') {
    bot.sendMessage(msg.chat.id, 'Бот работает через вебхук!');
  }
});

// Обработчик данных от Mini App
bot.on('web_app_data', (msg) => {
  console.log('🎮 Данные от игры:', msg.web_app_data.data);
  bot.sendMessage(msg.chat.id, `✅ Получил: ${msg.web_app_data.data}`);
});

// Корень для проверки
app.get('/', (req, res) => {
  res.send('Сервер работает');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
