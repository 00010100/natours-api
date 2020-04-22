const AppError = require('../utils/appError')

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  })
}

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    })
  }

  console.error('ERROR', err)

  res.status(500).json({
    status: 'err',
    message: 'Something went very wrong'
  })
}

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]

  return new AppError(
    `Duplicate field value: ${value}. Please use another value`,
    400
  )
}

const handleCastErrorDB = err => {
  return new AppError(`Invalid ${err.path} in ${err.value}`, 400)
}

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message)

  return new AppError(`Invalid input data ${errors.join('. ')}`, 400)
}

const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401)
}

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again!', 401)
}

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'err'

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, res)
  }

  let error = {...err}

  if (error.name === 'CastError') {
    error = handleCastErrorDB(error)
  }
  if (error.code === 11000) {
    error = handleDuplicateFieldsDB(error)
  }
  if (error.name === 'ValidationError') {
    error = handleValidationErrorDB(error)
  }
  if (error.name === 'JsonWebTokenError') {
    error = handleJWTError()
  }
  if (error.name === 'TokenExpiredError') {
    error = handleJWTExpiredError()
  }

  return sendErrorProd(error, res)
}
