import { Router } from 'express';
import prisma from '../prisma.js';

const router = Router();

// GET /Comment/:id — получить комментарий по ID
router.get('/:id', async (req, res) => {
    try {
        const comment = await prisma.comment.findUnique({
            where: { id: req.params.id },
        });

        if (!comment) return res.status(404).json({ userMessage: 'Comment not found', errorCode: '404' });

        res.json(comment); // Swagger: CommentDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// PUT /Comment/:id — обновить комментарий
router.put('/:id', async (req, res) => {
    try {
        const { text, parentId } = req.body;

        const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
        if (!comment) return res.status(404).json({ userMessage: 'Comment not found', errorCode: '404' });

        // Можно добавить проверку прав доступа, если нужно
        // if (req.user.id !== comment.userId) return res.status(403).json({ userMessage: 'Access denied', errorCode: '403' });

        if (!text || text.length === 0) return res.status(400).json({ userMessage: 'Invalid model', errorCode: '400' });

        const updated = await prisma.comment.update({
            where: { id: req.params.id },
            data: { text, parentId },
        });

        res.json(updated); // Swagger: ShortCommentDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// DELETE /Comment/:id — удалить комментарий
router.delete('/:id', async (req, res) => {
    try {
        const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
        if (!comment) return res.status(404).json({ userMessage: 'Comment not found', errorCode: '404' });

        // Можно добавить проверку прав доступа, если нужно
        // if (req.user.id !== comment.userId) return res.status(403).json({ userMessage: 'Access denied', errorCode: '403' });

        await prisma.comment.delete({ where: { id: req.params.id } });

        res.status(204).send(); // Swagger: успешное удаление
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

export default router;
