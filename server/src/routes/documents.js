import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../prisma.js';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const router = Router();
router.use(authenticate);

/** Upload document for a borrower */
router.post('/:borrowerId', upload.single('file'), async (req, res) => {
  try {
    const borrower = await prisma.borrower.findFirst({
      where: { id: req.params.borrowerId, lender_id: req.user.lender_id },
    });
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });

    const doc = await prisma.document.create({
      data: {
        lender_id: req.user.lender_id,
        borrower_id: req.params.borrowerId,
        filename: req.file.originalname,
        filepath: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/** List documents for a borrower */
router.get('/:borrowerId', async (req, res) => {
  try {
    const docs = await prisma.document.findMany({
      where: { borrower_id: req.params.borrowerId, lender_id: req.user.lender_id },
      orderBy: { created_at: 'desc' },
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/** Delete document */
router.delete('/:id', async (req, res) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, lender_id: req.user.lender_id },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
