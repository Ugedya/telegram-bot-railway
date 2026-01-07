const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const app = express();

app.use(express.json());

// ВАЖНО: Обработчик вебхука ДО создания бота
app.post('/webhook', (req, res) => {
  // Telegram требует быстрого ответа 200
  res.sendStatus(200);
  
  // Создаём бота только при получении данных
  const bot = new TelegramBot(token);
  
  // Обрабатываем обновление
  bot.processUpdate(req.body);
  
  // Обработчики
  bot.once('message', (msg) => {
    console.log('📩 От', msg.from.username, ':', msg.text);
    if (msg.text === '/start') {
      bot.sendMessage(msg.chat.id, 'Бот работает через вебхук!');
    }
  });
  
  bot.once('web_app_data', (msg) => {
    console.log('🎮 Данные игры:', msg.web_app_data.data);
    bot.sendMessage(msg.chat.id, `Получил: ${msg.web_app_data.data}`);
  });
});

// Простая проверка доступности
app.get('/webhook', (req, res) => {
  res.send('OK');
});

app.get('/', (req, res) => {
  res.send('Bot is alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на ${PORT}`);
});
