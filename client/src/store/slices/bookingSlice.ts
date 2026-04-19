import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { bookingsAPI } from '../../services/api';

interface Booking {
  _id: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  provider: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  service: {
    _id: string;
    title: string;
    category: string;
    price: number;
    priceType: string;
  };
  scheduledDate: string;
  duration: {
    value: number;
    unit: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  price: {
    basePrice: number;
    additionalCharges: number;
    discount: number;
    totalPrice: number;
    currency: string;
  };
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  customerNotes?: string;
  providerNotes?: string;
  review?: {
    rating: number;
    comment: string;
    reviewedAt: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    note?: string;
    updatedBy: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
    dateRange?: [string, string];
    role?: 'customer' | 'provider';
  };
}

const initialState: BookingState = {
  bookings: [],
  currentBooking: null,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchBookings = createAsyncThunk(
  'bookings/fetchBookings',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.getBookings(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }
);

export const fetchBooking = createAsyncThunk(
  'bookings/fetchBooking',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.getBooking(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch booking');
    }
  }
);

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData: Partial<Booking>, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.createBooking(bookingData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create booking');
    }
  }
);

export const updateBooking = createAsyncThunk(
  'bookings/updateBooking',
  async ({ id, bookingData }: { id: string; bookingData: Partial<Booking> }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.updateBooking(id, bookingData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update booking');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.cancelBooking(id, reason);
      return { ...response, id };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel booking');
    }
  }
);

export const completeBooking = createAsyncThunk(
  'bookings/completeBooking',
  async ({ id, completionData }: { id: string; completionData?: any }, { rejectWithValue }) => {
    try {
      const response = await bookingsAPI.completeBooking(id, completionData);
      return { ...response, id };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete booking');
    }
  }
);

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<BookingState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentBooking: (state, action: PayloadAction<Booking | null>) => {
      state.currentBooking = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch bookings
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload.bookings || action.payload;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single booking
      .addCase(fetchBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBooking = action.payload.booking || action.payload;
      })
      .addCase(fetchBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings.unshift(action.payload.booking || action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update booking
      .addCase(updateBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedBooking = action.payload.booking || action.payload;
        const index = state.bookings.findIndex(booking => booking._id === updatedBooking._id);
        if (index !== -1) {
          state.bookings[index] = updatedBooking;
        }
        if (state.currentBooking?._id === updatedBooking._id) {
          state.currentBooking = updatedBooking;
        }
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Cancel booking
      .addCase(cancelBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const { id } = action.payload;
        const index = state.bookings.findIndex(booking => booking._id === id);
        if (index !== -1) {
          state.bookings[index].status = 'cancelled';
        }
        if (state.currentBooking && state.currentBooking._id === id) {
          state.currentBooking.status = 'cancelled';
        }
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Complete booking
      .addCase(completeBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const { id } = action.payload;
        const index = state.bookings.findIndex(booking => booking._id === id);
        if (index !== -1) {
          state.bookings[index].status = 'completed';
        }
        if (state.currentBooking && state.currentBooking._id === id) {
          state.currentBooking.status = 'completed';
        }
      })
      .addCase(completeBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearError, setCurrentBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
