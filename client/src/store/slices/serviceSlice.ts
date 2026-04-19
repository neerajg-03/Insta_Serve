import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { servicesAPI } from '../../services/api';

interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  provider: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    profilePicture?: string;
    ratings: {
      average: number;
      count: number;
    };
  };
  price: number;
  priceType: 'fixed' | 'hourly' | 'per_session' | 'per_sqft';
  duration: {
    value: number;
    unit: string;
  };
  images: string[];
  serviceArea: string;
  skills: string[];
  experience: number;
  certifications: any[];
  isActive: boolean;
  isApproved: boolean;
  ratings: {
    average: number;
    count: number;
  };
  reviews: any[];
  bookingCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ServiceState {
  services: Service[];
  currentService: Service | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    category?: string;
    subcategory?: string;
    priceRange?: [number, number];
    rating?: number;
    location?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: ServiceState = {
  services: [],
  currentService: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

// Async thunks
export const fetchServices = createAsyncThunk(
  'services/fetchServices',
  async (params: { page?: number; limit?: number; category?: string; search?: string }, { rejectWithValue }) => {
    try {
      const response = await servicesAPI.getServices(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch services');
    }
  }
);

export const fetchService = createAsyncThunk(
  'services/fetchService',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await servicesAPI.getService(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch service');
    }
  }
);

export const createService = createAsyncThunk(
  'services/createService',
  async (serviceData: Partial<Service>, { rejectWithValue }) => {
    try {
      const response = await servicesAPI.createService(serviceData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create service');
    }
  }
);

export const updateService = createAsyncThunk(
  'services/updateService',
  async ({ id, serviceData }: { id: string; serviceData: Partial<Service> }, { rejectWithValue }) => {
    try {
      const response = await servicesAPI.updateService(id, serviceData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update service');
    }
  }
);

export const searchServices = createAsyncThunk(
  'services/searchServices',
  async ({ query, filters }: { query: string; filters?: any }, { rejectWithValue }) => {
    try {
      const response = await servicesAPI.searchServices(query, filters);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search services');
    }
  }
);

const serviceSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ServiceState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentService: (state, action: PayloadAction<Service | null>) => {
      state.currentService = action.payload;
    },
    setPagination: (state, action: PayloadAction<Partial<ServiceState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch services
      .addCase(fetchServices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services = action.payload.services || action.payload;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single service
      .addCase(fetchService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchService.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentService = action.payload.service || action.payload;
      })
      .addCase(fetchService.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create service
      .addCase(createService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services.unshift(action.payload.service || action.payload);
      })
      .addCase(createService.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update service
      .addCase(updateService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedService = action.payload.service || action.payload;
        const index = state.services.findIndex(service => service._id === updatedService._id);
        if (index !== -1) {
          state.services[index] = updatedService;
        }
        if (state.currentService?._id === updatedService._id) {
          state.currentService = updatedService;
        }
      })
      .addCase(updateService.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Search services
      .addCase(searchServices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchServices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services = action.payload.services || action.payload;
      })
      .addCase(searchServices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearError, setCurrentService, setPagination } = serviceSlice.actions;
export default serviceSlice.reducer;
