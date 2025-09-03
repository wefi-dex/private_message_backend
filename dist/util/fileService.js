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
exports.fileService = exports.FileService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const stat = (0, util_1.promisify)(fs_1.default.stat);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
class FileService {
    constructor() {
        // Use Render's mounted disk path in production, fallback to local path for development
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            this.uploadsPath = '/opt/render/project/src/uploads';
        }
        else {
            this.uploadsPath = path_1.default.join(__dirname, '../../uploads');
        }
        // Ensure uploads directory exists
        if (!fs_1.default.existsSync(this.uploadsPath)) {
            fs_1.default.mkdirSync(this.uploadsPath, { recursive: true });
        }
    }
    /**
     * Get the uploads directory path
     */
    getUploadsPath() {
        return this.uploadsPath;
    }
    /**
     * Sanitize filename to prevent directory traversal attacks
     */
    sanitizeFilename(filename) {
        return path_1.default.basename(filename);
    }
    /**
     * Get full file path
     */
    getFilePath(filename) {
        const sanitizedFilename = this.sanitizeFilename(filename);
        return path_1.default.join(this.uploadsPath, sanitizedFilename);
    }
    /**
     * Check if file exists
     */
    fileExists(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = this.getFilePath(filename);
            try {
                yield stat(filePath);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Get file information
     */
    getFileInfo(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = this.getFilePath(filename);
            try {
                const stats = yield stat(filePath);
                const mimeType = this.getMimeType(filename);
                return {
                    filename: this.sanitizeFilename(filename),
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    mimeType,
                };
            }
            catch (_a) {
                return null;
            }
        });
    }
    /**
     * List all files in uploads directory
     */
    listFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const files = yield readdir(this.uploadsPath);
                const fileInfos = [];
                for (const filename of files) {
                    const fileInfo = yield this.getFileInfo(filename);
                    if (fileInfo && fileInfo.isFile) {
                        fileInfos.push(fileInfo);
                    }
                }
                return fileInfos;
            }
            catch (error) {
                console.error('Error listing files:', error);
                return [];
            }
        });
    }
    /**
     * Delete a file
     */
    deleteFile(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = this.getFilePath(filename);
            try {
                yield unlink(filePath);
                return true;
            }
            catch (error) {
                console.error('Error deleting file:', error);
                return false;
            }
        });
    }
    /**
     * Get MIME type based on file extension
     */
    getMimeType(filename) {
        const ext = path_1.default.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    /**
     * Parse range header for partial downloads
     */
    parseRange(range, fileSize) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        if (start >= fileSize || end >= fileSize || start > end) {
            return null;
        }
        return {
            start,
            end,
            chunkSize: end - start + 1,
        };
    }
    /**
     * Create file stream with optional range
     */
    createFileStream(filename, range) {
        const filePath = this.getFilePath(filename);
        const stats = fs_1.default.statSync(filePath);
        if (range) {
            const rangeInfo = this.parseRange(range, stats.size);
            if (rangeInfo) {
                const stream = fs_1.default.createReadStream(filePath, {
                    start: rangeInfo.start,
                    end: rangeInfo.end,
                });
                return { stream, range: rangeInfo };
            }
        }
        const stream = fs_1.default.createReadStream(filePath);
        return { stream };
    }
    /**
     * Get total size of all files
     */
    getTotalSize() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield this.listFiles();
            return files.reduce((total, file) => total + file.size, 0);
        });
    }
    /**
     * Get files by size range
     */
    getFilesBySize(minSize, maxSize) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield this.listFiles();
            return files.filter((file) => file.size >= minSize && file.size <= maxSize);
        });
    }
    /**
     * Get files by date range
     */
    getFilesByDateRange(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield this.listFiles();
            return files.filter((file) => file.modified >= startDate && file.modified <= endDate);
        });
    }
}
exports.FileService = FileService;
// Export singleton instance
exports.fileService = new FileService();
