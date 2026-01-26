/**
 * Map of server error codes to Thai messages
 */
const ERROR_CODE_MAP = {
    'INTERNAL_ERROR': 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง',
    'BARCODE_NOT_FOUND': 'ไม่พบบาร์โค้ดนี้ในระบบ',
    'NO_LOCATION_IN_POG': 'สินค้านี้ยังไม่มีใน Planogram',
    'NETWORK_ERROR': 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
    'UNAUTHORIZED': 'กรุณาเข้าสู่ระบบใหม่',
    'FORBIDDEN': 'ไม่มีสิทธิ์เข้าถึง',
    'ERROR': 'เกิดข้อผิดพลาด กรุณาลองใหม่',
};

/**
 * Helper to parse error messages from API responses
 * Prevents showing raw JSON or backend traces to users
 * @param {any} err - The error object caught in try-catch
 * @param {string} defaultMsg - Default message if no specific error found
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (err, defaultMsg = 'เกิดข้อผิดพลาด กรุณาลองใหม่') => {
    let msg = defaultMsg;
    let errorCode = null;

    if (err?.response?.data) {
        const data = err.response.data;
        // If data is object and has message
        if (data && typeof data === 'object') {
            // Check for ok: false pattern (common API error format)
            if (data.ok === false && data.message) {
                errorCode = data.message;
            } else if (data.message) {
                errorCode = data.message;
            } else if (data.code) {
                errorCode = data.code;
            }
        }
        // If data is string (maybe JSON string)
        else if (typeof data === 'string') {
            // Try parsing if it looks like JSON
            if (data.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.message) errorCode = parsed.message;
                    else if (parsed.code) errorCode = parsed.code;
                } catch (e) {
                    // Not valid JSON, might be a plain string error from server
                    if (data.length < 200 && !data.includes('Error:')) {
                        errorCode = data;
                    }
                }
            } else {
                // Determine if it's a user-friendly string
                if (data.length < 200 && !data.includes('<html>')) {
                    errorCode = data;
                }
            }
        }
    } else if (err.message) {
        if (err.message === 'Network Error') {
            return ERROR_CODE_MAP['NETWORK_ERROR'];
        }
        errorCode = err.message;
    }

    // Translate error code using map
    if (errorCode && ERROR_CODE_MAP[errorCode]) {
        msg = ERROR_CODE_MAP[errorCode];
    } else if (errorCode && typeof errorCode === 'string') {
        // If error code looks like Thai text, use it directly
        if (/[\u0E00-\u0E7F]/.test(errorCode)) {
            msg = errorCode;
        }
        // Otherwise use default message to avoid showing technical codes
    }

    // Final safety check: if msg is object, absolutely do not show it
    if (typeof msg === 'object') {
        msg = defaultMsg;
    }

    return msg;
};
