import { Request as ExpressRequest, Response } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Extend Express Request type for multer
interface MulterRequest extends ExpressRequest {
  file?: Express.Multer.File;
}

// Multer storage with original extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, base + '-' + uniqueSuffix + ext);
  }
});

export const upload = multer({ storage });

// File upload handler (multer will handle the actual file saving)
export const uploadFile = asyncHandler(async (req: MulterRequest, res: Response) => {
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  // Optionally, you can store file info in DB here
  res.status(200).json({ success: true, filename: req.file.filename, originalname: req.file.originalname });
});

// File download handler
export const downloadFile = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../../../uploads', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }
  res.download(filePath, filename);
}); 