const express = require('express');
const viewController = require('./../controllers/viewController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(viewController.alerts);

router.get('/', authController.isLoggedIn, viewController.getOverview);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLogin);
router.get('/signup', authController.isLoggedIn, viewController.getSignup);
router.get('/me', authController.protectRoute, viewController.getAccount);
router.get('/my-tours', authController.protectRoute, viewController.getMyTours);

router.post(
  '/submit-user-data',
  authController.protectRoute,
  viewController.updateUserData
);

module.exports = router;
