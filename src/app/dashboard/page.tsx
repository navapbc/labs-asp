'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  benefits: string[]
  status: 'active' | 'pending' | 'completed'
}

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@email.com',
    phone: '(951) 555-0123',
    benefits: ['CalFresh', 'Medi-Cal', 'WIC'],
    status: 'active'
  },
  {
    id: '2',
    name: 'James Wilson',
    email: 'james.wilson@email.com',
    phone: '(951) 555-0456',
    benefits: ['CalFresh', 'Housing Assistance'],
    status: 'pending'
  },
  {
    id: '3',
    name: 'Ana Martinez',
    email: 'ana.martinez@email.com',
    phone: '(951) 555-0789',
    benefits: ['Medi-Cal', 'WIC'],
    status: 'completed'
  }
]

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>(mockClients)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    benefits: [] as string[]
  })
  const router = useRouter()

  const handleAddClient = () => {
    if (newClient.name && newClient.email) {
      const client: Client = {
        id: Date.now().toString(),
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        benefits: newClient.benefits,
        status: 'pending'
      }
      setClients([...clients, client])
      setNewClient({ name: '', email: '', phone: '', benefits: [] })
      setShowAddForm(false)
    }
  }

  const handleClientClick = (clientId: string) => {
    router.push(`/dashboard/client/${clientId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Riverside County Benefits Portal</h1>
              <p className="text-gray-600">Manage clients and benefits applications</p>
            </div>
            <Button onClick={() => router.push('/')} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Your Clients</h2>
          <Button onClick={() => setShowAddForm(true)}>
            Add New Client
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add New Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Full Name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
                <Input
                  placeholder="Phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddClient}>Add Client</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleClientClick(client.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <CardDescription>{client.email}</CardDescription>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                    {client.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{client.phone}</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Benefits:</p>
                  <div className="flex flex-wrap gap-2">
                    {client.benefits.map((benefit, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
