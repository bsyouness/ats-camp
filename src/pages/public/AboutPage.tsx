import { Card, CardContent } from '../../components/ui';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">About ATS Camp</h1>
        <p className="text-xl text-gray-400">
          Our story, values, and what makes our camp special
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Story</h2>
            <p className="text-gray-400 leading-relaxed">
              ATS Camp was founded by a group of friends who wanted to create a welcoming
              space at Burning Man. Over the years, we've grown into a vibrant community
              of artists, builders, and dreamers who come together each year to create
              magic in the dust.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold text-white mb-4">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-neon-orange font-medium mb-2">Radical Inclusion</h3>
                <p className="text-gray-400 text-sm">
                  Everyone is welcome at ATS Camp. We celebrate diversity and create
                  space for all.
                </p>
              </div>
              <div>
                <h3 className="text-neon-purple font-medium mb-2">Communal Effort</h3>
                <p className="text-gray-400 text-sm">
                  We work together to build our camp and create experiences for
                  the community.
                </p>
              </div>
              <div>
                <h3 className="text-neon-cyan font-medium mb-2">Leave No Trace</h3>
                <p className="text-gray-400 text-sm">
                  We are committed to environmental responsibility and leave the
                  playa as we found it.
                </p>
              </div>
              <div>
                <h3 className="text-neon-orange font-medium mb-2">Participation</h3>
                <p className="text-gray-400 text-sm">
                  Everyone contributes to camp life through shifts, projects, and
                  creative expression.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold text-white mb-4">Join Us</h2>
            <p className="text-gray-400 leading-relaxed">
              Interested in joining ATS Camp? We welcome new members who share our
              values and want to contribute to our community. Reach out through our
              contact page or join our WhatsApp group to learn more about how to
              become part of our family.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
