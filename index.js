const express = require('express');
const crypto = require('crypto');
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ctlibigouzudjlqjixpl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bGliaWdvdXp1ZGpscWppeHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MzkxMDMsImV4cCI6MjA4MzQxNTEwM30.OGofJd4w1oHpBBsbrzzie8uR41A40TbIGMl0CUnBQgE';
const supabase = createClient(supabaseUrl, supabaseKey);
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
app.use(express.static('public'));

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

  // 3. Сохраняем результат в базу данных
  try {
    const gameType = data.startsWith('win:') ? 'guess_number' : 'other';
    
    const { error } = await supabase
      .from('game_results')
      .insert([
        {
          user_id: user_id,
          game_type: gameType,
          result: data
        }
      ]);

    if (error) {
      console.error('❌ Ошибка сохранения в базу:', error);
    } else {
      console.log('💾 Результат сохранён в базу');
    }
  } catch (dbError) {
    console.error('❌ Ошибка подключения к базе:', dbError);
  }
  
  // 4. Отправляем сообщение пользователю (в своём try-catch)
  try {
    if (data.startsWith('win:')) {
      const attempts = data.split(':')[1];
      await bot.sendMessage(user_id, `🎉 Ты угадал число с ${attempts} попытки!`);
    } else {
      await bot.sendMessage(user_id, `✅ Результат: ${data}`);
    }
  } catch (sendError) {
    console.error('❌ Ошибка отправки сообщения:', sendError);
  }
  
  // 5. Всегда отвечаем 200, даже если были ошибки в сохранении или отправке
  res.sendStatus(200);
});
// Эндпоинт для получения статистики (для дашборда)
app.get('/api/stats', async (req, res) => {
  try {
    // 1. Общее количество игр
    const { count: totalGames, error: countError } = await supabase
      .from('game_results')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 2. Количество игр по типам
    const { data: gamesByType, error: typeError } = await supabase
      .from('game_results')
      .select('game_type')
      .then(result => {
        // Группируем вручную, так как Supabase не поддерживает GROUP BY в бесплатном плане
        const grouped = {};
        result.data?.forEach(row => {
          grouped[row.game_type] = (grouped[row.game_type] || 0) + 1;
        });
        return { data: grouped, error: result.error };
      });

    if (typeError) throw typeError;

    // 3. Последние 10 игр (для таблицы)
    const { data: recentGames, error: recentError } = await supabase
      .from('game_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (recentError) throw recentError;

    // 4. Собираем ответ
    res.json({
      success: true,
      data: {
        totalGames: totalGames || 0,
        gamesByType: gamesByType || {},
        recentGames: recentGames || []
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});
// ================== МАГАЗИН ОДЕЖДЫ ==================
// Тестовый эндпоинт для проверки связи с Supabase
app.get('/api/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) throw error;
    res.json({ success: true, message: 'База данных подключена', data: data || [] });
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Эндпоинт для получения списка товаров
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ success: true, products: data || [] });
  } catch (error) {
    console.error('❌ Ошибка загрузки товаров:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки товаров' });
  }
});
// Корень для проверки
app.get('/', (req, res) => {
  res.send('Сервер работает');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
