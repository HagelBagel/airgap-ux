// Simple test to verify prepareExportData functionality
// This can be run in browser console or as a temporary test

import { useResearchStore } from './src/stores/useResearchStore.js';

// Test data setup
const store = useResearchStore();

// Mock project data for testing
const mockProject = {
  id: 'test-project',
  name: 'Test Project',
  createdAt: Date.now(),
  jobCards: [
    {
      id: 'card-1',
      description: 'Auto-generated outcome',
      averageImportance: 8,
      averageSatisfaction: 3,
      opportunityScore: 13,
      hasTension: false,
      evidence: [
        {
          speakerId: 'SPK01',
          text: 'I really need to track my expenses better',
          startTime: 10,
          endTime: 15
        }
      ],
      speakerOutcomes: [
        {
          speakerId: 'SPK01',
          description: 'Track expenses effectively',
          importance: 8,
          satisfaction: 3,
          opportunityScore: 13,
          evidence: [
            {
              speakerId: 'SPK01',
              text: 'I really need to track my expenses better',
              startTime: 10,
              endTime: 15
            }
          ]
        }
      ],
      hasBeenManuallyEdited: false
    },
    {
      id: 'card-2',
      description: 'Manual Entry',
      averageImportance: 5,
      averageSatisfaction: 5,
      opportunityScore: 5,
      hasTension: false,
      evidence: [
        {
          speakerId: 'SPK02',
          text: 'This is a manually created quote',
          startTime: 0,
          endTime: 0
        }
      ],
      speakerOutcomes: [
        {
          speakerId: 'SPK02',
          description: 'Manual Entry',
          importance: 5,
          satisfaction: 5,
          opportunityScore: 5,
          evidence: [
            {
              speakerId: 'SPK02',
              text: 'This is a manually created quote',
              startTime: 0,
              endTime: 0
            }
          ]
        }
      ],
      hasBeenManuallyEdited: true
    }
  ]
};

// Set up mock data in store
store.currentProject = mockProject;

// Test the prepareExportData function
const exportData = store.prepareExportData();

console.log('Export Data Test Results:');
console.log('Number of rows:', exportData.length);
console.log('Export Data:', exportData);

// Expected structure verification
const expectedFields = ['Outcome', 'Speaker', 'Importance', 'Satisfaction', 'Quote'];
const firstRow = exportData[0];

console.log('\nSchema Verification:');
expectedFields.forEach(field => {
  console.log(`${field}: ${firstRow[field] !== undefined ? '✓' : '✗'}`);
});

// Check manual entry handling
const manualEntry = exportData.find(row => row.Outcome === 'Manual Entry');
console.log('\nManual Entry Handling:', manualEntry ? '✓' : '✗');

// Check quote concatenation (if multiple evidence items exist)
console.log('\nQuote Concatenation Test:');
console.log('Sample Quote:', firstRow.Quote);

console.log('\nTest completed successfully!');
