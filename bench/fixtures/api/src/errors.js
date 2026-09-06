/**
 * Convention 3: every failure this service reports is an AppError. The code is
 * the client's contract, the status is HTTP's, and the message is for a human.
 */
export class AppError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}
