const express = require('express');
const app = express();

app.use(express.json());

// Обрабатываем HEAD-запросы (Telegram проверяет)
app.head('/webhook', (req, res) => {
  console.log('HEAD /webhook');
  res.sendStatus(200);
});

app.get('/webhook', (req, res) => {
  console.log('GET /webhook');
  res.send('OK');
});

app.post('/webhook', (req, res) => {
  console.log('POST /webhook получил данные');
  // Важно: сначала ответ, потом логирование
  res.sendStatus(200);
  
  // Логируем тело запроса
  console.log('Тело:', JSON.stringify(req.body));
});

app.get('/', (req, res) => {
  res.send('Bot is alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
