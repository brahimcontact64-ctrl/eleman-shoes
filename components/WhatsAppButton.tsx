'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { getSiteSettings } from '@/lib/siteSettings'

export default function WhatsAppButton(){

const [whatsapp,setWhatsapp] = useState<string>('')

useEffect(()=>{

const load = async()=>{

const settings = await getSiteSettings()

if(settings?.whatsappNumber){

setWhatsapp(settings.whatsappNumber)

}

}

load()

},[])

if(!whatsapp) return null

return(

<a
href={`https://wa.me/${whatsapp}`}
target="_blank"
rel="noopener noreferrer"
className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-50"
aria-label="Contact WhatsApp"
>

<MessageCircle className="h-6 w-6"/>

</a>

)

}