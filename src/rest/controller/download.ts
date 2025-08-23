import { Request, Response } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { fileService, FileInfo } from '../../util/fileService';

// Basic download function
export const downloadFile = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  const fileInfo = await fileService.getFileInfo(filename);
  if (!fileInfo) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const { stream } = fileService.createFileStream(filename);
  
  res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
  res.setHeader('Content-Length', fileInfo.size);
  
  stream.pipe(res);
  
  stream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error reading file.' });
    }
  });
});

// Download with range support for partial downloads
export const downloadFileWithRange = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const range = req.headers.range;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  const fileInfo = await fileService.getFileInfo(filename);
  if (!fileInfo) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const { stream, range: rangeInfo } = fileService.createFileStream(filename, range);
  
  if (rangeInfo) {
    // Partial download
    res.writeHead(206, {
      'Content-Range': `bytes ${rangeInfo.start}-${rangeInfo.end}/${fileInfo.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': rangeInfo.chunkSize,
      'Content-Type': fileInfo.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
    });
  } else {
    // Full download
    res.writeHead(200, {
      'Content-Length': fileInfo.size,
      'Content-Type': fileInfo.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
      'Accept-Ranges': 'bytes',
    });
  }

  stream.pipe(res);
  
  stream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error reading file.' });
    }
  });
});

// Download with custom filename
export const downloadFileWithCustomName = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const { customName } = req.query;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  const fileInfo = await fileService.getFileInfo(filename);
  if (!fileInfo) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const downloadName = customName ? String(customName) : fileInfo.filename;
  const { stream } = fileService.createFileStream(filename);
  
  res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  res.setHeader('Content-Length', fileInfo.size);
  
  stream.pipe(res);
  
  stream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error reading file.' });
    }
  });
});

// Get file information
export const getFileInfo = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  const fileInfo = await fileService.getFileInfo(filename);
  if (!fileInfo) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  res.status(200).json({ success: true, file: fileInfo });
});

// List all files
export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const files = await fileService.listFiles();
  res.status(200).json({ success: true, files });
});

// Get files by size range
export const getFilesBySize = asyncHandler(async (req: Request, res: Response) => {
  const { minSize, maxSize } = req.query;
  
  const min = minSize ? parseInt(String(minSize), 10) : 0;
  const max = maxSize ? parseInt(String(maxSize), 10) : Number.MAX_SAFE_INTEGER;
  
  const files = await fileService.getFilesBySize(min, max);
  res.status(200).json({ success: true, files });
});

// Get files by date range
export const getFilesByDateRange = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Start date and end date are required.' });
  }

  const start = new Date(String(startDate));
  const end = new Date(String(endDate));
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format.' });
  }

  const files = await fileService.getFilesByDateRange(start, end);
  res.status(200).json({ success: true, files });
});

// Get storage statistics
export const getStorageStats = asyncHandler(async (req: Request, res: Response) => {
  const files = await fileService.listFiles();
  const totalSize = await fileService.getTotalSize();
  
  const stats = {
    totalFiles: files.length,
    totalSize,
    averageFileSize: files.length > 0 ? totalSize / files.length : 0,
    fileTypes: files.reduce((acc, file) => {
      const ext = file.filename.split('.').pop()?.toLowerCase() || 'unknown';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number })
  };

  res.status(200).json({ success: true, stats });
});

// Delete file
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;
  
  if (!filename) {
    return res.status(400).json({ success: false, message: 'Filename is required.' });
  }

  const exists = await fileService.fileExists(filename);
  if (!exists) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const success = await fileService.deleteFile(filename);
  if (!success) {
    return res.status(500).json({ success: false, message: 'Error deleting file.' });
  }

  res.status(200).json({ success: true, message: 'File deleted successfully.' });
});

// Bulk delete files
export const bulkDeleteFiles = asyncHandler(async (req: Request, res: Response) => {
  const { filenames } = req.body;
  
  if (!Array.isArray(filenames)) {
    return res.status(400).json({ success: false, message: 'Filenames array is required.' });
  }

  const results = await Promise.all(
    filenames.map(async (filename) => {
      const exists = await fileService.fileExists(filename);
      if (!exists) {
        return { filename, success: false, message: 'File not found.' };
      }

      const success = await fileService.deleteFile(filename);
      return { 
        filename, 
        success, 
        message: success ? 'Deleted successfully.' : 'Error deleting file.' 
      };
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  res.status(200).json({ 
    success: true, 
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount
    }
  });
}); 
