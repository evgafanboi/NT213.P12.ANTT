
> ! useless documentation and is no longer updated


# API Documentation

## Authentication

### Register User
- **Endpoint**: `/auth/register/send-code`
- **Method**: `POST`
- **Description**: Receive a new user registration request and send a verification code to the user's email.
- **Request Body**:
  ```json
  {
    "email": "string (email format)",
    "password": "string (min 6 characters)"
  }
  ```
- **Responses**:
  - `200 OK`: Verification code sent successfully.
  - `400 Bad Request`: Invalid registration information.
  - `500 Internal Server Error`: Server error.

### Verify User Registration/2FA
- **Endpoint**: `/auth/verify`
- **Method**: `POST`
- **Description**: Verify the user registration or 2FA by entering the verification code received in the user's email. This endpoint is used for both registration verification and login 2FA.
- **Request Body**:
  ```json
  {
    "email": "string (email format)",
    "code": "string (fixed 6 characters)"
  }
  ```
- **Responses**:
  - `201 Created`: User registered successfully.
  - `400 Bad Request`: Invalid verification code.
  - `500 Internal Server Error`: Server error.

### Login User
- **Endpoint**: `/auth/login`
- **Method**: `POST`
- **Description**: Logs in an existing user.
- **Request Body**:
  ```json
  {
    "email": "string (email format)",
    "password": "string"
  }
  ```
- **Responses**:
  - `200 OK`: Logged in successfully or 2FA required.
  - `400 Bad Request`: Invalid credentials or validation errors.
  - `500 Internal Server Error`: Server error.

### Logout User
- **Endpoint**: `/auth/logout`
- **Method**: `POST`
- **Description**: Logs out the current user.
- **Responses**:
  - `200 OK`: Logged out successfully.
  - `500 Internal Server Error`: Server error.

## Posts

### Create Post
- **Endpoint**: `/api/posts`
- **Method**: `POST`
- **Description**: Creates a new post.
- **Request Body**:
  ```json
  {
    "title": "string (min 1 character)",
    "content": "string (min 1 character)"
  }
  ```
- **Responses**:
  - `201 Created`: Post created successfully.
  - `400 Bad Request`: Validation errors.
  - `401 Unauthorized`: User not logged in.
  - `500 Internal Server Error`: Server error.

### Get All Posts
- **Endpoint**: `/api/posts`
- **Method**: `GET`
- **Description**: Retrieves all posts.
- **Responses**:
  - `200 OK`: Returns a list of posts.
  - `500 Internal Server Error`: Server error.

### Get Specific Post
- **Endpoint**: `/api/posts/:id`
- **Method**: `GET`
- **Description**: Retrieves a specific post by ID.
- **Responses**:
  - `200 OK`: Returns the post.
  - `404 Not Found`: Post not found.
  - `500 Internal Server Error`: Server error.

### Update Post
- **Endpoint**: `/api/posts/:id`
- **Method**: `PUT`
- **Description**: Updates a specific post by ID.
- **Request Body**:
  ```json
  {
    "title": "string (optional)",
    "content": "string (optional)"
  }
  ```
- **Responses**:
  - `200 OK`: Post updated successfully.
  - `400 Bad Request`: Validation errors.
  - `401 Unauthorized`: User not logged in.
  - `403 Forbidden`: User not authorized to update this post.
  - `404 Not Found`: Post not found.
  - `500 Internal Server Error`: Server error.

### Delete Post
- **Endpoint**: `/api/posts/:id`
- **Method**: `DELETE`
- **Description**: Deletes a specific post by ID.
- **Responses**:
  - `200 OK`: Post deleted successfully.
  - `401 Unauthorized`: User not logged in.
  - `403 Forbidden`: User not authorized to delete this post.
  - `404 Not Found`: Post not found.
  - `500 Internal Server Error`: Server error.

## Comments

### Create Comment
- **Endpoint**: `/api/comments`
- **Method**: `POST`
- **Description**: Creates a new comment on a post.
- **Request Body**:
  ```json
  {
    "post_id": "integer",
    "content": "string (min 1 character)"
  }
  ```
- **Responses**:
  - `201 Created`: Comment created successfully.
  - `400 Bad Request`: Validation errors.
  - `401 Unauthorized`: User not logged in.
  - `500 Internal Server Error`: Server error.

### Get Comments for a Post
- **Endpoint**: `/api/comments/post/:postId`
- **Method**: `GET`
- **Description**: Retrieves all comments for a specific post.
- **Responses**:
  - `200 OK`: Returns a list of comments.
  - `500 Internal Server Error`: Server error.

### Update Comment
- **Endpoint**: `/api/comments/:id`
- **Method**: `PUT`
- **Description**: Updates a specific comment by ID.
- **Request Body**:
  ```json
  {
    "content": "string (min 1 character)"
  }
  ```
- **Responses**:
  - `200 OK`: Comment updated successfully.
  - `400 Bad Request`: Validation errors.
  - `401 Unauthorized`: User not logged in.
  - `403 Forbidden`: User not authorized to update this comment.
  - `404 Not Found`: Comment not found.
  - `500 Internal Server Error`: Server error.

### Delete Comment
- **Endpoint**: `/api/comments/:id`
- **Method**: `DELETE`
- **Description**: Deletes a specific comment by ID.
- **Responses**:
  - `200 OK`: Comment deleted successfully.
  - `401 Unauthorized`: User not logged in.
  - `403 Forbidden`: User not authorized to delete this comment.
  - `404 Not Found`: Comment not found.
  - `500 Internal Server Error`: Server error.

## Error Handling
- **404 Not Found**: Returned when a requested resource is not found.
- **500 Internal Server Error**: Returned when the server encounters an unexpected condition.

## Authentication Middleware
- **Function**: `isAuthenticated`
- **Description**: Middleware to check if a user is authenticated. If not, it returns a `401 Unauthorized` response.

## Database
- **Tables**:
  - `users`: Stores user information.
  - `posts`: Stores post information.
  - `comments`: Stores comment information.

For more details, refer to the codebase or contact backend team.
