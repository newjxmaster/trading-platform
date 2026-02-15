import { create } from 'zustand';
import { companyApi } from '@services/api';
import { Company, FilterOptions, CompanyRegistrationData } from '@types/index';

// ============================================
// Company Store
// ============================================

interface CompanyState {
  // Companies
  companies: Company[];
  selectedCompany: Company | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCompanies: (filters?: FilterOptions) => Promise<void>;
  fetchCompany: (id: string) => Promise<void>;
  registerCompany: (data: CompanyRegistrationData) => Promise<Company | null>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<void>;
  clearSelectedCompany: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  // Initial state
  companies: [],
  selectedCompany: null,
  isLoading: false,
  error: null,

  // Fetch companies
  fetchCompanies: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await companyApi.getAll(filters);
      if (response.data.success && response.data.data) {
        set({ companies: response.data.data as Company[] });
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      set({ error: 'Failed to fetch companies' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch single company
  fetchCompany: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await companyApi.getById(id);
      if (response.data.success && response.data.data) {
        set({ selectedCompany: response.data.data as Company });
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      set({ error: 'Failed to fetch company' });
    } finally {
      set({ isLoading: false });
    }
  },

  // Register company
  registerCompany: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await companyApi.register(data);
      if (response.data.success && response.data.data) {
        const company = response.data.data as Company;
        set(state => ({ 
          companies: [...state.companies, company] 
        }));
        return company;
      }
      return null;
    } catch (error) {
      console.error('Error registering company:', error);
      set({ error: 'Failed to register company' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Update company
  updateCompany: async (id: string, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await companyApi.update(id, data);
      if (response.data.success && response.data.data) {
        const updatedCompany = response.data.data as Company;
        set(state => ({
          companies: state.companies.map(c => 
            c.id === id ? updatedCompany : c
          ),
          selectedCompany: state.selectedCompany?.id === id 
            ? updatedCompany 
            : state.selectedCompany
        }));
      }
    } catch (error) {
      console.error('Error updating company:', error);
      set({ error: 'Failed to update company' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Clear selected company
  clearSelectedCompany: () => {
    set({ selectedCompany: null });
  },
}));

export default useCompanyStore;
