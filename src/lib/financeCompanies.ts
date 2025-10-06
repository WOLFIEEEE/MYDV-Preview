export interface FinanceCompany {
  id: string;
  name: string;
  fullName: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    phone?: string;
    email?: string;
  };
  invoiceToText: string;
}

export const PREDEFINED_FINANCE_COMPANIES: FinanceCompany[] = [
  {
    id: 'jigsaw-finance',
    name: 'Jigsaw Finance',
    fullName: 'Jigsaw Finance',
    address: {
      line1: 'Genesis Centre, Innovation Way',
      city: 'Stoke on Trent',
      postcode: 'ST6 4BF',
      phone: '01782432262',
      email: 'payouts@jigsawfinance.com'
    },
    invoiceToText: 'Jigsaw Finance\nGenesis Centre, Innovation Way\nStoke on Trent. ST6 4BF\n01782432262\npayouts@jigsawfinance.com'
  },
  {
    id: 'car-loans-365',
    name: 'Car Loans 365',
    fullName: 'HT Finance Limited (T/A Car Loans 365)',
    address: {
      line1: 'Statham House, Talbot Road',
      city: 'Old Trafford',
      postcode: 'M32 0FP'
    },
    invoiceToText: 'Car Loans 365\nHT Finance Limited (T/A Car Loans 365)\nStatham House, Talbot Road\nOld Trafford\nM32 0FP'
  },
  {
    id: 'close-brothers-finance',
    name: 'Close Brothers Finance',
    fullName: 'Close Brothers Finance',
    address: {
      line1: '10 Crown Place',
      city: 'London',
      postcode: 'EC2A 4FT'
    },
    invoiceToText: 'Close Brothers Finance\n10 Crown Place\nLondon\nEC2A 4FT'
  },
  {
    id: 'zuto-finance',
    name: 'ZUTO Finance',
    fullName: 'ZUTO Finance',
    address: {
      line1: 'Winterton House, Winterton Way',
      city: 'Macclesfield',
      county: 'Cheshire',
      postcode: 'SK11 0LP',
      phone: '01625 61 99 44'
    },
    invoiceToText: 'ZUTO Finance\nWinterton House, Winterton Way\nMacclesfield, Cheshire. SK11 0LP\n01625 61 99 44'
  },
  {
    id: 'car-finance-247',
    name: 'Car Finance 24/7',
    fullName: 'Car Finance 24/7',
    address: {
      line1: 'Universal Square',
      line2: 'Block 5 Devonshire Street',
      city: 'Manchester',
      postcode: 'M12 6JH'
    },
    invoiceToText: 'Car Finance 24/7\nUniversal Square,\nBlock 5 Devonshire Street\nManchester. M12 6JH'
  },
  {
    id: 'oodle-car-finance',
    name: 'Oodle Car Finance',
    fullName: 'Oodle Car Finance',
    address: {
      line1: 'Floor 19, City Tower',
      line2: 'New York Street',
      city: 'Manchester',
      postcode: 'M1 4BT'
    },
    invoiceToText: 'Oodle Car Finance\nFloor 19, City Tower\nNew York Street, Manchester\nM1 4BT'
  },
  {
    id: 'blue-motor-finance',
    name: 'Blue Motor Finance',
    fullName: 'Blue Motor Finance',
    address: {
      line1: 'Darenth House, 84 Main Rd',
      city: 'Sundridge, Sevenoaks',
      postcode: 'TN14 6ER'
    },
    invoiceToText: 'Blue Motor Finance\nDarenth House, 84 Main Rd\nSundridge, Sevenoaks\nTN14 6ER'
  },
  {
    id: 'car-loans-uk',
    name: 'Car Loans UK',
    fullName: 'BMG FG (UK) LTD',
    address: {
      line1: 'Wellington Road North',
      city: 'Stockport',
      county: 'Cheshire',
      postcode: 'SK4 1LW'
    },
    invoiceToText: 'Car Loans UK\nBMG FG (UK) LTD\nWellington Road North, Stockport, Cheshire, SK4 1LW'
  },
  {
    id: 'carmoney',
    name: 'CarMoney',
    fullName: 'CarMoney',
    address: {
      line1: 'Pioneer House, 2 Renshaw Pl',
      city: 'Eurocentral, Motherwell',
      postcode: 'ML1 4UF'
    },
    invoiceToText: 'CarMoney\nPioneer House, 2 Renshaw Pl\nEurocentral, Motherwell\nML1 4UF'
  },
  {
    id: 'creditplus',
    name: 'CreditPlus',
    fullName: 'CreditPlus',
    address: {
      line1: 'Bourne House, 23 Hinton Road',
      city: 'Bournemouth',
      postcode: 'BH1 2EF'
    },
    invoiceToText: 'CreditPlus\nBourne House, 23 Hinton Road\nBournemouth\nBH1 2EF'
  },
  {
    id: 'choosemycar',
    name: 'ChooseMyCar',
    fullName: 'ChooseMyCar',
    address: {
      line1: 'Alexandra Court, Carrs Road',
      city: 'Cheadle',
      postcode: 'SK8 2JY'
    },
    invoiceToText: 'ChooseMyCar\nAlexandra Court, Carrs Road\nCheadle\nSK8 2JY'
  }
];

export const CUSTOM_FINANCE_COMPANY_ID = 'custom';

export function getFinanceCompanyById(id: string): FinanceCompany | null {
  return PREDEFINED_FINANCE_COMPANIES.find(company => company.id === id) || null;
}

export function formatFinanceCompanyInvoiceText(vehicleRegistration: string, company: FinanceCompany): string {
  return `INVOICE TO:\n${vehicleRegistration} - ${company.invoiceToText}`;
}

export function formatCustomFinanceCompanyInvoiceText(vehicleRegistration: string, companyName: string, address: string): string {
  return `INVOICE TO:\n${vehicleRegistration} - ${companyName}\n${address}`;
}
