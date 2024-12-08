export class CRUDError extends Error {
  get statusCode() {
    throw new Error('Abstract method');
  }
}

export class ConflictError extends CRUDError {
  get statusCode() {
    return 409;
  }
}

export class NotFoundError extends CRUDError {
  get statusCode() {
    return 404;
  }
}
