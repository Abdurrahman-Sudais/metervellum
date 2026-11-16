// MeterVellum — site facts used by the pages, the prerender step and the tests.
// A proposed product: pricing is illustrative and the LinkedIn page is not yet linked.
const site = {
  name: 'MeterVellum',
  slug: 'metervellum',
  tagline: 'Understand utility costs across every location.',
  about: 'MeterVellum helps multi-site businesses compare electricity and water use across locations. AI extracts bill data, normalises billing periods and flags unusual consumption or charges, while forecasting estimates upcoming utility spend — for facilities teams to review.',
  url: 'https://metervellum.space',
  email: 'aisha@metervellum.space',
  team: [
    {name: 'Aisha Suleiman', role: 'Founder', initials: 'AS', bio: 'Aisha founded MeterVellum after seeing facilities teams try to compare dozens of locations from bills that each ran on a different calendar, in a different format — and miss repeated charges and runaway usage until the year-end audit. Aisha leads product, customers and every pilot.', focus: ['Product', 'Customer pilots', 'Facilities reporting']},
  ],
  stats: [
    {value: '5.9M', label: 'Commercial buildings in the United States, using about 6.8 quadrillion Btu of energy a year.', source: 'US EIA, Commercial Buildings Energy Consumption Survey (2018)', url: 'https://www.eia.gov/energyexplained/use-of-energy/commercial-buildings.php'},
    {value: '60%', label: 'Share of energy use in US commercial buildings that comes from electricity.', source: 'US EIA, Use of energy explained (2018 data)', url: 'https://www.eia.gov/energyexplained/use-of-energy/commercial-buildings.php'},
    {value: '35%', label: 'How much less energy ENERGY STAR-certified buildings use than typical buildings — measuring and comparing pays off.', source: 'US EPA ENERGY STAR, Facts and stats', url: 'https://www.energystar.gov/buildings/about-us/facts-and-stats'},
  ],
  app: {
    title: 'Portfolio report',
    subtitle: 'Check six fictional locations’ bills, review flagged usage and charges, confirm tariffs and publish the October report.',
  },
};
export default site;
