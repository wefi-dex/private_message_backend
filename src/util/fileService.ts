import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export interface FileInfo {
  filename: string;
  size: number;
  created: Date;
  modified: Date;
  isFile: boolean;
  isDirectory: boolean;
  mimeType?: string;
}

export interface DownloadOptions {
  customName?: string;
  range?: string;
  chunkSize?: number;
}

export class FileService {
  private uploadsPath: string;

  constructor() {
    this.uploadsPath = path.join(__dirname, '../../uploads');
  }

  /**
   * Get the uploads directory path
   */
  getUploadsPath(): string {
    return this.uploadsPath;
  }

  /**
   * Sanitize filename to prevent directory traversal attacks
   */
  sanitizeFilename(filename: string): string {
    return path.basename(filename);
  }

  /**
   * Get full file path
   */
  getFilePath(filename: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    return path.join(this.uploadsPath, sanitizedFilename);
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    const filePath = this.getFilePath(filename);
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filename: string): Promise<FileInfo | null> {
    const filePath = this.getFilePath(filename);
    
    try {
      const stats = await stat(filePath);
      const mimeType = this.getMimeType(filename);
      
      return {
        filename: this.sanitizeFilename(filename),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        mimeType
      };
    } catch {
      return null;
    }
  }

  /**
   * List all files in uploads directory
   */
  async listFiles(): Promise<FileInfo[]> {
    try {
      const files = await readdir(this.uploadsPath);
      const fileInfos: FileInfo[] = [];

      for (const filename of files) {
        const fileInfo = await this.getFileInfo(filename);
        if (fileInfo && fileInfo.isFile) {
          fileInfos.push(fileInfo);
        }
      }

      return fileInfos;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filename: string): Promise<boolean> {
    const filePath = this.getFilePath(filename);
    
    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get MIME type based on file extension
   */
  getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
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
      '.ogg': 'audio/ogg'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Parse range header for partial downloads
   */
  parseRange(range: string, fileSize: number): { start: number; end: number; chunkSize: number } | null {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    if (start >= fileSize || end >= fileSize || start > end) {
      return null;
    }

    return {
      start,
      end,
      chunkSize: (end - start) + 1
    };
  }

  /**
   * Create file stream with optional range
   */
  createFileStream(filename: string, range?: string): { stream: fs.ReadStream; range?: { start: number; end: number; chunkSize: number } } {
    const filePath = this.getFilePath(filename);
    const stats = fs.statSync(filePath);
    
    if (range) {
      const rangeInfo = this.parseRange(range, stats.size);
      if (rangeInfo) {
        const stream = fs.createReadStream(filePath, { start: rangeInfo.start, end: rangeInfo.end });
        return { stream, range: rangeInfo };
      }
    }
    
    const stream = fs.createReadStream(filePath);
    return { stream };
  }

  /**
   * Get total size of all files
   */
  async getTotalSize(): Promise<number> {
    const files = await this.listFiles();
    return files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Get files by size range
   */
  async getFilesBySize(minSize: number, maxSize: number): Promise<FileInfo[]> {
    const files = await this.listFiles();
    return files.filter(file => file.size >= minSize && file.size <= maxSize);
  }

  /**
   * Get files by date range
   */
  async getFilesByDateRange(startDate: Date, endDate: Date): Promise<FileInfo[]> {
    const files = await this.listFiles();
    return files.filter(file => 
      file.modified >= startDate && file.modified <= endDate
    );
  }
}

// Export singleton instance
export const fileService = new FileService(); 