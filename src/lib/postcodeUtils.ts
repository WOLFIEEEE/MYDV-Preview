// UK Postcode to City/County mapping utility
// This provides a basic mapping for common UK postcodes
// For production, consider using a proper API like Postcodes.io

interface PostcodeData {
  city: string;
  county: string;
}

// Common UK postcode prefixes and their corresponding cities/counties
const postcodeMapping: Record<string, PostcodeData> = {
  // London postcodes
  'E': { city: 'London', county: 'Greater London' },
  'EC': { city: 'London', county: 'Greater London' },
  'N': { city: 'London', county: 'Greater London' },
  'NW': { city: 'London', county: 'Greater London' },
  'SE': { city: 'London', county: 'Greater London' },
  'SW': { city: 'London', county: 'Greater London' },
  'W': { city: 'London', county: 'Greater London' },
  'WC': { city: 'London', county: 'Greater London' },
  
  // Birmingham
  'B': { city: 'Birmingham', county: 'West Midlands' },
  
  // Manchester
  'M': { city: 'Manchester', county: 'Greater Manchester' },
  
  // Liverpool
  'L': { city: 'Liverpool', county: 'Merseyside' },
  
  // Leeds
  'LS': { city: 'Leeds', county: 'West Yorkshire' },
  
  // Glasgow
  'G': { city: 'Glasgow', county: 'Lanarkshire' },
  
  // Edinburgh
  'EH': { city: 'Edinburgh', county: 'Midlothian' },
  
  // Cardiff
  'CF': { city: 'Cardiff', county: 'South Glamorgan' },
  
  // Belfast
  'BT': { city: 'Belfast', county: 'County Antrim' },
  
  // Newcastle
  'NE': { city: 'Newcastle', county: 'Tyne and Wear' },
  
  // Sheffield
  'S': { city: 'Sheffield', county: 'South Yorkshire' },
  
  // Bristol
  'BS': { city: 'Bristol', county: 'Bristol' },
  
  // Nottingham
  'NG': { city: 'Nottingham', county: 'Nottinghamshire' },
  
  // Leicester
  'LE': { city: 'Leicester', county: 'Leicestershire' },
  
  // Coventry
  'CV': { city: 'Coventry', county: 'West Midlands' },
  
  // Oxford
  'OX': { city: 'Oxford', county: 'Oxfordshire' },
  
  // Cambridge
  'CB': { city: 'Cambridge', county: 'Cambridgeshire' },
  
  // Brighton
  'BN': { city: 'Brighton', county: 'East Sussex' },
  
  // Southampton
  'SO': { city: 'Southampton', county: 'Hampshire' },
  
  // Portsmouth
  'PO': { city: 'Portsmouth', county: 'Hampshire' },
  
  // Reading
  'RG': { city: 'Reading', county: 'Berkshire' },
  
  // Milton Keynes
  'MK': { city: 'Milton Keynes', county: 'Buckinghamshire' },
  
  // Luton
  'LU': { city: 'Luton', county: 'Bedfordshire' },
  
  // Northampton
  'NN': { city: 'Northampton', county: 'Northamptonshire' },
  
  // Norwich
  'NR': { city: 'Norwich', county: 'Norfolk' },
  
  // Ipswich
  'IP': { city: 'Ipswich', county: 'Suffolk' },
  
  // Canterbury
  'CT': { city: 'Canterbury', county: 'Kent' },
  
  // Maidstone
  'ME': { city: 'Maidstone', county: 'Kent' },
  
  // Guildford
  'GU': { city: 'Guildford', county: 'Surrey' },
  
  // Kingston
  'KT': { city: 'Kingston upon Thames', county: 'Surrey' },
  
  // Croydon
  'CR': { city: 'Croydon', county: 'Greater London' },
  
  // Bromley
  'BR': { city: 'Bromley', county: 'Greater London' },
  
  // Dartford
  'DA': { city: 'Dartford', county: 'Kent' },
  
  // Enfield
  'EN': { city: 'Enfield', county: 'Greater London' },
  
  // Harrow
  'HA': { city: 'Harrow', county: 'Greater London' },
  
  // Ilford
  'IG': { city: 'Ilford', county: 'Greater London' },
  
  // Romford
  'RM': { city: 'Romford', county: 'Greater London' },
  
  // Slough
  'SL': { city: 'Slough', county: 'Berkshire' },
  
  // Twickenham
  'TW': { city: 'Twickenham', county: 'Greater London' },
  
  // Uxbridge
  'UB': { city: 'Uxbridge', county: 'Greater London' },
  
  // Watford
  'WD': { city: 'Watford', county: 'Hertfordshire' },
  
  // St Albans
  'AL': { city: 'St Albans', county: 'Hertfordshire' },
  
  // Stevenage
  'SG': { city: 'Stevenage', county: 'Hertfordshire' },
  
  // Chelmsford
  'CM': { city: 'Chelmsford', county: 'Essex' },
  
  // Colchester
  'CO': { city: 'Colchester', county: 'Essex' },
  
  // Southend
  'SS': { city: 'Southend-on-Sea', county: 'Essex' },
  
  // Bath
  'BA': { city: 'Bath', county: 'Somerset' },
  
  // Bournemouth
  'BH': { city: 'Bournemouth', county: 'Dorset' },
  
  // Plymouth
  'PL': { city: 'Plymouth', county: 'Devon' },
  
  // Exeter
  'EX': { city: 'Exeter', county: 'Devon' },
  
  // Torquay
  'TQ': { city: 'Torquay', county: 'Devon' },
  
  // Truro
  'TR': { city: 'Truro', county: 'Cornwall' },
  
  // Taunton
  'TA': { city: 'Taunton', county: 'Somerset' },
  
  // Gloucester
  'GL': { city: 'Gloucester', county: 'Gloucestershire' },
  
  // Cheltenham
  'GL5': { city: 'Cheltenham', county: 'Gloucestershire' },
  
  // Worcester
  'WR': { city: 'Worcester', county: 'Worcestershire' },
  
  // Hereford
  'HR': { city: 'Hereford', county: 'Herefordshire' },
  
  // Shrewsbury
  'SY': { city: 'Shrewsbury', county: 'Shropshire' },
  
  // Telford
  'TF': { city: 'Telford', county: 'Shropshire' },
  
  // Stoke-on-Trent
  'ST': { city: 'Stoke-on-Trent', county: 'Staffordshire' },
  
  // Derby
  'DE': { city: 'Derby', county: 'Derbyshire' },
  
  // Chesterfield
  'S4': { city: 'Chesterfield', county: 'Derbyshire' },
  
  // Lincoln
  'LN': { city: 'Lincoln', county: 'Lincolnshire' },
  
  // Peterborough
  'PE': { city: 'Peterborough', county: 'Cambridgeshire' },
  
  // York
  'YO': { city: 'York', county: 'North Yorkshire' },
  
  // Hull
  'HU': { city: 'Hull', county: 'East Yorkshire' },
  
  // Bradford
  'BD': { city: 'Bradford', county: 'West Yorkshire' },
  
  // Wakefield
  'WF': { city: 'Wakefield', county: 'West Yorkshire' },
  
  // Huddersfield
  'HD': { city: 'Huddersfield', county: 'West Yorkshire' },
  
  // Halifax
  'HX': { city: 'Halifax', county: 'West Yorkshire' },
  
  // Doncaster
  'DN': { city: 'Doncaster', county: 'South Yorkshire' },
  
  // Rotherham
  'S6': { city: 'Rotherham', county: 'South Yorkshire' },
  
  // Barnsley
  'S7': { city: 'Barnsley', county: 'South Yorkshire' },
  
  // Preston
  'PR': { city: 'Preston', county: 'Lancashire' },
  
  // Blackpool
  'FY': { city: 'Blackpool', county: 'Lancashire' },
  
  // Blackburn
  'BB': { city: 'Blackburn', county: 'Lancashire' },
  
  // Bolton
  'BL': { city: 'Bolton', county: 'Greater Manchester' },
  
  // Wigan
  'WN': { city: 'Wigan', county: 'Greater Manchester' },
  
  // Oldham
  'OL': { city: 'Oldham', county: 'Greater Manchester' },
  
  // Stockport
  'SK': { city: 'Stockport', county: 'Greater Manchester' },
  
  // Warrington
  'WA': { city: 'Warrington', county: 'Cheshire' },
  
  // Chester
  'CH': { city: 'Chester', county: 'Cheshire' },
  
  // Crewe
  'CW': { city: 'Crewe', county: 'Cheshire' },
  
  // Durham
  'DH': { city: 'Durham', county: 'County Durham' },
  
  // Sunderland
  'SR': { city: 'Sunderland', county: 'Tyne and Wear' },
  
  // Middlesbrough
  'TS': { city: 'Middlesbrough', county: 'North Yorkshire' },
  
  // Darlington
  'DL': { city: 'Darlington', county: 'County Durham' },
  
  // Carlisle
  'CA': { city: 'Carlisle', county: 'Cumbria' },
  
  // Lancaster
  'LA': { city: 'Lancaster', county: 'Lancashire' },
  
  // Aberdeen
  'AB': { city: 'Aberdeen', county: 'Aberdeenshire' },
  
  // Dundee
  'DD': { city: 'Dundee', county: 'Angus' },
  
  // Paisley
  'PA': { city: 'Paisley', county: 'Renfrewshire' },
  
  // Stirling
  'FK': { city: 'Stirling', county: 'Stirlingshire' },
  
  // Perth
  'PH': { city: 'Perth', county: 'Perthshire' },
  
  // Inverness
  'IV': { city: 'Inverness', county: 'Highland' },
  
  // Kilmarnock
  'KA': { city: 'Kilmarnock', county: 'Ayrshire' },
  
  // Dumfries
  'DG': { city: 'Dumfries', county: 'Dumfriesshire' },
  
  // Kirkcaldy
  'KY': { city: 'Kirkcaldy', county: 'Fife' },
  
  // Motherwell
  'ML': { city: 'Motherwell', county: 'Lanarkshire' },
  
  // Swansea
  'SA': { city: 'Swansea', county: 'West Glamorgan' },
  
  // Newport
  'NP': { city: 'Newport', county: 'Gwent' },
  
  // Wrexham
  'LL': { city: 'Wrexham', county: 'Clwyd' },
  
  // Bangor
  'LL5': { city: 'Bangor', county: 'Gwynedd' },
};

/**
 * Get city and county from UK postcode
 * @param postcode - UK postcode (e.g., "SW1A 1AA", "M1 5GD")
 * @returns Object with city and county, or empty strings if not found
 */
export function getCityAndCountyFromPostcode(postcode: string): PostcodeData {
  if (!postcode) {
    return { city: '', county: '' };
  }

  // Clean and normalize the postcode
  const cleanPostcode = postcode.toUpperCase().replace(/\s+/g, '').trim();
  
  if (cleanPostcode.length < 2) {
    return { city: '', county: '' };
  }

  // Try to match with increasingly specific prefixes
  // First try 3 characters (for specific areas like GL5 for Cheltenham)
  const threeChar = cleanPostcode.substring(0, 3);
  if (postcodeMapping[threeChar]) {
    return postcodeMapping[threeChar];
  }

  // Then try 2 characters (most common)
  const twoChar = cleanPostcode.substring(0, 2);
  if (postcodeMapping[twoChar]) {
    return postcodeMapping[twoChar];
  }

  // Finally try 1 character (for single-letter postcodes like B for Birmingham)
  const oneChar = cleanPostcode.substring(0, 1);
  if (postcodeMapping[oneChar]) {
    return postcodeMapping[oneChar];
  }

  // If no match found, return empty strings
  return { city: '', county: '' };
}

/**
 * Fetch city and county from Postcodes.io API (free UK postcode lookup)
 * This is more accurate but requires an internet connection
 * @param postcode - UK postcode
 * @returns Promise with city and county data
 */
export async function getCityAndCountyFromAPI(postcode: string): Promise<PostcodeData> {
  if (!postcode) {
    return { city: '', county: '' };
  }

  try {
    const cleanPostcode = postcode.replace(/\s+/g, '').trim();
    const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
    
    if (!response.ok) {
      // Fallback to local mapping if API fails
      return getCityAndCountyFromPostcode(postcode);
    }

    const data = await response.json();
    
    if (data.status === 200 && data.result) {
      const result = data.result;
      return {
        city: result.admin_ward || result.parish || result.admin_district || '',
        county: result.admin_county || result.admin_district || ''
      };
    }
  } catch (error) {
    console.error('Error fetching postcode data:', error);
  }

  // Fallback to local mapping if API fails
  return getCityAndCountyFromPostcode(postcode);
}
