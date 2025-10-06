/**
 * UK Vehicle Registration Date Calculator
 * 
 * Implements the proper UK plate period logic for calculating first registration dates
 * based on plate identifiers and vehicle production periods.
 * 
 * Based on the PHP cam-taxonomy-search.php calculate_registration_date() function
 */

interface PlatePeriod {
  start: Date;
  end: Date;
  identifier: string;
}

interface RegistrationCalculationResult {
  firstRegistrationDate: string; // ISO date string
  platePeriod: PlatePeriod;
  calculationMethod: 'plate_period' | 'default_fallback' | 'no_overlap_fallback';
  notes?: string;
}

export class RegistrationDateCalculator {
  
  /**
   * Calculate first registration date based on plate identifier and vehicle production period
   * 
   * @param plateIdentifier - The plate identifier (e.g., "51", "Y", "22", "67")
   * @param introducedDate - When the vehicle model was introduced (YYYY-MM-DD format)
   * @param discontinuedDate - When the vehicle model was discontinued (YYYY-MM-DD format, optional)
   * @returns RegistrationCalculationResult
   */
  static calculateRegistrationDate(
    plateIdentifier: string | null,
    introducedDate: string,
    discontinuedDate?: string | null
  ): RegistrationCalculationResult {
    
    const introduced = new Date(introducedDate);
    const discontinued = discontinuedDate ? new Date(discontinuedDate) : new Date(); // Current date if still in production
    
    // Default fallback: 6 months after introduced date
    const defaultDate = new Date(introduced);
    defaultDate.setMonth(defaultDate.getMonth() + 6);
    
    // If no plate identifier, return default
    if (!plateIdentifier) {
      return {
        firstRegistrationDate: defaultDate.toISOString(),
        platePeriod: {
          start: defaultDate,
          end: defaultDate,
          identifier: 'default'
        },
        calculationMethod: 'default_fallback',
        notes: 'No plate identifier provided, using introduced date + 6 months'
      };
    }
    
    // Get plate period for the identifier
    const platePeriod = this.getPlatePeriod(plateIdentifier);
    
    if (!platePeriod) {
      return {
        firstRegistrationDate: defaultDate.toISOString(),
        platePeriod: {
          start: defaultDate,
          end: defaultDate,
          identifier: plateIdentifier
        },
        calculationMethod: 'default_fallback',
        notes: `Unknown plate identifier: ${plateIdentifier}, using default fallback`
      };
    }
    
    // Calculate overlap between plate period and vehicle production period
    const overlapStart = new Date(Math.max(platePeriod.start.getTime(), introduced.getTime()));
    const overlapEnd = new Date(Math.min(platePeriod.end.getTime(), discontinued.getTime()));
    
    // Check if there's a valid overlap
    if (overlapStart > overlapEnd) {
      return {
        firstRegistrationDate: defaultDate.toISOString(),
        platePeriod,
        calculationMethod: 'no_overlap_fallback',
        notes: `No overlap between plate period (${platePeriod.start.toDateString()} - ${platePeriod.end.toDateString()}) and production period (${introduced.toDateString()} - ${discontinued.toDateString()})`
      };
    }
    
    // Return the START date of the plate period (as per PHP implementation notes)
    // Use the plate period start date, not the overlap start, to match PHP behavior
    return {
      firstRegistrationDate: platePeriod.start.toISOString(),
      platePeriod,
      calculationMethod: 'plate_period',
      notes: `Using start of plate period: ${platePeriod.start.toDateString()}`
    };
  }
  
  /**
   * Get the plate period for a given plate identifier
   */
  private static getPlatePeriod(plateIdentifier: string): PlatePeriod | null {
    const identifier = plateIdentifier.toString().toUpperCase();
    
    // Handle numeric plates (2001 onwards)
    if (/^\d+$/.test(identifier)) {
      return this.getNumericPlatePeriod(parseInt(identifier));
    }
    
    // Handle letter plates (1983-2001)
    if (/^[A-Z]$/.test(identifier)) {
      return this.getLetterPlatePeriod(identifier);
    }
    
    return null;
  }
  
  /**
   * Get plate period for numeric plates (2001 onwards)
   */
  private static getNumericPlatePeriod(plateNumber: number): PlatePeriod | null {
    
    // Special case: 51 = September 1, 2001 to February 28, 2002
    if (plateNumber === 51) {
      return {
        start: new Date(Date.UTC(2001, 8, 1)), // September 1, 2001
        end: new Date(Date.UTC(2002, 1, 28)),  // February 28, 2002
        identifier: '51'
      };
    }
    
    // For years 2002 onwards
    let year: number;
    let isSecondHalf: boolean;
    
    if (plateNumber >= 2 && plateNumber <= 24) {
      // First half of year (March-August): 02, 03, ..., 24
      year = 2000 + plateNumber;
      isSecondHalf = false;
    } else if (plateNumber >= 52 && plateNumber <= 74) {
      // Second half of year (September-February): 52, 53, ..., 74
      year = 2000 + (plateNumber - 50);
      isSecondHalf = true;
    } else {
      return null; // Invalid plate number
    }
    
    if (isSecondHalf) {
      // September to February (next year)
      return {
        start: new Date(Date.UTC(year, 8, 1)),      // September 1 (month 8 = September)
        end: new Date(Date.UTC(year + 1, 1, 28)),   // February 28 (next year, month 1 = February)
        identifier: plateNumber.toString()
      };
    } else {
      // March to August
      return {
        start: new Date(Date.UTC(year, 2, 1)),      // March 1 (month 2 = March)
        end: new Date(Date.UTC(year, 7, 31)),       // August 31 (month 7 = August)
        identifier: plateNumber.toString()
      };
    }
  }
  
  /**
   * Get plate period for letter plates (1983-2001)
   */
  private static getLetterPlatePeriod(letter: string): PlatePeriod | null {
    
    const letterPeriods: Record<string, { year: number; month: number; isSecondHalf: boolean }> = {
      'Y': { year: 2001, month: 2, isSecondHalf: false }, // March 1, 2001 to August 31, 2001
      'X': { year: 2000, month: 8, isSecondHalf: true },  // September 1, 2000 to February 28, 2001
      'W': { year: 2000, month: 2, isSecondHalf: false }, // March 1, 2000 to August 31, 2000
      'V': { year: 1999, month: 8, isSecondHalf: true },  // September 1, 1999 to February 29, 2000
      'T': { year: 1999, month: 2, isSecondHalf: false }, // March 1, 1999 to August 31, 1999
      'S': { year: 1998, month: 8, isSecondHalf: true },  // September 1, 1998 to February 28, 1999
      'R': { year: 1998, month: 2, isSecondHalf: false }, // March 1, 1998 to August 31, 1998
      'P': { year: 1997, month: 8, isSecondHalf: true },  // September 1, 1997 to February 28, 1998
      'N': { year: 1996, month: 8, isSecondHalf: true },  // September 1, 1996 to February 28, 1997
      'M': { year: 1995, month: 8, isSecondHalf: true },  // September 1, 1995 to February 29, 1996
      'L': { year: 1994, month: 8, isSecondHalf: true },  // September 1, 1994 to February 28, 1995
      'K': { year: 1993, month: 8, isSecondHalf: true },  // September 1, 1993 to February 28, 1994
      'J': { year: 1992, month: 8, isSecondHalf: true },  // September 1, 1992 to February 28, 1993
      'H': { year: 1991, month: 8, isSecondHalf: true },  // September 1, 1991 to February 29, 1992
      'G': { year: 1990, month: 8, isSecondHalf: true },  // September 1, 1990 to February 28, 1991
      'F': { year: 1989, month: 8, isSecondHalf: true },  // September 1, 1989 to February 28, 1990
      'E': { year: 1988, month: 8, isSecondHalf: true },  // September 1, 1988 to February 28, 1989
      'D': { year: 1987, month: 8, isSecondHalf: true },  // September 1, 1987 to February 28, 1988
      'C': { year: 1986, month: 8, isSecondHalf: true },  // September 1, 1986 to February 28, 1987
      'B': { year: 1985, month: 8, isSecondHalf: true },  // September 1, 1985 to February 28, 1986
      'A': { year: 1984, month: 7, isSecondHalf: true },  // August 1, 1984 to July 31, 1985 (special case)
    };
    
    const period = letterPeriods[letter];
    if (!period) {
      return null;
    }
    
    if (letter === 'A') {
      // Special case for A: August 1, 1984 to July 31, 1985
      return {
        start: new Date(Date.UTC(1984, 7, 1)),   // August 1, 1984
        end: new Date(Date.UTC(1985, 6, 31)),    // July 31, 1985
        identifier: letter
      };
    }
    
    if (period.isSecondHalf) {
      // September to February (next year)
      const nextYear = period.year + 1;
      const isLeapYear = (nextYear % 4 === 0 && nextYear % 100 !== 0) || (nextYear % 400 === 0);
      const febDays = isLeapYear ? 29 : 28;
      
      return {
        start: new Date(Date.UTC(period.year, 8, 1)),        // September 1
        end: new Date(Date.UTC(nextYear, 1, febDays)),       // February 28/29 (next year)
        identifier: letter
      };
    } else {
      // March to August
      return {
        start: new Date(Date.UTC(period.year, 2, 1)),        // March 1
        end: new Date(Date.UTC(period.year, 7, 31)),         // August 31
        identifier: letter
      };
    }
  }
  
  /**
   * Generate plate identifier from year for reverse lookup
   */
  static generatePlateIdentifier(year: number, isSecondHalf: boolean = false): string | null {
    
    if (year >= 2002) {
      if (isSecondHalf) {
        return ((year % 100) + 50).toString(); // e.g., 2022 -> 22 + 50 = 72
      } else {
        return (year % 100).toString().padStart(2, '0'); // e.g., 2022 -> 22
      }
    } else if (year === 2001) {
      return isSecondHalf ? '51' : 'Y';
    } else if (year === 2000) {
      return isSecondHalf ? 'X' : 'W';
    }
    
    // For years before 2000, would need to implement letter mapping
    // This is complex as it depends on the specific month
    return null;
  }
  
  /**
   * Get all possible plate identifiers for a given year
   */
  static getPlateIdentifiersForYear(year: number): string[] {
    const identifiers: string[] = [];
    
    if (year >= 2002) {
      // Two plates per year: March-August and September-February
      identifiers.push((year % 100).toString().padStart(2, '0')); // First half
      identifiers.push(((year % 100) + 50).toString()); // Second half
    } else if (year === 2001) {
      identifiers.push('Y', '51');
    } else if (year === 2000) {
      identifiers.push('W', 'X');
    }
    
    return identifiers;
  }
}

export default RegistrationDateCalculator;
