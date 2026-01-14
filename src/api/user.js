// API functions for user features
import api from './axios';

/**
 * ดึง Planogram Template และ Product สำหรับสาขา
 * @param {string} branchCode - รหัสสาขา
 */
export const getTemplateAndProduct = async (branchCode) => {
    const res = await api.post('/template-item', { branchCode });
    return res.data; // { branchCode, branchName, items }
};

/**
 * ดึงเวลาอัปเดต Stock ล่าสุด
 */
export const getStockLastUpdate = async () => {
    const res = await api.get('/stock-last-update');
    return res.data; // { updatedAt, rowCount }
};

/**
 * ดึง Shelf Templates ของสาขา
 * @param {string} branchCode - รหัสสาขา
 */
export const getBranchShelves = async (branchCode) => {
    const res = await api.get('/branch-shelves', { params: { branchCode } });
    return res.data;
};

/**
 * สร้าง POG Request ใหม่
 * @param {object} data - ข้อมูล request
 */
export const createPogRequest = async (data) => {
    const res = await api.post('/pog-request', data);
    return res.data;
};

/**
 * ดึงประวัติ POG Request ของสาขา
 * @param {string} branchCode - รหัสสาขา
 */
export const getMyPogRequests = async (branchCode) => {
    const res = await api.get('/pog-request', { params: { branchCode } });
    return res.data;
};

/**
 * ยกเลิก POG Request
 * @param {number} id - ID ของ request
 */
export const cancelPogRequest = async (id) => {
    const res = await api.patch(`/pog-request/${id}/cancel`);
    return res.data;
};

/**
 * ค้นหาสินค้าจาก Barcode (Master Lookup)
 * @param {string} branchCode
 * @param {string} barcode
 */
export const lookupProduct = async (branchCode, barcode) => {
    const res = await api.get('/lookup', { params: { branchCode, barcode } });
    return res.data;
};
