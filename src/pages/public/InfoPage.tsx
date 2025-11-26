import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';

export function InfoPage() {
  const usefulLinks = [
    {
      title: 'Burning Man Official',
      url: 'https://burningman.org',
      description: 'Official Burning Man website with event info, tickets, and guidelines',
    },
    {
      title: 'iBurn App',
      url: 'https://iburn.app',
      description: 'The essential app for navigating Black Rock City',
    },
    {
      title: 'Playa Bike Repair',
      url: 'https://playabikerepair.com',
      description: 'Rent bikes for the playa',
    },
    {
      title: 'Survival Guide',
      url: 'https://survival.burningman.org',
      description: 'Everything you need to know to survive and thrive on the playa',
    },
  ];

  const packingCategories = [
    {
      category: 'Essentials',
      items: [
        'Ticket & Vehicle Pass',
        'ID / Passport',
        'Cash (for ice sales)',
        'Water (1.5 gallons per day)',
        'Food for the week',
        'Sunscreen (SPF 50+)',
        'Goggles & Dust Mask',
      ],
    },
    {
      category: 'Shelter',
      items: [
        'Tent or shade structure',
        'Sleeping bag / bedding',
        'Pillow',
        'Rebar stakes',
        'Tapestries / shade cloth',
        'Lights for your tent',
      ],
    },
    {
      category: 'Clothing',
      items: [
        'Costumes & fun outfits',
        'Warm layers for night',
        'Sturdy closed-toe shoes',
        'Comfortable boots',
        'Socks (lots of them)',
        'Underwear',
        'Hats / head coverings',
      ],
    },
    {
      category: 'Hygiene',
      items: [
        'Biodegradable soap',
        'Wet wipes (lots)',
        'Hand sanitizer',
        'Toothbrush & toothpaste',
        'Medications',
        'First aid kit',
        'Lip balm with SPF',
      ],
    },
    {
      category: 'Gear',
      items: [
        'Bike with lights',
        'Bike lock',
        'Headlamp / flashlight',
        'Portable charger',
        'Reusable water bottle',
        'Cup / mug (for gifted drinks)',
        'Trash bags (MOOP bags)',
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Useful Information</h1>
        <p className="text-xl text-gray-400">
          Resources and links to help you prepare for the burn
        </p>
      </div>

      {/* Useful Links */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Useful Links</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {usefulLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card hover>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-medium mb-1">{link.title}</h3>
                      <p className="text-gray-400 text-sm">{link.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </section>

      {/* Packing List */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">Packing List</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packingCategories.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle>{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-400">
                      <svg className="w-4 h-4 text-neon-cyan flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
