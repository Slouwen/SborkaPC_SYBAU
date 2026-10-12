const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'Public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.get('/components', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'components.html'));
});

app.get('/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'orders.html'));
});

app.listen(PORT, () => {
    console.log(`Сайт запущен: http://localhost:${PORT}`);
});