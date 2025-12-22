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
import { uploadFile, downloadFile, upload } from './controller/file'
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
import {
  getPlatformSubscriptionPlans,
  getCreatorPlatformSubscription,
  createPlatformSubscription,
  cancelPlatformSubscription,
  checkCreatorPostingPermission,
  startFreeTrial,
  createPaymentIntentEndpoint,
  upgradeMembershipSubscription,
} from './controller/payment'
import {
  getPaymentReviewDashboard,
  getPaymentReviewRequest,
  updatePaymentReviewRequest,
  createPayoutRequest,
  getPaymentIssues,
  updatePaymentIssue,
  getPaymentAuditLog,
} from './controller/admin-payment-review'
import {
  getAnalyticsDashboard,
  getCreatorPerformanceAnalytics,
  trackAnalyticsEvent,
} from './controller/advanced-analytics'
import {
  getCreatorInfo,
  getCreatorPosts,
  createPost,
  deletePost,
  togglePostLike,
  getPostLikes,
} from './controller/creator-feed'
import {
  getFanFeed,
  followCreator,
  unfollowCreator,
  getFollowedCreators,
} from './controller/fan-feed'

const router: Router = express.Router()

// Multer setup

// Auth routes
router.post('/auth/login', login)
router.post('/auth/register', register)
router.post('/auth/verify-email', verifyEmail)
router.post('/auth/resend-verification-code', resendVerificationCode)

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

// Payment and Subscription routes
router.route('/platform/subscription-plans').get(getPlatformSubscriptionPlans)
router
  .route('/platform/subscription')
  .get(getCreatorPlatformSubscription)
  .post(createPlatformSubscription)
router
  .route('/platform/subscription/:subscriptionId/cancel')
  .put(cancelPlatformSubscription)
router.route('/platform/posting-permission').get(checkCreatorPostingPermission)
router.route('/platform/start-trial').post(startFreeTrial)

// Payment Intent and Membership Upgrade routes
router.route('/payment/create-intent').post(createPaymentIntentEndpoint)
router.route('/subscription/upgrade').post(upgradeMembershipSubscription)

// Admin Payment Review routes
router.route('/admin/payment-review/dashboard').get(getPaymentReviewDashboard)
router
  .route('/admin/payment-review/request/:requestId')
  .get(getPaymentReviewRequest)
  .put(updatePaymentReviewRequest)
router.route('/admin/payment-review/payout').post(createPayoutRequest)
router.route('/admin/payment-review/issues').get(getPaymentIssues)
router.route('/admin/payment-review/issues/:issueId').put(updatePaymentIssue)
router.route('/admin/payment-review/audit-log').get(getPaymentAuditLog)

// Advanced Analytics routes
router.route('/analytics/dashboard').get(getAnalyticsDashboard)
router
  .route('/analytics/creator-performance')
  .get(getCreatorPerformanceAnalytics)
router.route('/analytics/track-event').post(trackAnalyticsEvent)

// Creator Feed routes
router.route('/creator/:creatorId/info').get(getCreatorInfo)
router.route('/creator/:creatorId/posts').get(getCreatorPosts)
router.route('/posts').post(createPost)
router.route('/posts/:postId').delete(deletePost)
router.route('/posts/:postId/like').post(togglePostLike)
router.route('/posts/:postId/likes').get(getPostLikes)

// Fan Feed routes
router.route('/fan/feed').get(getFanFeed)
router.route('/fan/follow/:creatorId').post(followCreator)
router.route('/fan/unfollow/:creatorId').post(unfollowCreator)
router.route('/fan/followed-creators').get(getFollowedCreators)

export default router
