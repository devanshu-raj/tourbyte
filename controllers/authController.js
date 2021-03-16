const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  // Remove password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1. Check if Email and password exists in the request
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2. Check if user exists and password is correct
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.checkPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3. Send token back to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'logout', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// AUTHENTICATION MIDDLEWARE
exports.protectRoute = catchAsync(async (req, res, next) => {
  //1. Check if token exists in the request headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to get access', 401)
    );
  }

  //2. Verifying the token
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  //3. Check if the user exists
  const currentUser = await User.findById(decodedPayload.id);
  if (!currentUser) {
    return next(new AppError('The user no longer exists', 401));
  }

  //4. Check if user changed password after the token was issued
  if (currentUser.isPasswordChanged(decodedPayload.iat)) {
    return next(
      new AppError('User recently changed password! Please login again.', 401)
    );
  }

  // Grant Access
  req.user = currentUser;
  res.locals.user = currentUser; //for rendering template
  next();
});

// Middleware for checking whether a user is logged in or not
// Only for rendering pages correctly, never returns error
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1. Verifying the token
      const decodedPayload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET_KEY
      );

      // 2. Check if user still exists
      const currentUser = await User.findById(decodedPayload.id);
      if (!currentUser) {
        return next();
      }

      // 3. Check if user changed password after the token was issued
      if (currentUser.isPasswordChanged(decodedPayload.iat)) {
        return next();
      }

      // User is logged in
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

//AUTHORIZATION MIDDLEWARE
// wrapper function which takes roles as an array argument
exports.restrictTo = (...roles) => {
  //Middleware wrapped inside
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// FORGOT PASSWORD
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. Find user by email in the DB
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new AppError('User with the given email address does not exist', 404)
    );
  }

  //2. Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3. Send the reset token to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to the registered email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Please try again later!',
        500
      )
    );
  }
});

// RESET PASSWORD MIDDLEWARE
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2. If token is not expired and user exists, reset the password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3. Update changedPasswordAt property for the user
  //IMPLEMENTED AS pre-save hook in userModel
  //4. Login the user, send new jwt
  createSendToken(user, 200, req, res);
});

//UPDATING CURRENT USER PASSWORD
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get the user from DB collection
  const user = await User.findById(req.user.id).select('+password');

  //2. Check if the POSTed password is correct
  if (!(await user.checkPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Incorrect Password', 401));
  }

  //3. If password is correct, update password

  //User.findByIdAndUpdate will NOT work
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4. Log user in with the new password (send new jwt)
  createSendToken(user, 200, req, res);
});
