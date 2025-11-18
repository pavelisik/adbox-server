const express = require('express');
const bcrypt = require('bcrypt');
const { prisma } = require('../prisma');
const router = express.Router();

// GET /Users — получить всех пользователей
router.get('/', async (req, res) => {
    try {
        // TODO: можно добавить проверку роли (например, только админы)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                login: true,
                name: true,
                role: true,
            },
        });
        res.json(users); // ShortUserDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// GET /Users/current — получить текущего пользователя
router.get('/current', async (req, res) => {
    try {
        const currentUserId = req.user?.id; // предполагается middleware авторизации
        if (!currentUserId) return res.status(403).json({ userMessage: 'Access denied', errorCode: '403' });

        const user = await prisma.user.findUnique({ where: { id: currentUserId } });
        if (!user) return res.status(404).json({ userMessage: 'User not found', errorCode: '404' });

        res.json(user); // UserDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// GET /Users/:id — получить пользователя по ID
router.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) return res.status(404).json({ userMessage: 'User not found', errorCode: '404' });

        res.json(user); // UserDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// PUT /Users/:id — обновление пользователя
router.put('/:id', async (req, res) => {
    try {
        const { Name, Login, Password } = req.body;
        const userId = req.params.id;

        if (!Name || !Login || !Password)
            return res.status(400).json({ userMessage: 'Invalid model', errorCode: '400' });

        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) return res.status(404).json({ userMessage: 'User not found', errorCode: '404' });

        const passwordHash = await bcrypt.hash(Password, 10);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name: Name, login: Login, passwordHash },
        });

        res.json({
            id: updatedUser.id,
            login: updatedUser.login,
            name: updatedUser.name,
        }); // ShortUserDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// DELETE /Users/:id — удалить пользователя
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) return res.status(404).json({ userMessage: 'User not found', errorCode: '404' });

        // TODO: проверка прав (например, админ или сам пользователь)
        await prisma.user.delete({ where: { id: userId } });

        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

module.exports = router;
