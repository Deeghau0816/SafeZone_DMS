// Contact validation utilities

/**
 * Validates required contact fields
 * @param {Object} body - Request body containing contact data
 * @returns {Array} Array of validation errors (empty if valid)
 */
const validateContactData = (body) => {
  const errors = [];
  const { name, email, phone, problem } = body;

  if (!name || !email || !phone || !problem) {
    errors.push("All fields are required");
  }

  return errors;
};

/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {Array} Array of validation errors (empty if valid)
 */
const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push("Email is required");
    return errors;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Please provide a valid email address");
  }

  return errors;
};

/**
 * Validates phone number format (Sri Lankan 10-digit format)
 * @param {string} phone - Phone number to validate
 * @returns {Array} Array of validation errors (empty if valid)
 */
const validatePhone = (phone) => {
  const errors = [];
  
  if (!phone) {
    errors.push("Phone number is required");
    return errors;
  }

  // Clean phone number (remove non-digits)
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (!cleanPhone.startsWith('0')) {
    errors.push("Phone number must start with 0");
  }
  
  if (cleanPhone.length !== 10) {
    errors.push("Phone number must be exactly 10 digits");
  }
  
  const phoneRegex = /^0[0-9]{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    errors.push("Please provide a valid phone number (e.g., 0771234567)");
  }

  return errors;
};

module.exports = {
  validateContactData,
  validateEmail,
  validatePhone
};
