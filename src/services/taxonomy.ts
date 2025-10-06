import { 
  TaxonomyItem, 
  Make, 
  Model, 
  Generation,
  Derivative, 
  BodyType, 
  FuelType, 
  TransmissionType, 
  VehicleType,
  TaxonomyResponse 
} from '@/types/autotrader';

export interface TaxonomyParams {
  vehicleType?: string;
  makeId?: string;
  modelId?: string;
  generationId?: string;
  trim?: string;
  badgeEngineSize?: string;
  fuelType?: string;
  transmission?: string;
  [key: string]: string | undefined;
}

class TaxonomyService {
  private baseUrl = '/api/taxonomy';

  private async fetchTaxonomy<T>(type: string, params: TaxonomyParams = {}): Promise<T[]> {
    const searchParams = new URLSearchParams({ type });
    
    // Add all provided parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value);
      }
    });

    const url = `${this.baseUrl}?${searchParams.toString()}`;
    console.log(`🔍 Fetching taxonomy: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TaxonomyResponse<T> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'API request failed');
      }

      console.log(`✅ Taxonomy ${type} loaded:`, data.data.length, 'items');
      return data.data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${type}:`, error);
      throw error;
    }
  }

  async getVehicleTypes(): Promise<VehicleType[]> {
    return this.fetchTaxonomy<VehicleType>('vehicleTypes');
  }

  async getMakes(params: TaxonomyParams = {}): Promise<Make[]> {
    return this.fetchTaxonomy<Make>('makes', params);
  }

  async getModels(makeId: string, params: TaxonomyParams = {}): Promise<Model[]> {
    return this.fetchTaxonomy<Model>('models', { ...params, makeId });
  }

  async getGenerations(modelId: string, params: TaxonomyParams = {}): Promise<Generation[]> {
    return this.fetchTaxonomy<Generation>('generations', { ...params, modelId });
  }

  async getDerivatives(generationId: string, params: TaxonomyParams = {}): Promise<Derivative[]> {
    return this.fetchTaxonomy<Derivative>('derivatives', { ...params, generationId });
  }

  // Get facets for filtering derivatives
  async getTrimsFacets(generationId: string, params: TaxonomyParams = {}): Promise<TaxonomyItem[]> {
    return this.fetchTaxonomy<TaxonomyItem>('trims', { ...params, generationId });
  }

  async getBadgeEngineSizesFacets(generationId: string, params: TaxonomyParams = {}): Promise<TaxonomyItem[]> {
    return this.fetchTaxonomy<TaxonomyItem>('badgeEngineSizes', { ...params, generationId });
  }

  async getDoorsFacets(generationId: string, params: TaxonomyParams = {}): Promise<TaxonomyItem[]> {
    return this.fetchTaxonomy<TaxonomyItem>('doors', { ...params, generationId });
  }

  async getDrivetrainsFacets(generationId: string, params: TaxonomyParams = {}): Promise<TaxonomyItem[]> {
    return this.fetchTaxonomy<TaxonomyItem>('drivetrains', { ...params, generationId });
  }

  // Smart derivative filtering with facets
  async getFilteredDerivatives(generationId: string, params: TaxonomyParams = {}): Promise<{
    derivatives: Derivative[];
    filteringSteps: string[];
    totalCount: number;
  }> {
    const filteringSteps: string[] = [];
    const currentParams = { ...params, generationId };
    
    // Step 1: Get initial derivatives count
    const initialDerivatives = await this.getDerivatives(generationId, params);
    const initialCount = initialDerivatives.length;
    filteringSteps.push(`Initial: ${initialCount} derivatives`);
    
    // If we have 8 or fewer derivatives, return them as-is
    if (initialCount <= 8) {
      filteringSteps.push(`✅ Perfect count (≤8), showing all derivatives`);
      return {
        derivatives: initialDerivatives,
        filteringSteps,
        totalCount: initialCount
      };
    }

    // Step 2: Try filtering by trims first
    try {
      const trims = await this.getTrimsFacets(generationId, params);
      if (trims.length > 0 && trims.length <= 3) {
        // Use the most common trim
        const selectedTrim = trims[0].name;
        currentParams.trim = selectedTrim;
        const trimFiltered = await this.getDerivatives(generationId, currentParams);
        filteringSteps.push(`↓ After Trims filtering (${selectedTrim}): ${trimFiltered.length} derivatives`);
        
        if (trimFiltered.length <= 8) {
          filteringSteps.push(`✅ Perfect count after trim filtering`);
          return {
            derivatives: trimFiltered,
            filteringSteps,
            totalCount: initialCount
          };
        }
      }
    } catch {
      console.log('Trims filtering failed, continuing...');
    }

    // Step 3: Try filtering by engine size
    try {
      const engineSizes = await this.getBadgeEngineSizesFacets(generationId, params);
      if (engineSizes.length > 0 && engineSizes.length <= 4) {
        // Use the most common engine size
        const selectedEngineSize = engineSizes[0].name;
        currentParams.badgeEngineSize = selectedEngineSize;
        const engineFiltered = await this.getDerivatives(generationId, currentParams);
        filteringSteps.push(`↓ After Engine Size filtering (${selectedEngineSize}): ${engineFiltered.length} derivatives`);
        
        if (engineFiltered.length <= 8) {
          filteringSteps.push(`✅ Perfect count after engine size filtering`);
          return {
            derivatives: engineFiltered,
            filteringSteps,
            totalCount: initialCount
          };
        }
      }
    } catch {
      console.log('Engine size filtering failed, continuing...');
    }

    // Step 4: Try filtering by fuel type
    try {
      const fuelTypes = await this.getFuelTypes({ ...params, generationId });
      if (fuelTypes.length > 0 && fuelTypes.length <= 3) {
        // Use the most common fuel type (usually Petrol)
        const selectedFuelType = fuelTypes.find(f => f.name.toLowerCase().includes('petrol')) || fuelTypes[0];
        currentParams.fuelType = selectedFuelType.name;
        const fuelFiltered = await this.getDerivatives(generationId, currentParams);
        filteringSteps.push(`↓ After Fuel Type filtering (${selectedFuelType.name}): ${fuelFiltered.length} derivatives`);
        
        if (fuelFiltered.length <= 8) {
          filteringSteps.push(`✅ Perfect count after fuel type filtering`);
          return {
            derivatives: fuelFiltered,
            filteringSteps,
            totalCount: initialCount
          };
        }
      }
    } catch {
      console.log('Fuel type filtering failed, continuing...');
    }

    // Step 5: Try filtering by transmission
    try {
      const transmissions = await this.getTransmissionTypes({ ...params, generationId });
      if (transmissions.length > 0) {
        // Use Manual first, then Automatic
        const selectedTransmission = transmissions.find(t => t.name.toLowerCase().includes('manual')) || transmissions[0];
        currentParams.transmission = selectedTransmission.name;
        const transFiltered = await this.getDerivatives(generationId, currentParams);
        filteringSteps.push(`↓ After Transmission filtering (${selectedTransmission.name}): ${transFiltered.length} derivatives`);
        
        if (transFiltered.length <= 8) {
          filteringSteps.push(`✅ Perfect count after transmission filtering`);
          return {
            derivatives: transFiltered,
            filteringSteps,
            totalCount: initialCount
          };
        }
      }
    } catch {
      console.log('Transmission filtering failed, continuing...');
    }

    // If we still have too many, just return the first 8
    const finalDerivatives = initialDerivatives.slice(0, 8);
    filteringSteps.push(`⚠️ Still too many derivatives, showing first 8 of ${initialCount}`);
    
    return {
      derivatives: finalDerivatives,
      filteringSteps,
      totalCount: initialCount
    };
  }

  async getBodyTypes(params: TaxonomyParams = {}): Promise<BodyType[]> {
    return this.fetchTaxonomy<BodyType>('bodyTypes', params);
  }

  async getFuelTypes(params: TaxonomyParams = {}): Promise<FuelType[]> {
    return this.fetchTaxonomy<FuelType>('fuelTypes', params);
  }

  async getTransmissionTypes(params: TaxonomyParams = {}): Promise<TransmissionType[]> {
    return this.fetchTaxonomy<TransmissionType>('transmissionTypes', params);
  }

  // Helper method to get all specifications at once
  async getAllSpecifications(params: TaxonomyParams = {}): Promise<{
    bodyTypes: BodyType[];
    fuelTypes: FuelType[];
    transmissionTypes: TransmissionType[];
  }> {
    const [bodyTypes, fuelTypes, transmissionTypes] = await Promise.all([
      this.getBodyTypes(params),
      this.getFuelTypes(params),
      this.getTransmissionTypes(params),
    ]);

    return {
      bodyTypes,
      fuelTypes,
      transmissionTypes,
    };
  }
}

export default TaxonomyService;
