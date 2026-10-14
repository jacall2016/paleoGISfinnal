
export interface SampleSite {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  description: string;
}

export const sampleSites: SampleSite[] = [
  {
    id: 'demo-1',
    name: 'Example locality A',
    longitude: -111.789,
    latitude: 43.823,
    description: 'Illustrative location near eastern Idaho.',
  },
  {
    id: 'demo-2',
    name: 'Example locality B',
    longitude: -105.937,
    latitude: 35.687,
    description: 'Illustrative location in New Mexico.',
  },
  {
    id: 'demo-3',
    name: 'Example locality C',
    longitude: -104.99,
    latitude: 39.739,
    description: 'Illustrative location in Colorado.',
  },
];
