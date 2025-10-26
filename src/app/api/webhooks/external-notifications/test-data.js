export const testWebhookData = {
  generalEnquiry: {
    affiliateId: 'your-dealer-id-here', // Replace with actual dealer ID
    enquiryType: 'general-contact',
    personal: {
      title: 'Mr',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+44 1234 567890',
      address: '123 Test Street, London, UK'
    },
    notes: 'Test enquiry from webhook'
  },

  // Test data for part exchange
  partExchange: {
    affiliateId: 'your-dealer-id-here', // Replace with actual dealer ID
    enquiryType: 'part-exchange',
    personal: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '+44 9876 543210'
    },
    vehicle: {
      make: 'BMW',
      model: 'X5',
      registration: 'AB12 CDE',
      mileage: '30000',
      year: '2020',
      price: 35000
    },
    userVehicle: {
      make: 'Ford',
      model: 'Focus',
      registration: 'XY98 ZAB',
      mileage: '60000',
      year: '2018'
    },
    notes: 'Looking to part exchange my Ford Focus for a BMW X5'
  },

  // Test data for finance request
  financeRequest: {
    affiliateId: 'your-dealer-id-here', // Replace with actual dealer ID
    enquiryType: 'request-finance',
    personal: {
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike.johnson@example.com',
      phoneNumber: '+44 5555 123456',
      dateOfBirth: '1985-05-15',
      address: '456 Finance Street, Manchester, UK'
    },
    vehicle: {
      make: 'Audi',
      model: 'A4',
      price: 28000,
      initialDeposit: 5000,
      loanTerm: 48,
      apr: 4.9,
      monthlyPayment: 520
    },
    employment: {
      status: 'Employed Full-Time',
      annualIncome: 45000,
      employerName: 'Test Company Ltd',
      timeInEmployment: '3 years',
      grossAnnualIncome: 45000
    },
    finance: {
      monthlyExpenses: 1200,
      existenceCreditCommitments: 300
    },
    bank: {
      accountHolderName: 'Mike Johnson',
      bankName: 'Test Bank',
      sortCode: '12-34-56',
      accountNumber: '12345678',
      timeWithBank: '5 years'
    }
  },

  vehicleReservation: {
    affiliateId: 'your-dealer-id-here', // Replace with actual dealer ID
    customerDetails: {
      title: 'Mrs',
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@example.com',
      phone: '+44 7777 888999',
      address: '789 Reservation Ave, Birmingham, UK'
    },
    vehicleDetails: {
      make: 'Mercedes',
      model: 'C-Class',
      registration: 'MB21 CLS',
      stockId: 'STOCK123'
    },
    amount: 50000 // Amount in pence (£500.00)
  },

  findYourNextCar: {
    affiliateId: 'your-dealer-id-here', // Replace with actual dealer ID
    enquiryType: 'find-your-next-car',
    personal: {
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@example.com',
      phoneNumber: '+44 6666 777888'
    },
    findYourNextCar: {
      enquiryType: 'help-finding-car',
      vehiclePreferences: 'Looking for a family SUV, preferably hybrid, budget around £30-40k'
    },
    testDrive: {
      isTestDrive: true,
      testDriveDate: '2025-11-01',
      testDriveTime: '14:00',
      additionalRequirements: 'Please have the vehicle ready for a 30-minute test drive'
    }
  }
}

export const curlExamples = {
  general: `
curl -X POST http://localhost:3000/api/webhooks/external-notifications \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://example-dealer-website.com" \\
  -d '${JSON.stringify(testWebhookData.generalEnquiry, null, 2)}'
  `,
  
  partExchange: `
curl -X POST http://localhost:3000/api/webhooks/external-notifications \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://example-dealer-website.com" \\
  -d '${JSON.stringify(testWebhookData.partExchange, null, 2)}'
  `,
  
  vehicleReservation: `
curl -X POST http://localhost:3000/api/webhooks/external-notifications \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://example-dealer-website.com" \\
  -d '${JSON.stringify(testWebhookData.vehicleReservation, null, 2)}'
  `
}
