import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const TEXTS_DIR = path.join(process.cwd(), 'texts');

// Ensure the texts directory exists
if (!fs.existsSync(TEXTS_DIR)) {
  fs.mkdirSync(TEXTS_DIR, { recursive: true });
}

// Helper to safely resolve paths
const resolveFilePath = (filename: string) => {
  // Prevent path traversal
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith('.txt')) {
    throw new Error('Only .txt files are allowed');
  }
  return path.join(TEXTS_DIR, safeFilename);
};

// GET /api/tts - List all text files
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(TEXTS_DIR);
    const txtFiles = files.filter(f => f.endsWith('.txt')).map(filename => {
      const stats = fs.statSync(path.join(TEXTS_DIR, filename));
      return {
        id: filename,
        filename,
        title: filename.replace('.txt', ''),
        size: stats.size,
        updatedAt: stats.mtime
      };
    });
    res.json(txtFiles);
  } catch (error) {
    console.error('Error listing texts:', error);
    res.status(500).json({ error: 'Failed to list text files' });
  }
});

// GET /api/tts/:filename - Get text file content
router.get('/:filename', (req, res) => {
  try {
    const filePath = resolveFilePath(req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to read file' });
  }
});

// POST /api/tts - Create a new text file
router.post('/', (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    const filePath = resolveFilePath(filename);

    if (fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'A file with this name already exists' });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    res.status(201).json({ message: 'File created successfully', filename });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create file' });
  }
});

// PUT /api/tts/:filename - Update an existing text file
router.put('/:filename', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const filePath = resolveFilePath(req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    res.json({ message: 'File updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update file' });
  }
});

// DELETE /api/tts/:filename - Delete a text file
router.delete('/:filename', (req, res) => {
  try {
    const filePath = resolveFilePath(req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

export default router;
