import { create } from 'zustand';
import { getActiveBranches } from '../api/user';

const useBranchStore = create((set, get) => ({
    branches: [],
    isLoading: false,
    
    fetchBranches: async () => {
        set({ isLoading: true });
        try {
            const data = await getActiveBranches();
            set({ branches: data || [], isLoading: false });
        } catch (error) {
            if (__DEV__) console.error('Fetch branches error:', error);
            set({ isLoading: false });
        }
    },
    
    getBranchName: (code) => {
        const branches = get().branches;
        const branch = branches.find(b => b.code === code);
        if (!branch) return code;
        
        // Extract branch name from label
        // Format: "ST001 - Mega Bangna / เมกาบางนา"
        // We want to extract only the Thai name after "/"
        let name = branch.label;
        
        // First remove the code prefix (e.g. "ST001 - ")
        if (name.includes(' - ')) {
            name = name.split(' - ')[1];
        }
        
        // Then extract text after "/" (Thai name)
        if (name.includes(' / ')) {
            name = name.split(' / ')[1];
        }
        
        return name.trim();
    }
}));

export default useBranchStore;
