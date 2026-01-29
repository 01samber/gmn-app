import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { authenticate } from '../middleware/auth.js';
import { paginate, formatPaginatedResponse } from '../utils/helpers.js';

const router = Router();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

// Get all files
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, workOrderId, type } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (type) {
      if (type === 'image') where.type = { startsWith: 'image/' };
      else if (type === 'pdf') where.type = 'application/pdf';
      else if (type === 'video') where.type = { startsWith: 'video/' };
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          workOrder: { select: { id: true, woNumber: true, client: true } },
        },
      }),
      prisma.file.count({ where }),
    ]);

    res.json(formatPaginatedResponse(files, total, page, limit));
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Upload file
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { workOrderId } = req.body;

    const file = await prisma.file.create({
      data: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`,
        workOrderId: workOrderId || null,
      },
      include: {
        workOrder: { select: { id: true, woNumber: true } },
      },
    });

    res.status(201).json(file);
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Update file (change work order association)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { workOrderId, name } = req.body;

    const file = await prisma.file.update({
      where: { id: req.params.id },
      data: {
        ...(workOrderId !== undefined && { workOrderId: workOrderId || null }),
        ...(name && { name }),
      },
      include: {
        workOrder: { select: { id: true, woNumber: true } },
      },
    });

    res.json(file);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete physical file
    const filePath = join(__dirname, '../..', file.path);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await prisma.file.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
