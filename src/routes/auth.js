import { Router } from 'express';
import { hash, compare } from 'bcrypt';
import sign from 'jsonwebtoken';
import prisma from '../prisma.js';

const router = Router();
const SECRET = 'dev-secret';

// POST /Auth/Register
router.post('/Register', async (req, res) => {
    try {
        const { login, name, password } = req.body;

        // Проверка обязательных полей
        if (!login || !name || !password) {
            return res.status(400).json({ userMessage: 'Missing required fields', errorCode: '400' });
        }

        // Проверка длины полей (согласно Swagger)
        if (login.length < 4 || login.length > 64 || name.length < 4 || name.length > 64 || password.length < 8 || password.length > 50) {
            return res.status(400).json({ userMessage: 'Fields do not meet length requirements', errorCode: '400' });
        }

        const exists = await prisma.user.findUnique({ where: { login } });
        if (exists) return res.status(422).json({ userMessage: 'Login already taken', errorCode: '422' });

        const passwordHash = await hash(password, 10);

        await prisma.user.create({
            data: { login, name, passwordHash },
        });

        res.status(202).send(); // Swagger: 202 Created
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// POST /Auth/Login
router.post('/Login', async (req, res) => {
    try {
        const { login, password } = req.body;

        // Проверка обязательных полей
        if (!login || !password) {
            return res.status(400).json({ userMessage: 'Missing required fields', errorCode: '400' });
        }

        const user = await prisma.user.findUnique({ where: { login } });
        if (!user) return res.status(400).json({ userMessage: 'Invalid credentials', errorCode: '400' });

        const ok = await compare(password, user.passwordHash);
        if (!ok) return res.status(400).json({ userMessage: 'Invalid credentials', errorCode: '400' });

        // Генерация JWT токена
        const token = sign({ sub: user.id, role: user.role }, SECRET, {
            expiresIn: '7d',
        });

        res.json({ token }); // Swagger: 200 OK
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

export default router;
