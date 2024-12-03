class ConflictError extends Error() {
  constructor(message) {
    super();
    this.message = message;
  }
}

class NotFoundError extends Error() {
  constructor(message) {
    super();
    this.message = message;
  }
}
