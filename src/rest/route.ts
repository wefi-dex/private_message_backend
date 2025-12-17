import express, { Router } from 'express'
import { login } from './controller/auth'
import { createUser, deleteUser, getUser, updateUser, getAllUsers, checkUsernameDuplicate, createUserConnection, getUserConnectionStatus, getUserByUsername, getPendingConnectionRequests, respondToConnectionRequest, getConnectionHistory, getConnectedUsers, blockUser, unblockUser, getBlockedUsers, checkIfBlocked, reportUser, getUserReports } from './controller/user'
import { uploadFile, downloadFile, upload } from './controller/file';
import { getAllReports, getReport, updateReportStatus, deleteReport, getDashboardStats, getUserStats, getReportStats, getAllUsers as getAdminUsers, deleteUser as deleteAdminUser, banUser, unbanUser, getPendingCreators, approveCreator } from './controller/admin';

const router: Router = express.Router()

// Multer setup

router.route('/auth/login').post(login)

router.route('/user').post(createUser)
router.route('/user/:id').get(getUser).put(updateUser).delete(deleteUser)
router.route('/users').get(getAllUsers)
router.route('/check-username').get(checkUsernameDuplicate)
router.route('/connect').post(createUserConnection)
router.route('/connection-status').get(getUserConnectionStatus)
router.route('/by-username').get(getUserByUsername)
router.route('/user-connection/:user_id/pending-requests').get(getPendingConnectionRequests)
router.route('/user-connection/:user_id/history').get(getConnectionHistory)
router.route('/user-connection/:user_id/connected').get(getConnectedUsers)
router.route('/connection/:connection_id/respond').put(respondToConnectionRequest)

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
router.route('/report/:id').get(getReport).put(updateReportStatus).delete(deleteReport)
router.route('/analytics/dashboard').get(getDashboardStats)
router.route('/analytics/users').get(getUserStats)
router.route('/analytics/reports').get(getReportStats)

router.route('/file/upload').post(upload.single('file'), uploadFile);
router.route('/file/:filename').get(downloadFile);

export default router;
