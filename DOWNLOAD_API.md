# Download API Documentation

This document describes the download functionality available in the backend API.

## Overview

The download API provides comprehensive file download capabilities with support for:
- Basic file downloads
- Partial downloads (range requests)
- Custom filename downloads
- File information retrieval
- File listing and management
- Storage statistics

## API Endpoints

### Basic Download

**GET** `/download/:filename`

Downloads a file with the specified filename.

**Response:** File stream with appropriate headers

**Example:**
```bash
curl -X GET "http://localhost:3000/download/myfile.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Download with Range Support

**GET** `/download-range/:filename`

Downloads a file with support for partial downloads using HTTP range headers.

**Headers:**
- `Range: bytes=0-1023` (optional)

**Response:** File stream with range headers if requested

**Example:**
```bash
curl -X GET "http://localhost:3000/download-range/largefile.zip" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Range: bytes=0-1023"
```

### Download with Custom Filename

**GET** `/download-custom/:filename?customName=newfilename.ext`

Downloads a file with a custom filename.

**Query Parameters:**
- `customName`: The desired filename for the download

**Example:**
```bash
curl -X GET "http://localhost:3000/download-custom/original.pdf?customName=document.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get File Information

**GET** `/file-info/:filename`

Retrieves information about a file without downloading it.

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "example.pdf",
    "size": 1024000,
    "created": "2024-01-01T00:00:00.000Z",
    "modified": "2024-01-01T00:00:00.000Z",
    "isFile": true,
    "isDirectory": false,
    "mimeType": "application/pdf"
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/file-info/example.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List All Files

**GET** `/files`

Lists all available files in the uploads directory.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "filename": "file1.pdf",
      "size": 1024000,
      "created": "2024-01-01T00:00:00.000Z",
      "modified": "2024-01-01T00:00:00.000Z",
      "isFile": true,
      "isDirectory": false,
      "mimeType": "application/pdf"
    }
  ]
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/files" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Files by Size Range

**GET** `/files/size?minSize=1000&maxSize=1000000`

Lists files within a specified size range.

**Query Parameters:**
- `minSize`: Minimum file size in bytes (optional)
- `maxSize`: Maximum file size in bytes (optional)

**Example:**
```bash
curl -X GET "http://localhost:3000/files/size?minSize=1000&maxSize=1000000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Files by Date Range

**GET** `/files/date-range?startDate=2024-01-01&endDate=2024-12-31`

Lists files modified within a specified date range.

**Query Parameters:**
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)

**Example:**
```bash
curl -X GET "http://localhost:3000/files/date-range?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Storage Statistics

**GET** `/files/stats`

Retrieves storage statistics including total files, total size, and file type distribution.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFiles": 10,
    "totalSize": 10240000,
    "averageFileSize": 1024000,
    "fileTypes": {
      "pdf": 5,
      "jpg": 3,
      "txt": 2
    }
  }
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/files/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete File

**DELETE** `/file-delete/:filename`

Deletes a specific file.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully."
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/file-delete/example.pdf" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bulk Delete Files

**POST** `/files/bulk-delete`

Deletes multiple files at once.

**Request Body:**
```json
{
  "filenames": ["file1.pdf", "file2.jpg", "file3.txt"]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filename": "file1.pdf",
      "success": true,
      "message": "Deleted successfully."
    },
    {
      "filename": "file2.jpg",
      "success": false,
      "message": "File not found."
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/files/bulk-delete" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filenames": ["file1.pdf", "file2.jpg"]}'
```

## Legacy Endpoints

The following legacy endpoints are still available for backward compatibility:

- `GET /file/download/:filename` - Basic download
- `GET /file/download-advanced/:filename` - Advanced download with range support
- `GET /file/download-custom/:filename` - Download with custom filename
- `GET /file/info/:filename` - Get file information
- `GET /file/list` - List all files
- `DELETE /file/delete/:filename` - Delete file

## Security Features

1. **Directory Traversal Protection**: All filenames are sanitized using `path.basename()` to prevent directory traversal attacks.

2. **Authentication**: All endpoints require valid authentication tokens (except where noted).

3. **File Validation**: Files are validated for existence before any operations.

4. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes.

## File Service

The download functionality is built on top of a `FileService` class that provides:

- File existence checking
- File information retrieval
- File listing with filtering
- MIME type detection
- Range request parsing
- File streaming with error handling

## Error Codes

- `400` - Bad Request (missing filename, invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `404` - File Not Found
- `500` - Internal Server Error (file system errors)

## Usage Examples

### Frontend Integration

```javascript
// Download a file
const downloadFile = async (filename) => {
  const response = await fetch(`/download/${filename}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

// Get file information
const getFileInfo = async (filename) => {
  const response = await fetch(`/file-info/${filename}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

### React Native Integration

```javascript
import RNFS from 'react-native-fs';

const downloadFile = async (filename) => {
  const response = await fetch(`/download/${filename}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;
    const fileStream = RNFS.createWriteStream(filePath);
    
    response.body.pipe(fileStream);
    
    return new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
  }
};
``` 