"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("./controller/auth");
const user_1 = require("./controller/user");
const file_1 = require("./controller/file");
const download_1 = require("./controller/download");
const admin_1 = require("./controller/admin");
const payment_1 = require("./controller/payment");
const stripe_webhook_1 = require("./controller/stripe-webhook");
const payment_intent_1 = require("./controller/payment-intent");
const admin_payment_review_1 = require("./controller/admin-payment-review");
const advanced_analytics_1 = require("./controller/advanced-analytics");
const router = express_1.default.Router();
// Multer setup
// Auth routes
router.post('/auth/register', auth_1.register);
router.post('/auth/login', auth_1.login);
router.post('/auth/verify-email', auth_1.verifyEmail);
router.post('/auth/resend-verification', auth_1.resendVerificationCode);
router.post('/auth/forgot-password', auth_1.requestPasswordReset);
router.post('/auth/verify-reset-code', auth_1.verifyPasswordResetCode);
router.post('/auth/reset-password', auth_1.resetPassword);
router.post('/auth/select-role', auth_1.selectRole);
router.post('/auth/complete-creator-profile', auth_1.completeCreatorProfile);
router.route('/user').post(user_1.createUser);
router.route('/user/:id').get(user_1.getUser).put(user_1.updateUser).delete(user_1.deleteUser);
router.route('/users').get(user_1.getAllUsers);
router.route('/check-username').get(user_1.checkUsernameDuplicate);
router.route('/connect').post(user_1.createUserConnection);
router.route('/connection-status').get(user_1.getUserConnectionStatus);
router.route('/by-username').get(user_1.getUserByUsername);
router
    .route('/user-connection/:user_id/pending-requests')
    .get(user_1.getPendingConnectionRequests);
router.route('/user-connection/:user_id/history').get(user_1.getConnectionHistory);
router.route('/user-connection/:user_id/connected').get(user_1.getConnectedUsers);
router
    .route('/connection/:connection_id/respond')
    .put(user_1.respondToConnectionRequest);
// Block and Report routes
router.route('/block').post(user_1.blockUser);
router.route('/unblock').post(user_1.unblockUser);
router.route('/user/:user_id/blocked').get(user_1.getBlockedUsers);
router.route('/block-status').get(user_1.checkIfBlocked);
router.route('/report').post(user_1.reportUser);
router.route('/user/:user_id/reports').get(user_1.getUserReports);
// Admin routes
router.route('/admin/users').get(admin_1.getAllUsers);
router.route('/admin/users/:id').delete(admin_1.deleteUser);
router.route('/admin/users/:id/ban').post(admin_1.banUser);
router.route('/admin/users/:id/unban').post(admin_1.unbanUser);
router.route('/admin/creators/pending').get(admin_1.getPendingCreators);
router.route('/admin/creators/:id/approve').post(admin_1.approveCreator);
router.route('/reports').get(admin_1.getAllReports);
router
    .route('/report/:id')
    .get(admin_1.getReport)
    .put(admin_1.updateReportStatus)
    .delete(admin_1.deleteReport);
router.route('/analytics/dashboard').get(admin_1.getDashboardStats);
router.route('/analytics/users').get(admin_1.getUserStats);
router.route('/analytics/reports').get(admin_1.getReportStats);
// File routes (legacy)
router.route('/file/upload').post(file_1.upload.single('file'), file_1.uploadFile);
router.route('/file/download/:filename').get(file_1.downloadFile);
router.route('/file/download-advanced/:filename').get(file_1.downloadFileAdvanced);
router.route('/file/download-custom/:filename').get(file_1.downloadFileWithCustomName);
router.route('/file/info/:filename').get(file_1.getFileInfo);
router.route('/file/list').get(file_1.listFiles);
router.route('/file/delete/:filename').delete(file_1.deleteFile);
// Enhanced download routes
router.route('/download/:filename').get(download_1.downloadFile);
router.route('/download-range/:filename').get(download_1.downloadFileWithRange);
router.route('/download-custom/:filename').get(download_1.downloadFileWithCustomName);
router.route('/file-info/:filename').get(download_1.getFileInfo);
router.route('/files').get(download_1.listFiles);
router.route('/files/size').get(download_1.getFilesBySize);
router.route('/files/date-range').get(download_1.getFilesByDateRange);
router.route('/files/stats').get(download_1.getStorageStats);
router.route('/file-delete/:filename').delete(download_1.deleteFile);
router.route('/files/bulk-delete').post(download_1.bulkDeleteFiles);
// Payment and Subscription routes
router.route('/subscription-plans').get(payment_1.getSubscriptionPlans);
router
    .route('/creator/:creatorId/subscription-info')
    .get(payment_1.getCreatorSubscriptionInfo);
router.route('/subscription').post(payment_1.createSubscription);
router.route('/tip').post(payment_1.sendTip);
router.route('/user/subscriptions').get(payment_1.getUserSubscriptions);
router.route('/creator/subscribers').get(payment_1.getCreatorSubscribers);
router.route('/subscription/:subscriptionId/cancel').put(payment_1.cancelSubscription);
router.route('/creator/payment-settings').put(payment_1.updateCreatorPaymentSettings);
router.route('/creator/payment-analytics').get(payment_1.getCreatorPaymentAnalytics);
// Stripe webhook endpoint (no authentication required)
router.route('/stripe/webhook').post(stripe_webhook_1.handleStripeWebhook);
// Payment intent endpoints
router.route('/payment/create-intent').post(payment_intent_1.createPaymentIntentController);
router.route('/payment/confirm/:paymentIntentId').post(payment_intent_1.confirmPaymentIntent);
// Admin Payment Review routes
router.route('/admin/payment-review/dashboard').get(admin_payment_review_1.getPaymentReviewDashboard);
router
    .route('/admin/payment-review/request/:requestId')
    .get(admin_payment_review_1.getPaymentReviewRequest)
    .put(admin_payment_review_1.updatePaymentReviewRequest);
router.route('/admin/payment-review/payout').post(admin_payment_review_1.createPayoutRequest);
router.route('/admin/payment-review/issues').get(admin_payment_review_1.getPaymentIssues);
router.route('/admin/payment-review/issues/:issueId').put(admin_payment_review_1.updatePaymentIssue);
router.route('/admin/payment-review/audit-log').get(admin_payment_review_1.getPaymentAuditLog);
// Advanced Analytics routes
router.route('/analytics/dashboard').get(advanced_analytics_1.getAnalyticsDashboard);
router
    .route('/analytics/creator-performance')
    .get(advanced_analytics_1.getCreatorPerformanceAnalytics);
router.route('/analytics/track-event').post(advanced_analytics_1.trackAnalyticsEvent);
exports.default = router;
