import Layout from '../components/Layout'
import SymptomLogForm from '../components/SymptomLogForm'

export default function LogSymptom() {
  return (
    <Layout>
      <div className="max-w-xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Log a symptom</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <SymptomLogForm />
      </div>
    </Layout>
  )
}
