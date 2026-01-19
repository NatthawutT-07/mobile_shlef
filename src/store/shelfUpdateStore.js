// Store สำหรับจัดการ shelf update notifications
import { create } from 'zustand';
import api from '../api/axios';

const useShelfUpdateStore = create((set, get) => ({
    // สถานะว่ามี update หรือไม่
    hasShelfUpdate: false,
    isLoading: false,
    // ✅ เก็บ change logs รายละเอียด
    changeLogs: [],
    unacknowledgedCount: 0,

    // ตรวจสอบว่าสาขามี shelf update หรือไม่ + ดึง logs
    checkShelfUpdate: async (branchCode) => {
        if (!branchCode) return;

        set({ isLoading: true });
        try {
            // ดึง change logs (ที่ยังไม่รับทราบ)
            const res = await api.get(`/shelf-change-logs/${branchCode}`);
            const logs = res.data?.logs || [];
            const unacknowledgedCount = res.data?.unacknowledgedCount || 0;

            set({
                changeLogs: logs,
                unacknowledgedCount,
                hasShelfUpdate: unacknowledgedCount > 0,
                isLoading: false,
            });
        } catch (error) {
            console.error('Check shelf update error:', error);
            set({ isLoading: false });
        }
    },

    // ✅ ดึง change logs รายละเอียด (refresh - เฉพาะที่ยังไม่รับทราบ)
    fetchChangeLogs: async (branchCode) => {
        if (!branchCode) return;

        try {
            const res = await api.get(`/shelf-change-logs/${branchCode}`);
            const logs = res.data?.logs || [];
            const unacknowledgedCount = res.data?.unacknowledgedCount || 0;

            set({
                changeLogs: logs,
                unacknowledgedCount,
                hasShelfUpdate: unacknowledgedCount > 0,
            });
        } catch (error) {
            console.error('Fetch change logs error:', error);
        }
    },

    // ✅ ดึง history ทั้งหมด (รวม acknowledged) สำหรับเปิด modal
    fetchAllHistory: async (branchCode) => {
        if (!branchCode) return;

        try {
            const res = await api.get(`/shelf-change-logs/${branchCode}?all=true`);
            set({
                changeLogs: res.data?.logs || [],
            });
        } catch (error) {
            console.error('Fetch all history error:', error);
        }
    },

    // ✅ รับทราบ ทีละตัว (by log id)
    acknowledgeOne: async (logId, branchCode) => {
        if (!logId) return false;

        try {
            await api.post(`/shelf-change-log-acknowledge/${logId}`);

            // ลบออกจาก list หรือ mark as acknowledged
            set((state) => {
                const updatedLogs = state.changeLogs.filter((log) => log.id !== logId);
                return {
                    changeLogs: updatedLogs,
                    unacknowledgedCount: Math.max(0, state.unacknowledgedCount - 1),
                    hasShelfUpdate: updatedLogs.length > 0,
                };
            });
            return true;
        } catch (error) {
            console.error('Acknowledge one error:', error);
            return false;
        }
    },

    // ✅ รับทราบทั้งหมดของสาขา
    acknowledgeAll: async (branchCode) => {
        if (!branchCode) return false;

        try {
            await api.post(`/shelf-change-logs-acknowledge-all/${branchCode}`);
            // อัพเดท ShelfUpdate flag ด้วย
            await api.post(`/shelf-update-acknowledge/${branchCode}`);

            set({
                changeLogs: [],
                unacknowledgedCount: 0,
                hasShelfUpdate: false,
            });
            return true;
        } catch (error) {
            console.error('Acknowledge all error:', error);
            return false;
        }
    },

    // Reset state
    reset: () => {
        set({
            hasShelfUpdate: false,
            isLoading: false,
            changeLogs: [],
            unacknowledgedCount: 0,
        });
    },
}));

export default useShelfUpdateStore;
