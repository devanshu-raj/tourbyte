const express = require('express');
const viewController = require('./../controllers/viewController');
const authController = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');

const router = express.Router();

// router.use(authController.isLoggedIn);

router.get(
  '/',
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
router.get('/login', authController.isLoggedIn, viewController.getLogin);
router.get('/me', authController.protectRoute, viewController.getAccount);
router.get('/my-tours', authController.protectRoute, viewController.getMyTours);

router.post(
  '/submit-user-data',
  authController.protectRoute,
  viewController.updateUserData
);

module.exports = router;
