import express from 'express';
import cors from 'cors';

import advertsRouter from './routes/adverts.js';
import authRouter from './routes/auth.js';
import categoriesRouter from './routes/categories.js';
import commentsRouter from './routes/comments.js';
import imagesRouter from './routes/images.js';
import usersRouter from './routes/users.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

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
