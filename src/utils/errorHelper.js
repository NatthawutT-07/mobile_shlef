/**
 * Helper to parse error messages from API responses
 * Prevents showing raw JSON or backend traces to users
 * @param {any} err - The error object caught in try-catch
 * @param {string} defaultMsg - Default message if no specific error found
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (err, defaultMsg = 'เกิดข้อผิดพลาด กรุณาลองใหม่') => {
    let msg = defaultMsg;

    if (err?.response?.data) {
        const data = err.response.data;
        // If data is object and has message
        if (data && typeof data === 'object' && data.message) {
            msg = data.message;
        }
        // If data is string (maybe JSON string)
        else if (typeof data === 'string') {
            // Try parsing if it looks like JSON
            if (data.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.message) msg = parsed.message;
                    // If parsed object doesn't have message, ignore it to avoid showing raw data
                } catch (e) {
                    // Not valid JSON, might be a plain string error from server
                    // But if it looks technically (contains 'Error' or stack trace), fallback to default
                    if (data.length < 200 && !data.includes('Error:')) {
                        msg = data;
                    }
                }
            } else {
                // Determine if it's a user-friendly string
                if (data.length < 200 && !data.includes('<html>')) {
                    msg = data;
                }
            }
        }
    } else if (err.message && !err.message.includes('Network Error')) {
        // Axios network errors are safe to show "Network Error" but let's be more specific if we can
        // Generally prefer defaultMsg for technical errors
        if (err.message === 'Network Error') {
            msg = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
        }
    }

    // Final safety check: if msg is object, absolutely do not show it
    if (typeof msg === 'object') {
        msg = defaultMsg;
    }

    return msg;
};
