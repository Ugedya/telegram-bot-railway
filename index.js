const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);
const app = express();

app.use(express.json());

// Логируем ВСЕ входящие запросы
app.use((req, res, next) => {
  console.log('📥 Входящий запрос:', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Для проверки вебхука Telegram
app.get('/webhook', (req, res) => {
  console.log('✅ GET /webhook - проверка доступности');
  res.send('Telegram Bot Webhook');
});

// Основной обработчик вебхука
app.post('/webhook', (req, res) => {
  console.log('📨 Telegram отправил данные:', JSON.stringify(req.body, null, 2));
  
  // Сразу отвечаем Telegram 200 OK (важно!)
  res.status(200).send();
  
  // Обрабатываем данные асинхронно
  setTimeout(() => {
    try {
      bot.processUpdate(req.body);
    } catch (err) {
      console.error('❌ Ошибка обработки:', err);
    }
  }, 0);
});

// Обработчики бота
bot.on('message', (msg) => {
  console.log('📩 Сообщение от:', msg.from.username, 'Текст:', msg.text);
  
  if (msg.text === '/start') {
    bot.sendMessage(msg.chat.id, '✅ Бот на Railway работает!');
    console.log('✅ Отправил ответ на /start');
  }
});

bot.on('web_app_data', (msg) => {
  const data = msg.web_app_data.data;
  console.log('🎮 Данные от игры:', data);
  bot.sendMessage(msg.chat.id, `✅ Получил: ${data}`);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Webhook URL: https://telegram-bot-railway-production-2095.up.railway.app/webhook`);
  console.log(`🤖 Токен бота: ${token ? 'есть' : 'НЕТ!'}`);
});
