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
    const uploadPath = path.join(__dirname, '../../../uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = base + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// Add file filter to debug what's being uploaded
const fileFilter = (req: any, file: any, cb: any) => {
  cb(null, true);
};

export const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// File upload handler (multer will handle the actual file saving)
export const uploadFile = asyncHandler(async (req: MulterRequest, res: Response) => {  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  
  // Check if file actually exists and has content
  const fs = require('fs');
  const stats = fs.statSync(req.file.path);
  
  if (stats.size === 0) {
    
  }
  
  res.status(200).json({ success: true, filename: req.file.filename, originalname: req.file.originalname });
});

// File download handler
export const downloadFile = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  // Security: Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../../uploads', sanitizedFilename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  // Get file stats for additional info
  const stats = fs.statSync(filePath);
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
  res.setHeader('Content-Length', stats.size);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  // Handle stream errors
  fileStream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error reading file.' });
    }
  });
});

// Advanced download handler with range support and progress tracking
export const downloadFileAdvanced = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  // Security: Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../../uploads', sanitizedFilename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const range = req.headers.range;

  if (range) {
    // Handle range requests for partial downloads
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // Full file download
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      'Accept-Ranges': 'bytes',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
});

// Download with custom filename
export const downloadFileWithCustomName = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { filename } = req.params;
  const { customName } = req.query;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  // Security: Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../../uploads', sanitizedFilename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const stats = fs.statSync(filePath);
  const downloadName = customName ? String(customName) : sanitizedFilename;
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Length', stats.size);
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
  
  fileStream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error reading file.' });
    }
  });
});

// Delete file (admin function)
export const deleteFile = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  // Security: Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../../uploads', sanitizedFilename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  try {
    fs.unlinkSync(filePath);
    res.status(200).json({ success: true, message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ success: false, message: 'Error deleting file.' });
  }
});

// Get file info without downloading
export const getFileInfo = asyncHandler(async (req: MulterRequest, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  // Security: Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../../uploads', sanitizedFilename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  // Get file stats
  const stats = fs.statSync(filePath);
  
  res.status(200).json({
    success: true,
    filename: sanitizedFilename,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory()
  });
});

// List all available files (for admin purposes)
export const listFiles = asyncHandler(async (req: MulterRequest, res: Response) => {
  const uploadsPath = path.join(__dirname, '../../../uploads');
  
  // Check if uploads directory exists
  if (!fs.existsSync(uploadsPath)) {
    return res.status(200).json({ success: true, files: [] });
  }

  try {
    const files = fs.readdirSync(uploadsPath);
    const fileList = files.map(filename => {
      const filePath = path.join(uploadsPath, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    }).filter(file => file.isFile); // Only return files, not directories

    res.status(200).json({ success: true, files: fileList });
  } catch (error) {
    console.error('Error reading uploads directory:', error);
    res.status(500).json({ success: false, message: 'Error reading files.' });
  }
});