const express = require('express');
const app = express();

app.use(express.json());

// Telegram будет проверять этот endpoint
app.get('/webhook', (req, res) => {
  console.log('GET /webhook - проверка');
  res.send('OK');
});

// Основной endpoint
app.post('/webhook', (req, res) => {
  console.log('POST /webhook получил:', JSON.stringify(req.body));
  res.sendStatus(200); // ВАЖНО: сразу отвечаем
});

// Корень для проверки
app.get('/', (req, res) => {
  res.send('Сервер работает');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
