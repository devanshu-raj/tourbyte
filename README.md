# TourByte

TourByte is a RESTful web API built upon the MVC framework. It also has a server-side rendered [website](http://tourbyte.herokuapp.com) based on the same API. Although the website doesn't use all the available features of the tourbyte API, but they can be implemented for other projects.

## Overview

* All the available tours can be viewed by anyone even without logging in.
* The user will have to login in order to be able to book a tour or write a review.
* The user can view and update their profile information such as name, email, profile photo etc.
* Only users with certain user roles will be able to create, update or delete a tour.
* Technologies used for this project include node.js, express, mongodb, jwt, mapbox, stripe etc.

## Getting Started

1. Clone or download this repository.

   ```sh
   git clone https://github.com/devanshu-raj/tourbyte.git
   ```

2. Install the required packages.

   ```sh
   npm install
   ```

3. This app needs API secret keys and other credentials to run locally. Create a `config.env` file in the root folder of the project and add the following fields :

    ```sh
    NODE_ENV='<environment>'
    PORT='<server-port>'

    # Database keys
    DATABASE='<mongodb-connection-string>'
    DATABASE_PASSWORD='<mongodb-password>'

    # JWT variables
    JWT_SECRET_KEY='<key>'
    JWT_EXPIRES='<token-validity>'
    JWT_COOKIE_EXPIRES='<cookie-validity>'

    # Mailtrap keys (for development)
    EMAIL_FROM='<your-email>'
    EMAIL_USERNAME='<mailtrap-username>'
    EMAIL_PASSWORD='<mailtrap-password>'
    EMAIL_HOST='<mailtrap-host>'
    EMAIL_PORT='<mailtrap-port>'

    # SendInBlue keys (for production)
    SENDINBLUE_USERNAME='<sendinblue-username>'
    SENDINBLUE_PASSWORD='<sendinblue-password>'
    SENDINBLUE_HOST='<sendinblue-host>'
    SENDINBLUE_PORT='<sendinblue-port>'

    # Stripe keys
    STRIPE_SECRET_KEY='<stripe-key>'
    STRIPE_WEBHOOK_SECRET='<webhook-key>'
    ```

4. Run the server and go to the specified port to test the API.
   ```sh
   # In development environment:
     npm start-dev

   # In production environment:
     npm start
   ```

## API

To access the API for the available resources, we need to hit the endpoint `/api/v1/` followed by the resource name. To perform operations on certain endpoints, the user needs to be authorized through bearer token and may need admin privileges. Other important API features like filtering, sorting, pagination and field limiting are also available on all the resources.

### Endpoints

* `tours` :

  a) _GET_ `/tours` : Retrieve all tours' data as JSON response.

  b) _GET_ `/tours/:tour-id` : Retrieve all data for the tour having document id `tour-id`.

  c) _GET_ `/tours/tour-stats` : Retrieve all tours' data classified according to the `difficulty` field in the tour model.

  d) _GET_ `/tours/monthly-plan` : Retrieve all tours' data according to each month of the year. User needs to be authorized as admin or tour guide in order to use this endpoint.

  e) _GET_ `/tours/tours-within/:radius/center/:latlng/unit/:unit` : Retrieve the tours' data which lie within the distance `radius` in `unit` (km/mi) from the point `latlng` (latitude, longitude) as center.

  f) _POST_ `/tours` : Create new tour by sending the required data in the request body. User needs to be authorized as admin in order to use this endpoint. Response contains the created tour data as JSON.

  g) _PATCH_ `/tours/:tour-id` : Update the tour having document id `tour-id` by sending the updated data in the request body. User needs to be authorized as admin in order to use this endpoint. Response contains the updated tour data.

  h) _DELETE_ `/tours/:tour-id` : Delete the tour with document id `tour-id`. User needs to be authorized as admin in order to use this endpoint. A response with empty body and status code `204` is sent back.

* `users` :

  a) _GET_ `/users` : Retrieve all users' data as JSON response. Only admins can access this endpoint. Passwords are encrypted and are not accessible even to the admins.

  b) _GET_ `/users/:user-id` : Retrieve data for the user having document id `user-id`. Only admins can access this endpoint.

  c) _GET_ `/users/me` : Retrieve the data for the current logged in user. This endpoint is accessible to all authorized users.

  d) _POST_ `/users/signup` : Create a new user and returns a valid jwt as response. All required fields must be specified in the request body.

  e) _POST_ `/users/login` : Login for an existing user. Send email and password in the request body. Returns jwt as response if login is successful.

  f) _POST_ `/users/forgotPassword` : Send a reset token to the registered email of the user. Provide email in the request body.

  g) _PATCH_ `/users/resetPassword/:resetToken` : Update the user password if the `resetToken` is valid and is the same as that sent to the registered email of the user. Provide `password` and `passwordConfirm` in the request body.

  h) _PATCH_ `/users/updateMe` : Update the profile information of the current logged in user (except password).

  i) _PATCH_ `/users/updateMyPassword` : Update the password of the current logged in user. Request body must contain `passwordCurrent`, `password` and `passwordConfirm`. A new jwt is sent as response.

  j) _PATCH_ `/users/:user-id` : Update user's profile information (except password). Only admins can access this endpoint.

  k) _DELETE_ `/users/deleteMe` : Delete the current logged in user (or mark as inactive user).

  l) _DELETE_ `/users/:user-id` : Delete the user with document id `user-id`. Only admins can access this endpoint.

* `reviews` :

  a) _GET_ `/reviews` : Retrieve all reviews for all the tours from the database. User must be logged in to access this endpoint.

  b) _GET_ `/reviews/:review-id` : Retrieve the review with document id `review-id`. User must be logged in to access this endpoint.

  c) _POST_ `/reviews` : Create a new review. Tour id and user id must be provided in the request body. Only users (not admins/tour guides) can access this endpoint.

  d) _PATCH_ `/reviews/:review-id` : Update the review with document id `review-id`. This endpoint can be accessed by both admins and users but not by tour guides.

  e) _DELETE_ `/reviews/:review-id` : Delete the review with document id `review-id`. This endpoint is also accessible to both admins and users but not to the tour guides.

* `bookings` :

  a) _GET_ `/bookings` : Retrieve all bookings data for all tours. Only admins and tour guides can access this endpoint.

  b) _GET_ `/bookings/:booking-id` : Retrieve the booking with document id `booking-id`. Only admins and tour guides can access this endpoint.

* `tours/:tour-id/reviews` :

  a) _GET_ `/tours/:tour-id/reviews` : Retrieve all reviews on the tour with document id `tour-id`. User needs to be logged in to access this endpoint.

  b) _POST_ `/tours/:tour-id/reviews` : Create a new review on the tour with document id `tour-id`. Only users (not admins/tour guides) can access this endpoint.

### Features

* **Filtering** :

  Filter parameters can be specified in the URL as query string. Simple filtering can be done by specifying the property name as the key and a value. For example,
  ```
  GET /api/v1/tours?duration=6&difficulty=easy
  ```
  Above request retrieves the tours which have the `duration` property set to `6` and `difficulty` property set to `easy`.<br>
 Advanced  filtering can also be done by using the operators such as `[lte]`, `[gte]`, `[lt]` and `[gt]`. For example,
  ```
  GET /api/v1/tours?price[gte]=1000&duration[lt]=8
  ```
  Above request retrieves the tours which have the value of `price` property greater than or equal to `1000` and `duration` less than `8`.

* **Sorting** :

   Sorting the response data is also possible by using the `sort` key in the query string and its value as the property by which you want to sort the data. For example,
   ```
   GET /api/v1/tours?sort=price
   ```
   Above request retrieves all the tours' data sorted by price in ascending / non-decreasing order. To retrieve data in decreasing / non-increasing order, append a minus `-` sign before the value of sort property. For example,
   ```
   GET /api/v1/tours?sort=-ratingsAverage
   ```
   Above request retrieves all the tours' data sorted by average ratings in the descending order.

* **Pagination** :

   Pagination distributes the retrieved response data among different pages. Querying without pagination may retrieve millions of results from the database at once which can be very difficult to handle.<br>Pagination can be done by specifying a `limit` property with value set to the number of results per page and `page` property with value equals the page number of the response you want to retrieve. For example,
   ```
   GET /api/v1/tours?limit=5&page=2
   ```
   Above request retrieves the page number `2` of the tours' data where each page contains a maximum of `5` results.

* **Field limiting** :

   Field limiting restricts the number of fields in each object of the retrieved response. It can be done by specifying the fields which you want in the response data as value to `fields` property separated by commas `,`. Append a minus `-` sign before the fields which you don't want to show up in the response. For example,
   ```
   GET /api/v1/tours?fields=name,-guides
   ```
   Above request retrieves the `name` and hides the `guides` field for each object in the response.

## Live Demo
The project is deployed on Heroku [@tourbyte](http://tourbyte.herokuapp.com/) and its API is also available and can be accessed like [_GET_ /api/v1/tours](http://tourbyte.herokuapp.com/api/v1/tours).
