const express = require('express');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
//const { createClient } = require('@supabase/supabase-js');
//const supabaseUrl = process.env.SUPABASE_URL;
//const supabaseKey = process.env.SUPABASE_KEY;
//const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
app.use(express.json());

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);
// Функция проверки данных Telegram
function verifyTelegramData(initData) {
  try {
    // 1. Разбираем строку на параметры
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    // 2. Удаляем hash для проверки
    params.delete('hash');
    
    // 3. Сортируем оставшиеся параметры
    const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = sorted.map(([key, value]) => `${key}=${value}`).join('\n');
    
    // 4. Создаём секретный ключ
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.BOT_TOKEN)
      .digest();
    
    // 5. Вычисляем хэш
    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // 6. Сравниваем
    return calculatedHash === hash;
  } catch (err) {
    console.error('Ошибка проверки:', err);
    return false;
  }
}
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
app.post('/api/game-result', async (req, res) => {
  const { user_id, data, init_data } = req.body;
  
  // 1. ПРОВЕРЯЕМ ДАННЫЕ
  if (!verifyTelegramData(init_data)) {
    console.error('❌ Неверные данные Telegram!');
    return res.status(403).send('Access denied');
  }
  
  // 2. Если проверка прошла
  console.log('✅ Данные проверены, результат:', data);

  
  // 4. Отправляем сообщение пользователю
  if (data.startsWith('win:')) {
    const attempts = data.split(':')[1];
    bot.sendMessage(user_id, `🎉 Ты угадал число с ${attempts} попытки!`);
  } else {
    bot.sendMessage(user_id, `✅ Результат: ${data}`);
  }
  
  res.sendStatus(200);
});
// Корень для проверки
app.get('/', (req, res) => {
  res.send('Сервер работает');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
