"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFiles = exports.getFileInfo = exports.deleteFile = exports.downloadFileWithCustomName = exports.downloadFileAdvanced = exports.downloadFile = exports.uploadFile = exports.upload = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
// Multer storage with original extension
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, '../../../uploads');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname) || '';
        const base = path_1.default.basename(file.originalname, ext);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = base + '-' + uniqueSuffix + ext;
        cb(null, filename);
    },
});
// Add file filter to validate file types
const fileFilter = (req, file, cb) => {
    // Allow only specific file types
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'audio/mpeg',
        'audio/wav',
        'audio/mp3',
        'application/pdf',
        'text/plain',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only images, videos, audio, PDFs, and text files are allowed.'), false);
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
});
// File upload handler (multer will handle the actual file saving)
exports.uploadFile = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res
            .status(400)
            .json({ success: false, message: 'No file uploaded.' });
    }
    // Check if file actually exists and has content
    const fs = require('fs');
    const stats = fs.statSync(req.file.path);
    if (stats.size === 0) {
        return res
            .status(400)
            .json({ success: false, message: 'Uploaded file is empty.' });
    }
    res
        .status(200)
        .json({
        success: true,
        filename: req.file.filename,
        originalname: req.file.originalname,
    });
}));
// File download handler
exports.downloadFile = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res
            .status(400)
            .json({ success: false, message: 'Filename is required.' });
    }
    // Security: Prevent directory traversal attacks
    const sanitizedFilename = path_1.default.basename(filename);
    const filePath = path_1.default.join(__dirname, '../../../uploads', sanitizedFilename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res
            .status(404)
            .json({ success: false, message: 'File not found.' });
    }
    // Get file stats for additional info
    const stats = fs_1.default.statSync(filePath);
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Content-Length', stats.size);
    // Stream the file
    const fileStream = fs_1.default.createReadStream(filePath);
    fileStream.pipe(res);
    // Handle stream errors
    fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error reading file.' });
        }
    });
}));
// Advanced download handler with range support and progress tracking
exports.downloadFileAdvanced = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res
            .status(400)
            .json({ success: false, message: 'Filename is required.' });
    }
    // Security: Prevent directory traversal attacks
    const sanitizedFilename = path_1.default.basename(filename);
    const filePath = path_1.default.join(__dirname, '../../../uploads', sanitizedFilename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res
            .status(404)
            .json({ success: false, message: 'File not found.' });
    }
    const stats = fs_1.default.statSync(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;
    if (range) {
        // Handle range requests for partial downloads
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        });
        const stream = fs_1.default.createReadStream(filePath, { start, end });
        stream.pipe(res);
    }
    else {
        // Full file download
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
            'Accept-Ranges': 'bytes',
        });
        const stream = fs_1.default.createReadStream(filePath);
        stream.pipe(res);
    }
}));
// Download with custom filename
exports.downloadFileWithCustomName = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    const { customName } = req.query;
    if (!filename) {
        return res
            .status(400)
            .json({ success: false, message: 'Filename is required.' });
    }
    // Security: Prevent directory traversal attacks
    const sanitizedFilename = path_1.default.basename(filename);
    const filePath = path_1.default.join(__dirname, '../../../uploads', sanitizedFilename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res
            .status(404)
            .json({ success: false, message: 'File not found.' });
    }
    const stats = fs_1.default.statSync(filePath);
    const downloadName = customName ? String(customName) : sanitizedFilename;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Length', stats.size);
    const fileStream = fs_1.default.createReadStream(filePath);
    fileStream.pipe(res);
    fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error reading file.' });
        }
    });
}));
// Delete file (admin function)
exports.deleteFile = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res
            .status(400)
            .json({ success: false, message: 'Filename is required.' });
    }
    // Security: Prevent directory traversal attacks
    const sanitizedFilename = path_1.default.basename(filename);
    const filePath = path_1.default.join(__dirname, '../../../uploads', sanitizedFilename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res
            .status(404)
            .json({ success: false, message: 'File not found.' });
    }
    try {
        fs_1.default.unlinkSync(filePath);
        res
            .status(200)
            .json({ success: true, message: 'File deleted successfully.' });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ success: false, message: 'Error deleting file.' });
    }
}));
// Get file info without downloading
exports.getFileInfo = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res
            .status(400)
            .json({ success: false, message: 'Filename is required.' });
    }
    // Security: Prevent directory traversal attacks
    const sanitizedFilename = path_1.default.basename(filename);
    const filePath = path_1.default.join(__dirname, '../../../uploads', sanitizedFilename);
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        return res
            .status(404)
            .json({ success: false, message: 'File not found.' });
    }
    // Get file stats
    const stats = fs_1.default.statSync(filePath);
    res.status(200).json({
        success: true,
        filename: sanitizedFilename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
    });
}));
// List all available files (for admin purposes)
exports.listFiles = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const uploadsPath = path_1.default.join(__dirname, '../../../uploads');
    // Check if uploads directory exists
    if (!fs_1.default.existsSync(uploadsPath)) {
        return res.status(200).json({ success: true, files: [] });
    }
    try {
        const files = fs_1.default.readdirSync(uploadsPath);
        const fileList = files
            .map((filename) => {
            const filePath = path_1.default.join(uploadsPath, filename);
            const stats = fs_1.default.statSync(filePath);
            return {
                filename,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
            };
        })
            .filter((file) => file.isFile); // Only return files, not directories
        res.status(200).json({ success: true, files: fileList });
    }
    catch (error) {
        console.error('Error reading uploads directory:', error);
        res.status(500).json({ success: false, message: 'Error reading files.' });
    }
}));
