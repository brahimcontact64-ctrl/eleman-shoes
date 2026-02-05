'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface SiteSettings {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  whatsappNumber: string;
  logoUrl: string;
  colors: {
    leatherBrown: string;
    leatherLight: string;
    leatherBeige: string;
    leatherDark: string;
    leatherGray: string;
    leatherCoffee: string;
  };
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  footerText: string;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    tiktok: string;
    linkedin: string;
  };
  googleSheets: {
    enabled: boolean;
    spreadsheetId: string;
    sheetName: string;
  };
}

const defaultSettings: SiteSettings = {
  heroImage: '/whatsapp_image_2026-02-03_at_11.14.37.jpeg',
  heroTitle: 'Chaussures en cuir d&apos;exception',
  heroSubtitle: 'Élégance, confort et qualité pour toute la famille',
  heroCtaText: 'Commander via WhatsApp',
  whatsappNumber: '',
  logoUrl: '/okp.jpeg',
  colors: {
    leatherBrown: '#8B5A2B',
    leatherLight: '#C69C6D',
    leatherBeige: '#F5EFE8',
    leatherDark: '#3A2A1A',
    leatherGray: '#6B5E54',
    leatherCoffee: '#5A3A1E',
  },
  companyName: 'Eleman Shoes',
  companyEmail: 'contact@elemanshoes.com',
  companyPhone: '+213 XXX XXX XXX',
  companyAddress: 'Algérie',
  footerText: 'Qualité premium, style intemporel',
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    tiktok: '',
    linkedin: '',
  },
  googleSheets: {
    enabled: false,
    spreadsheetId: '',
    sheetName: 'Orders',
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'site_settings', 'main'));
      if (settingsDoc.exists()) {
        setSettings({ ...defaultSettings, ...settingsDoc.data() } as SiteSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les paramètres',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'site_settings', 'main'), settings);
      toast({
        title: 'Succès',
        description: 'Les paramètres ont été enregistrés',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <AdminLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-leather-brown"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-leather-dark">Paramètres du Site</h1>
            <p className="text-leather-gray mt-2">Gérez tous les paramètres de votre site web</p>
          </div>

          <Tabs defaultValue="hero" className="space-y-4">
            <TabsList className="bg-white">
              <TabsTrigger value="hero">Hero Section</TabsTrigger>
              <TabsTrigger value="colors">Couleurs</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="company">Entreprise</TabsTrigger>
              <TabsTrigger value="social">Réseaux Sociaux</TabsTrigger>
              <TabsTrigger value="googlesheets">Google Sheets</TabsTrigger>
            </TabsList>

            <TabsContent value="hero">
              <Card>
                <CardHeader>
                  <CardTitle>Section Hero</CardTitle>
                  <CardDescription>Modifiez le contenu de la bannière principale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="heroImage">Image Hero (URL)</Label>
                    <Input
                      id="heroImage"
                      value={settings.heroImage}
                      onChange={(e) => setSettings({ ...settings, heroImage: e.target.value })}
                      placeholder="/path/to/image.jpg"
                    />
                    {settings.heroImage && (
                      <div className="mt-2">
                        <img
                          src={settings.heroImage}
                          alt="Hero preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="heroTitle">Titre Principal</Label>
                    <Input
                      id="heroTitle"
                      value={settings.heroTitle}
                      onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="heroSubtitle">Sous-titre</Label>
                    <Input
                      id="heroSubtitle"
                      value={settings.heroSubtitle}
                      onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="heroCtaText">Texte du bouton CTA</Label>
                    <Input
                      id="heroCtaText"
                      value={settings.heroCtaText}
                      onChange={(e) => setSettings({ ...settings, heroCtaText: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="colors">
              <Card>
                <CardHeader>
                  <CardTitle>Thème de Couleurs</CardTitle>
                  <CardDescription>Personnalisez les couleurs de votre site</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="leatherBrown">Leather Brown (Primary)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="leatherBrown"
                          type="color"
                          value={settings.colors.leatherBrown}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherBrown: e.target.value },
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.colors.leatherBrown}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherBrown: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="leatherLight">Leather Light (Camel/Tan)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="leatherLight"
                          type="color"
                          value={settings.colors.leatherLight}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherLight: e.target.value },
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.colors.leatherLight}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherLight: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="leatherBeige">Leather Beige (Background)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="leatherBeige"
                          type="color"
                          value={settings.colors.leatherBeige}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherBeige: e.target.value },
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.colors.leatherBeige}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherBeige: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="leatherDark">Leather Dark (Text Primary)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="leatherDark"
                          type="color"
                          value={settings.colors.leatherDark}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherDark: e.target.value },
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.colors.leatherDark}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherDark: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="leatherGray">Leather Gray (Text Secondary)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="leatherGray"
                          type="color"
                          value={settings.colors.leatherGray}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherGray: e.target.value },
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.colors.leatherGray}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherGray: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="leatherCoffee">Leather Coffee (Accent)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="leatherCoffee"
                          type="color"
                          value={settings.colors.leatherCoffee}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherCoffee: e.target.value },
                            })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.colors.leatherCoffee}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              colors: { ...settings.colors, leatherCoffee: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 border border-leather-light/30 rounded-lg bg-white">
                    <h4 className="font-semibold mb-2 text-leather-dark">Aperçu des couleurs</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(settings.colors).map(([key, color]) => (
                        <div key={key} className="flex items-center gap-2">
                          <div
                            className="w-12 h-12 rounded border border-gray-300"
                            style={{ backgroundColor: color }}
                          ></div>
                          <span className="text-sm text-leather-gray capitalize">
                            {key.replace('leather', '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Informations de Contact</CardTitle>
                  <CardDescription>Numéros et adresses de contact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="whatsappNumber">Numéro WhatsApp</Label>
                    <Input
                      id="whatsappNumber"
                      value={settings.whatsappNumber}
                      onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                      placeholder="+213XXXXXXXXX"
                    />
                    <p className="text-sm text-leather-gray mt-1">
                      Format: +213XXXXXXXXX (sans espaces)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="companyPhone">Téléphone</Label>
                    <Input
                      id="companyPhone"
                      value={settings.companyPhone}
                      onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyAddress">Adresse</Label>
                    <Textarea
                      id="companyAddress"
                      value={settings.companyAddress}
                      onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Informations Entreprise</CardTitle>
                  <CardDescription>Nom et description de votre entreprise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="logoUrl">Logo de l&apos;entreprise (URL)</Label>
                    <Input
                      id="logoUrl"
                      value={settings.logoUrl}
                      onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                      placeholder="/path/to/logo.png"
                    />
                    {settings.logoUrl && (
                      <div className="mt-2 p-4 bg-white border border-leather-light/30 rounded-lg">
                        <p className="text-sm text-leather-gray mb-2">Aperçu du logo:</p>
                        <img
                          src={settings.logoUrl}
                          alt="Logo preview"
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="footerText">Texte du footer</Label>
                    <Textarea
                      id="footerText"
                      value={settings.footerText}
                      onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social">
              <Card>
                <CardHeader>
                  <CardTitle>Réseaux Sociaux</CardTitle>
                  <CardDescription>Ajoutez les liens vers vos réseaux sociaux</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      value={settings.socialMedia.facebook}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialMedia: { ...settings.socialMedia, facebook: e.target.value },
                        })
                      }
                      placeholder="https://facebook.com/votrepage"
                    />
                  </div>

                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      value={settings.socialMedia.instagram}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialMedia: { ...settings.socialMedia, instagram: e.target.value },
                        })
                      }
                      placeholder="https://instagram.com/votrecompte"
                    />
                  </div>

                  <div>
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <Input
                      id="twitter"
                      value={settings.socialMedia.twitter}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialMedia: { ...settings.socialMedia, twitter: e.target.value },
                        })
                      }
                      placeholder="https://twitter.com/votrecompte"
                    />
                  </div>

                  <div>
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      value={settings.socialMedia.youtube}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialMedia: { ...settings.socialMedia, youtube: e.target.value },
                        })
                      }
                      placeholder="https://youtube.com/@votrechaine"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input
                      id="tiktok"
                      value={settings.socialMedia.tiktok}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialMedia: { ...settings.socialMedia, tiktok: e.target.value },
                        })
                      }
                      placeholder="https://tiktok.com/@votrecompte"
                    />
                  </div>

                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={settings.socialMedia.linkedin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialMedia: { ...settings.socialMedia, linkedin: e.target.value },
                        })
                      }
                      placeholder="https://linkedin.com/company/votreentreprise"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="googlesheets">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Google Sheets</CardTitle>
                  <CardDescription>
                    Synchronisez automatiquement les commandes avec Google Sheets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Configuration requise</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Créez un compte de service Google dans Google Cloud Console</li>
                      <li>Activez l&apos;API Google Sheets pour votre projet</li>
                      <li>Téléchargez les credentials JSON</li>
                      <li>Ajoutez les variables d&apos;environnement (GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_PRIVATE_KEY)</li>
                      <li>Partagez votre Google Sheet avec l&apos;email du compte de service</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-leather-light/30 rounded-lg bg-leather-beige/30">
                    <div>
                      <Label className="text-base font-semibold">Activer la synchronisation</Label>
                      <p className="text-sm text-leather-gray mt-1">
                        Les commandes seront automatiquement envoyées à Google Sheets
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.googleSheets.enabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            googleSheets: { ...settings.googleSheets, enabled: e.target.checked },
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-leather-light/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-leather-brown"></div>
                    </label>
                  </div>

                  <div>
                    <Label htmlFor="spreadsheetId">ID du Google Sheet *</Label>
                    <Input
                      id="spreadsheetId"
                      value={settings.googleSheets.spreadsheetId}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          googleSheets: { ...settings.googleSheets, spreadsheetId: e.target.value },
                        })
                      }
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    />
                    <p className="text-sm text-leather-gray mt-1">
                      Trouvez l&apos;ID dans l&apos;URL de votre Google Sheet: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sheetName">Nom de la feuille</Label>
                    <Input
                      id="sheetName"
                      value={settings.googleSheets.sheetName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          googleSheets: { ...settings.googleSheets, sheetName: e.target.value },
                        })
                      }
                      placeholder="Orders"
                    />
                    <p className="text-sm text-leather-gray mt-1">
                      Nom de l&apos;onglet dans votre Google Sheet (par défaut: Orders)
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Structure du Google Sheet</h4>
                    <p className="text-sm text-yellow-800 mb-2">
                      Assurez-vous que votre Google Sheet a les colonnes suivantes (ligne 1):
                    </p>
                    <div className="text-xs font-mono bg-white p-2 rounded border border-yellow-300 text-yellow-900">
                      N° Commande | Date & Heure | Nom Client | Téléphone | Wilaya | Commune | Produit | Marque | Pointure | Couleur | Quantité | Frais de livraison | Total | Statut
                    </div>
                  </div>

                  {!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-1">Variables d&apos;environnement manquantes</h4>
                      <p className="text-sm text-red-800">
                        Les variables GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_PRIVATE_KEY ne sont pas configurées.
                        La synchronisation ne fonctionnera pas tant que ces variables ne sont pas définies.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="bg-leather-brown hover:bg-leather-coffee text-white"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}
            </Button>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
