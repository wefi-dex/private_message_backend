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
exports.bulkDeleteFiles = exports.deleteFile = exports.getStorageStats = exports.getFilesByDateRange = exports.getFilesBySize = exports.listFiles = exports.getFileInfo = exports.downloadFileWithCustomName = exports.downloadFileWithRange = exports.downloadFile = void 0;
const asyncHandler_1 = __importDefault(require("../middleware/asyncHandler"));
const fileService_1 = require("../../util/fileService");
// Basic download function
exports.downloadFile = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    const fileInfo = yield fileService_1.fileService.getFileInfo(filename);
    if (!fileInfo) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }
    const { stream } = fileService_1.fileService.createFileStream(filename);
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
}));
// Download with range support for partial downloads
exports.downloadFileWithRange = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    const range = req.headers.range;
    if (!filename) {
        return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    const fileInfo = yield fileService_1.fileService.getFileInfo(filename);
    if (!fileInfo) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }
    const { stream, range: rangeInfo } = fileService_1.fileService.createFileStream(filename, range);
    if (rangeInfo) {
        // Partial download
        res.writeHead(206, {
            'Content-Range': `bytes ${rangeInfo.start}-${rangeInfo.end}/${fileInfo.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': rangeInfo.chunkSize,
            'Content-Type': fileInfo.mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
        });
    }
    else {
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
}));
// Download with custom filename
exports.downloadFileWithCustomName = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    const { customName } = req.query;
    if (!filename) {
        return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    const fileInfo = yield fileService_1.fileService.getFileInfo(filename);
    if (!fileInfo) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }
    const downloadName = customName ? String(customName) : fileInfo.filename;
    const { stream } = fileService_1.fileService.createFileStream(filename);
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
}));
// Get file information
exports.getFileInfo = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    const fileInfo = yield fileService_1.fileService.getFileInfo(filename);
    if (!fileInfo) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }
    res.status(200).json({ success: true, file: fileInfo });
}));
// List all files
exports.listFiles = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield fileService_1.fileService.listFiles();
    res.status(200).json({ success: true, files });
}));
// Get files by size range
exports.getFilesBySize = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { minSize, maxSize } = req.query;
    const min = minSize ? parseInt(String(minSize), 10) : 0;
    const max = maxSize ? parseInt(String(maxSize), 10) : Number.MAX_SAFE_INTEGER;
    const files = yield fileService_1.fileService.getFilesBySize(min, max);
    res.status(200).json({ success: true, files });
}));
// Get files by date range
exports.getFilesByDateRange = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Start date and end date are required.' });
    }
    const start = new Date(String(startDate));
    const end = new Date(String(endDate));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format.' });
    }
    const files = yield fileService_1.fileService.getFilesByDateRange(start, end);
    res.status(200).json({ success: true, files });
}));
// Get storage statistics
exports.getStorageStats = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield fileService_1.fileService.listFiles();
    const totalSize = yield fileService_1.fileService.getTotalSize();
    const stats = {
        totalFiles: files.length,
        totalSize,
        averageFileSize: files.length > 0 ? totalSize / files.length : 0,
        fileTypes: files.reduce((acc, file) => {
            var _a;
            const ext = ((_a = file.filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'unknown';
            acc[ext] = (acc[ext] || 0) + 1;
            return acc;
        }, {})
    };
    res.status(200).json({ success: true, stats });
}));
// Delete file
exports.deleteFile = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filename } = req.params;
    if (!filename) {
        return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    const exists = yield fileService_1.fileService.fileExists(filename);
    if (!exists) {
        return res.status(404).json({ success: false, message: 'File not found.' });
    }
    const success = yield fileService_1.fileService.deleteFile(filename);
    if (!success) {
        return res.status(500).json({ success: false, message: 'Error deleting file.' });
    }
    res.status(200).json({ success: true, message: 'File deleted successfully.' });
}));
// Bulk delete files
exports.bulkDeleteFiles = (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { filenames } = req.body;
    if (!Array.isArray(filenames)) {
        return res.status(400).json({ success: false, message: 'Filenames array is required.' });
    }
    const results = yield Promise.all(filenames.map((filename) => __awaiter(void 0, void 0, void 0, function* () {
        const exists = yield fileService_1.fileService.fileExists(filename);
        if (!exists) {
            return { filename, success: false, message: 'File not found.' };
        }
        const success = yield fileService_1.fileService.deleteFile(filename);
        return {
            filename,
            success,
            message: success ? 'Deleted successfully.' : 'Error deleting file.'
        };
    })));
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
}));
