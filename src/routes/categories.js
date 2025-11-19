import { Router } from 'express';
import prisma from '../prisma.js';
import multer from 'multer';

const router = Router();
const upload = multer();

// проверка form-data
function requireFormData(req, res, next) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
        return res.status(415).json({ userMessage: 'Content-Type must be multipart/form-data', errorCode: '415' });
    }
    next();
}

// GET /Categories
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.category.findMany();
        const result = categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            parentId: cat.parentId,
        }));
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// POST /Categories
router.post('/', requireFormData, upload.none(), async (req, res) => {
    try {
        const { Name, ParentId } = req.body;

        if (!Name) return res.status(400).json({ userMessage: 'Name required', errorCode: '400' });

        if (ParentId) {
            const parent = await prisma.category.findUnique({ where: { id: ParentId } });
            if (!parent) return res.status(400).json({ userMessage: 'Parent category not found', errorCode: '400' });
        }

        const category = await prisma.category.create({
            data: { name: Name, parentId: ParentId || null },
        });

        res.status(201).json({
            id: category.id,
            name: category.name,
            parentId: category.parentId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// GET /Categories/:id
router.get('/:id', async (req, res) => {
    try {
        const cat = await prisma.category.findUnique({
            where: { id: req.params.id },
            include: { children: true },
        });

        if (!cat) return res.status(404).json({ userMessage: 'Category not found', errorCode: '404' });

        const result = {
            id: cat.id,
            name: cat.name,
            parentId: cat.parentId,
            childs:
                cat.children?.map((c) => ({
                    id: c.id,
                    name: c.name,
                    parentId: c.parentId,
                })) || [],
        };

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// PUT /Categories/:id
router.put('/:id', requireFormData, upload.none(), async (req, res) => {
    try {
        const { Name, ParentId } = req.body;
        if (!Name) return res.status(400).json({ userMessage: 'Name required', errorCode: '400' });

        const category = await prisma.category.findUnique({ where: { id: req.params.id } });
        if (!category) return res.status(404).json({ userMessage: 'Category not found', errorCode: '404' });

        if (ParentId) {
            const parent = await prisma.category.findUnique({ where: { id: ParentId } });
            if (!parent) return res.status(400).json({ userMessage: 'Parent category not found', errorCode: '400' });
        }

        const updated = await prisma.category.update({
            where: { id: req.params.id },
            data: { name: Name, parentId: ParentId || null },
        });

        res.json({
            id: updated.id,
            name: updated.name,
            parentId: updated.parentId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// DELETE /Categories/:id
router.delete('/:id', async (req, res) => {
    try {
        const category = await prisma.category.findUnique({ where: { id: req.params.id } });
        if (!category) return res.status(404).json({ userMessage: 'Category not found', errorCode: '404' });

        await prisma.category.delete({ where: { id: req.params.id } });
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

// POST /Categories/import
router.post('/import', async (req, res) => {
    try {
        const categories = req.body;

        if (!Array.isArray(categories)) {
            return res.status(400).json({ userMessage: 'Invalid payload', errorCode: '400' });
        }

        for (const cat of categories) {
            if (!cat.name) continue;

            if (cat.id) {
                await prisma.category.upsert({
                    where: { id: String(cat.id) },
                    update: { name: cat.name, parentId: cat.parentId || null },
                    create: { id: String(cat.id), name: cat.name, parentId: cat.parentId || null },
                });
            } else {
                await prisma.category.create({
                    data: { name: cat.name, parentId: cat.parentId || null },
                });
            }
        }

        res.status(200).send('Categories imported successfully');
    } catch (err) {
        console.error(err);
        res.status(500).json({ userMessage: 'Internal server error', errorCode: '500' });
    }
});

export default router;
