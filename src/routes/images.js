const express = require('express');
const { prisma } = require('../prisma');
const multer = require('multer');
const router = express.Router();

const upload = multer(); // для multipart/form-data

// GET /Images/:id — получить изображение по ID
router.get('/:id', async (req, res) => {
    try {
        const image = await prisma.image.findUnique({
            where: { id: req.params.id },
        });

        if (!image) return res.status(404).json({ userMessage: 'Image not found', errorCode: '404' });

        // Отправляем изображение как поток
        res.set('Content-Type', 'image/jpeg'); // или определять динамически
        res.send(image.content);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// POST /Images — загрузка нового изображения
router.post('/', upload.single('Content'), async (req, res) => {
    try {
        const { AdvertId } = req.body;
        const file = req.file;

        if (!AdvertId || !file)
            return res.status(400).json({ userMessage: 'AdvertId and Content are required', errorCode: '400' });

        const advert = await prisma.advert.findUnique({ where: { id: AdvertId } });
        if (!advert) return res.status(422).json({ userMessage: 'Advert not found', errorCode: '422' });

        const image = await prisma.image.create({
            data: {
                advertId: AdvertId,
                content: file.buffer,
                mimeType: file.mimetype,
            },
        });

        res.status(201).json({
            id: image.id,
            advertId: image.advertId,
        }); // Swagger: ShortImageDto
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// DELETE /Images/:id — удалить изображение
router.delete('/:id', async (req, res) => {
    try {
        const image = await prisma.image.findUnique({ where: { id: req.params.id } });
        if (!image) return res.status(404).json({ userMessage: 'Image not found', errorCode: '404' });

        // Проверка прав доступа (если нужна)
        // if (req.user.id !== image.userId) return res.status(403).json({ userMessage: 'Access denied', errorCode: '403' });

        await prisma.image.delete({ where: { id: req.params.id } });

        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

module.exports = router;
