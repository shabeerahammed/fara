// src/utils/apiResponse.js
// Standardised HTTP response helpers.
// Every endpoint calls one of these — keeps response shapes consistent.

class ApiResponse {
  /**
   * 200 OK — successful operation
   */
  static success(res, data = {}, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 201 Created — resource successfully created
   */
  static created(res, data = {}, message = 'Resource created') {
    return res.status(201).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 400 Bad Request — validation / input error
   */
  static badRequest(res, message = 'Bad request', details = null) {
    return res.status(400).json({
      success: false,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 404 Not Found
   */
  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 500 Internal Server Error
   */
  static error(res, message = 'Internal server error', err = null) {
    const payload = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };
    // Only expose error details in development
    if (err && process.env.NODE_ENV !== 'production') {
      payload.error = err.message || String(err);
    }
    return res.status(500).json(payload);
  }
}

module.exports = ApiResponse;
