// Fixed query section
    // Build query for admin services with provider requests
    const query = {
      provider: null, // Admin-created services only
      'providerRequests.isApproved': false,
      'providerRequests.isRejected': { $ne: true }
    };
