import express, { Router } from 'express'
import {
  login,
  register,
  verifyEmail,
  resendVerificationCode,
} from './controller/auth'
import {
  createUser,
  deleteUser,
  getUser,
  updateUser,
  getAllUsers,
  checkUsernameDuplicate,
  createUserConnection,
  getUserConnectionStatus,
  getUserByUsername,
  getPendingConnectionRequests,
  respondToConnectionRequest,
  getConnectionHistory,
  getConnectedUsers,
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkIfBlocked,
  reportUser,
  getUserReports,
} from './controller/user'
import {
  uploadFile,
  downloadFile,
  downloadFileAdvanced,
  downloadFileWithCustomName,
  getFileInfo,
  listFiles,
  deleteFile,
  upload,
} from './controller/file'
import {
  downloadFile as downloadFileNew,
  downloadFileWithRange,
  downloadFileWithCustomName as downloadFileWithCustomNameNew,
  getFileInfo as getFileInfoNew,
  listFiles as listFilesNew,
  getFilesBySize,
  getFilesByDateRange,
  getStorageStats,
  deleteFile as deleteFileNew,
  bulkDeleteFiles,
} from './controller/download'
import {
  getAllReports,
  getReport,
  updateReportStatus,
  deleteReport,
  getDashboardStats,
  getUserStats,
  getReportStats,
  getAllUsers as getAdminUsers,
  deleteUser as deleteAdminUser,
  banUser,
  unbanUser,
  getPendingCreators,
  approveCreator,
} from './controller/admin'

const router: Router = express.Router()

// Multer setup

// Auth routes
router.route('/auth/register').post(register)
router.route('/auth/login').post(login)
router.route('/auth/verify-email').post(verifyEmail)
router.route('/auth/resend-verification').post(resendVerificationCode)

router.route('/user').post(createUser)
router.route('/user/:id').get(getUser).put(updateUser).delete(deleteUser)
router.route('/users').get(getAllUsers)
router.route('/check-username').get(checkUsernameDuplicate)
router.route('/connect').post(createUserConnection)
router.route('/connection-status').get(getUserConnectionStatus)
router.route('/by-username').get(getUserByUsername)
router
  .route('/user-connection/:user_id/pending-requests')
  .get(getPendingConnectionRequests)
router.route('/user-connection/:user_id/history').get(getConnectionHistory)
router.route('/user-connection/:user_id/connected').get(getConnectedUsers)
router
  .route('/connection/:connection_id/respond')
  .put(respondToConnectionRequest)

// Block and Report routes
router.route('/block').post(blockUser)
router.route('/unblock').post(unblockUser)
router.route('/user/:user_id/blocked').get(getBlockedUsers)
router.route('/block-status').get(checkIfBlocked)
router.route('/report').post(reportUser)
router.route('/user/:user_id/reports').get(getUserReports)

// Admin routes
router.route('/admin/users').get(getAdminUsers)
router.route('/admin/users/:id').delete(deleteAdminUser)
router.route('/admin/users/:id/ban').post(banUser)
router.route('/admin/users/:id/unban').post(unbanUser)
router.route('/admin/creators/pending').get(getPendingCreators)
router.route('/admin/creators/:id/approve').post(approveCreator)
router.route('/reports').get(getAllReports)
router
  .route('/report/:id')
  .get(getReport)
  .put(updateReportStatus)
  .delete(deleteReport)
router.route('/analytics/dashboard').get(getDashboardStats)
router.route('/analytics/users').get(getUserStats)
router.route('/analytics/reports').get(getReportStats)

// File routes (legacy)
router.route('/file/upload').post(upload.single('file'), uploadFile)
router.route('/file/download/:filename').get(downloadFile)
router.route('/file/download-advanced/:filename').get(downloadFileAdvanced)
router.route('/file/download-custom/:filename').get(downloadFileWithCustomName)
router.route('/file/info/:filename').get(getFileInfo)
router.route('/file/list').get(listFiles)
router.route('/file/delete/:filename').delete(deleteFile)

// Enhanced download routes
router.route('/download/:filename').get(downloadFileNew)
router.route('/download-range/:filename').get(downloadFileWithRange)
router.route('/download-custom/:filename').get(downloadFileWithCustomNameNew)
router.route('/file-info/:filename').get(getFileInfoNew)
router.route('/files').get(listFilesNew)
router.route('/files/size').get(getFilesBySize)
router.route('/files/date-range').get(getFilesByDateRange)
router.route('/files/stats').get(getStorageStats)
router.route('/file-delete/:filename').delete(deleteFileNew)
router.route('/files/bulk-delete').post(bulkDeleteFiles)

export default router
