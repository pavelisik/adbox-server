const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const advertsRouter = require('./routes/adverts');
const authRouter = require('./routes/auth');
const categoriesRouter = require('./routes/categories');
const commentsRouter = require('./routes/comments');
const imagesRouter = require('./routes/images');
const usersRouter = require('./routes/users');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/Advert', advertsRouter);
app.use('/Authorization', authRouter);
app.use('/Categories', categoriesRouter);
app.use('/Comment', authRouter);
app.use('/Images', authRouter);
app.use('/Users', authRouter);

app.get('/', (req, res) => {
    res.json({ ok: true, api: 'AdBox' });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
