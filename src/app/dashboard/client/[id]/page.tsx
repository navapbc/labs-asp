'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useParams, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  benefits: string[]
  status: 'active' | 'pending' | 'completed'
}

const mockClients: Record<string, Client> = {
  '1': {
    id: '1',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@email.com',
    phone: '(951) 555-0123',
    benefits: ['CalFresh', 'Medi-Cal', 'WIC'],
    status: 'active'
  },
  '2': {
    id: '2',
    name: 'James Wilson',
    email: 'james.wilson@email.com',
    phone: '(951) 555-0456',
    benefits: ['CalFresh', 'Housing Assistance'],
    status: 'pending'
  },
  '3': {
    id: '3',
    name: 'Ana Martinez',
    email: 'ana.martinez@email.com',
    phone: '(951) 555-0789',
    benefits: ['Medi-Cal', 'WIC'],
    status: 'completed'
  }
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const client = mockClients[clientId]
  const [showChat, setShowChat] = useState(false)

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-gray-600">Client not found</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showChat) {
    router.push(`/dashboard/client/${clientId}/chat`)
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                ← Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                <p className="text-gray-600">Client Details & Benefits</p>
              </div>
            </div>
            <Button onClick={() => router.push('/')} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{client.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{client.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{client.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' :
                    client.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benefits and Actions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Benefits & Applications</CardTitle>
                <CardDescription>
                  Manage benefits and start new applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Benefits */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Current Benefits</h3>
                    <div className="flex flex-wrap gap-2">
                      {client.benefits.map((benefit, index) => (
                        <span
                          key={index}
                          className="px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => setShowChat(true)}
                        className="h-20 text-lg"
                      >
                        💬 Chat with AI Bot
                        <br />
                        <span className="text-sm font-normal">Fill out applications</span>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="h-20 text-lg"
                      >
                        📋 View Applications
                        <br />
                        <span className="text-sm font-normal">Check status</span>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="h-20 text-lg"
                      >
                        📝 New Application
                        <br />
                        <span className="text-sm font-normal">Start manually</span>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="h-20 text-lg"
                      >
                        📊 Benefits Report
                        <br />
                        <span className="text-sm font-normal">Generate summary</span>
                      </Button>
                    </div>
                  </div>

                  {/* Riverside County Programs */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Available Programs in Riverside County</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-gray-900">CalFresh (SNAP)</h4>
                        <p className="text-sm text-gray-600">Food assistance program</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-gray-900">Medi-Cal</h4>
                        <p className="text-sm text-gray-600">Health coverage for low-income individuals</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-gray-900">WIC</h4>
                        <p className="text-sm text-gray-600">Women, Infants, and Children nutrition program</p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-gray-900">Housing Assistance</h4>
                        <p className="text-sm text-gray-600">Rental and housing support programs</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
