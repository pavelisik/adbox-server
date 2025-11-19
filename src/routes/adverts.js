import { Router } from 'express';
import prisma from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';
import multer, { diskStorage } from 'multer';
import { extname } from 'path';

const router = Router();

const storage = diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
        const id = uuidv4();
        file.generatedId = id; // сохраняем id в объект файла
        const ext = extname(file.originalname); // берем расширение из оригинального имени
        cb(null, `${id}${ext}`); // имя файла = id + оригинальное расширение
    },
});

const upload = multer({ storage });

// проверка form-data
function requireFormData(req, res, next) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
        return res.status(415).json({ userMessage: 'Content-Type must be multipart/form-data', errorCode: '415' });
    }
    next();
}

// POST /Advert/search
router.post('/search', async (req, res) => {
    try {
        const { search, category, showNonActive } = req.body;

        const adverts = await prisma.advert.findMany({
            where: {
                isActive: showNonActive ? undefined : true,
                categoryId: category || undefined,
                OR: search ? [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] : undefined,
            },
        });

        // Отправляем только ShortAdvertDto поля
        const result = adverts.map((ad) => ({
            id: ad.id,
            name: ad.name,
            location: ad.location,
            createdAt: ad.createdAt,
            isActive: ad.isActive,
            imagesIds: ad.Images?.map((img) => img.id) || [],
            cost: ad.cost,
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// GET /Advert/:id
router.get('/:id', async (req, res) => {
    try {
        const ad = await prisma.advert.findUnique({
            where: { id: req.params.id },
            include: {
                User: true,
                Category: true,
                Images: true,
            },
        });

        if (!ad) return res.status(404).json({ userMessage: 'Advert not found', errorCode: '404' });

        // Формируем AdvertDto
        const result = {
            id: ad.id,
            user: ad.User ? { id: ad.User.id, login: ad.User.login, name: ad.User.name } : null,
            name: ad.name,
            description: ad.description,
            isActive: ad.isActive,
            imagesIds: ad.Images?.map((img) => img.id) || [],
            cost: ad.cost,
            email: ad.email,
            phone: ad.phone,
            location: ad.location,
            created: ad.createdAt,
            category: ad.Category ? { id: ad.Category.id, parentId: ad.Category.parentId, name: ad.Category.name } : null,
        };

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// POST /Advert
router.post(
    '/',
    requireFormData,
    upload.array('Images'), // <-- принимаем массив файлов
    async (req, res) => {
        try {
            const { Name, Description, Cost, Email, Phone, Location, CategoryId } = req.body;
            const images = req.files; // <--- массив файлов

            if (!Name || !Cost || !Phone || !Location || !CategoryId) {
                return res.status(400).json({ userMessage: 'Missing required fields', errorCode: '400' });
            }

            const category = await prisma.category.findUnique({ where: { id: CategoryId } });
            if (!category) {
                return res.status(400).json({ userMessage: 'Category does not exist', errorCode: '400' });
            }

            // создаём объявление
            const advert = await prisma.advert.create({
                data: {
                    name: Name,
                    description: Description || null,
                    cost: Number(Cost),
                    email: Email || null,
                    phone: Phone,
                    location: Location,
                    categoryId: CategoryId,
                },
            });

            // записываем изображения в БД
            const createdImages = [];

            if (images && images.length > 0) {
                for (const file of images) {
                    const saved = await prisma.image.create({
                        data: {
                            id: file.generatedId,
                            advertId: advert.id,
                            url: `/uploads/images/${file.filename}`,
                        },
                    });
                    createdImages.push(saved.id);
                }
            }

            // Загружаем категорию для ответа
            const categoryData = await prisma.category.findUnique({
                where: { id: CategoryId },
                select: { id: true, name: true, parentId: true },
            });

            const result = {
                id: advert.id,
                user: 'пока что пустой',
                name: advert.name,
                description: advert.description,
                isActive: advert.isActive,
                imagesIds: createdImages,
                cost: advert.cost,
                email: advert.email,
                phone: advert.phone,
                location: advert.location,
                created: advert.createdAt,
                category: categoryData,
            };

            res.status(201).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
        }
    }
);

// PUT /Advert/:id
router.put('/:id', async (req, res) => {
    try {
        const { Name, Description, Images, Cost, Email, Phone, Location, CategoryId } = req.body;
        const id = req.params.id;

        const ad = await prisma.advert.findUnique({ where: { id } });
        if (!ad) return res.status(404).json({ userMessage: 'Advert not found', errorCode: '404' });

        if (!Name || !Cost || !Phone || !Location || !CategoryId) {
            return res.status(400).json({ userMessage: 'Missing required fields', errorCode: '400' });
        }

        const category = await prisma.category.findUnique({ where: { id: CategoryId } });
        if (!category) return res.status(400).json({ userMessage: 'Category does not exist', errorCode: '400' });

        const updatedAdvert = await prisma.advert.update({
            where: { id },
            data: {
                name: Name,
                description: Description,
                cost: Number(Cost),
                email: Email,
                phone: Phone,
                location: Location,
                categoryId: CategoryId,
            },
        });

        // ShortAdvertDto
        const result = {
            id: updatedAdvert.id,
            name: updatedAdvert.name,
            location: updatedAdvert.location,
            createdAt: updatedAdvert.createdAt,
            isActive: updatedAdvert.isActive,
            imagesIds: updatedAdvert.Images?.map((img) => img.id) || [],
            cost: updatedAdvert.cost,
        };

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// DELETE /Advert/:id
router.delete('/:id', async (req, res) => {
    try {
        const ad = await prisma.advert.findUnique({ where: { id: req.params.id } });
        if (!ad) return res.status(404).json({ userMessage: 'Advert not found', errorCode: '404' });

        await prisma.advert.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// GET /Advert/:id/Comments
router.get('/:id/Comments', async (req, res) => {
    try {
        const comments = await prisma.comment.findMany({
            where: { advertId: req.params.id },
        });

        const result = comments.map((c) => ({
            id: c.id,
            text: c.text,
            created: c.created,
            parentId: c.parentId,
            user: c.User ? { id: c.User.id, name: c.User.name, login: c.User.login } : null,
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// POST /Advert/:id/comments
router.post('/:id/comments', async (req, res) => {
    try {
        const { Text, ParentId } = req.body;
        if (!Text) return res.status(400).json({ userMessage: 'Text is required', errorCode: '400' });

        const ad = await prisma.advert.findUnique({ where: { id: req.params.id } });
        if (!ad) return res.status(404).json({ userMessage: 'Advert not found', errorCode: '404' });

        const comment = await prisma.comment.create({
            data: {
                text: Text,
                parentId: ParentId,
                advertId: req.params.id,
                userId: req.user?.id || null, // предполагается, что userId есть в req.user
            },
        });

        const result = {
            id: comment.id,
            text: comment.text,
            created: comment.created,
            parentId: comment.parentId,
            user: comment.User ? { id: comment.User.id, name: comment.User.name, login: comment.User.login } : null,
        };

        res.status(201).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

export default router;
