'use client';

import { useState } from 'react';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import seedData from '@/scripts/sizes-colors-seed.json';

export default function SeedPage() {
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const seedSizes = async () => {
    const sizesCollection = collection(db, 'sizes');
    let count = 0;

    for (const size of seedData.sizes) {
      const sizeRef = doc(sizesCollection);
      await setDoc(sizeRef, size);
      count++;
    }

    return count;
  };

  const seedColors = async () => {
    const colorsCollection = collection(db, 'colors');
    let count = 0;

    for (const color of seedData.colors) {
      const colorRef = doc(colorsCollection);
      await setDoc(colorRef, color);
      count++;
    }

    return count;
  };

  const handleSeedDatabase = async () => {
    if (!user || user.role !== 'admin') {
      toast.error('Only admins can seed the database');
      return;
    }

    if (!confirm('This will add default sizes and colors to the database. Continue?')) {
      return;
    }

    setSeeding(true);
    setResults([]);
    const logs: string[] = [];

    try {
      logs.push('Starting database seeding...');
      setResults([...logs]);

      const sizesSnapshot = await getDocs(collection(db, 'sizes'));
      if (sizesSnapshot.empty) {
        logs.push('Seeding shoe sizes...');
        setResults([...logs]);
        const sizesCount = await seedSizes();
        logs.push('✓ Created ' + sizesCount + ' sizes');
        setResults([...logs]);
      } else {
        logs.push('⚠ Sizes already exist, skipping...');
        setResults([...logs]);
      }

      const colorsSnapshot = await getDocs(collection(db, 'colors'));
      if (colorsSnapshot.empty) {
        logs.push('Seeding shoe colors...');
        setResults([...logs]);
        const colorsCount = await seedColors();
        logs.push('✓ Created ' + colorsCount + ' colors');
        setResults([...logs]);
      } else {
        logs.push('⚠ Colors already exist, skipping...');
        setResults([...logs]);
      }

      logs.push('');
      logs.push('✓ Database seeding completed successfully!');
      setResults([...logs]);
      toast.success('Database seeded successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
      logs.push('✗ Error: ' + (error as Error).message);
      setResults([...logs]);
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Database Seeding</h1>
            <p className="text-gray-600">
              Initialize your database with default shoe sizes and colors
            </p>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">What will be seeded?</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 10 default shoe sizes (36-45)</li>
                    <li>• 20 professional shoe colors (Black, Brown, Tan, etc.)</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Note:</strong> If sizes or colors already exist, they will be skipped.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSeedDatabase}
                disabled={seeding}
                className="w-full"
                size="lg"
              >
                {seeding ? 'Seeding Database...' : 'Seed Database'}
              </Button>

              {results.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Seeding Results
                  </h3>
                  <div className="space-y-1 font-mono text-sm">
                    {results.map((result, index) => (
                      <div key={index} className={
                        result.startsWith('✓') ? 'text-green-600' :
                        result.startsWith('⚠') ? 'text-yellow-600' :
                        result.startsWith('✗') ? 'text-red-600' :
                        'text-gray-700'
                      }>
                        {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Next Steps</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Go to <strong>Sizes Management</strong> to view and manage shoe sizes</li>
              <li>Go to <strong>Colors Management</strong> to view and manage shoe colors</li>
              <li>When creating products, you can now select from available sizes and colors</li>
              <li>Customers will be able to choose size and color when ordering</li>
            </ol>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
