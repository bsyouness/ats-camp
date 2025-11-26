import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';

export function ResourcesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Camp Resources</h1>
        <p className="text-gray-400">Important links and resources for camp members</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Camp Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              Camp dues help cover shared expenses like infrastructure, food, and supplies.
              Please make sure your dues are paid before the burn.
            </p>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neon-orange text-white rounded-lg hover:bg-neon-orange/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pay Camp Dues
            </a>
            <p className="text-sm text-gray-500 mt-2">
              Link will be updated when payment is set up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Camp Notion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              Our shared Notion workspace contains planning documents, shopping lists,
              build schedules, and more.
            </p>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-playa-card border border-playa-border text-gray-200 rounded-lg hover:border-neon-purple hover:text-neon-purple transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Open Notion
            </a>
            <p className="text-sm text-gray-500 mt-2">
              Link will be updated when Notion is set up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Useful Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="https://burningman.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-playa-surface rounded-lg hover:bg-playa-card transition-colors group"
              >
                <span className="text-gray-300 group-hover:text-white">Burning Man Official</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a
                href="https://survival.burningman.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-playa-surface rounded-lg hover:bg-playa-card transition-colors group"
              >
                <span className="text-gray-300 group-hover:text-white">Survival Guide</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <a
                href="https://iburn.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-playa-surface rounded-lg hover:bg-playa-card transition-colors group"
              >
                <span className="text-gray-300 group-hover:text-white">iBurn App</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
