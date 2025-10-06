import { useState, useEffect } from 'react';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  status: string;
}

interface UseCustomersResult {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  searchCustomers: (query: string) => void;
  refetch: () => void;
}

export function useCustomers(): UseCustomersResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async (search?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/invoice-customers', window.location.origin);
      if (search) {
        url.searchParams.set('search', search);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || 'Failed to fetch customers');
      }
      
      setCustomers(data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = (query: string) => {
    fetchCustomers(query);
  };

  const refetch = () => {
    fetchCustomers();
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    error,
    searchCustomers,
    refetch,
  };
}
