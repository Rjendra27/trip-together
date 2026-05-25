export const POPULAR_DESTINATIONS = [
  { 
    name: "Goa", 
    emoji: "🏖️", 
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2",
    travelers: "1.5K travelers",
    rating: "4.7"
  },
  { 
    name: "Manali", 
    emoji: "🏔️", 
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23",
    travelers: "980 travelers",
    rating: "4.6"
  },
  { 
    name: "Hyderabad", 
    emoji: "🕌", 
    image: "https://images.unsplash.com/photo-1607348988049-05a0d3dd63df",
    travelers: "1.1K travelers",
    rating: "4.5"
  },
  { 
    name: "Vizag", 
    emoji: "🌊", 
    image: "https://images.unsplash.com/photo-1545558014-8692077e9b5c",
    travelers: "850 travelers",
    rating: "4.4"
  },
  { 
    name: "Ooty", 
    emoji: "🌿", 
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a",
    travelers: "720 travelers",
    rating: "4.5"
  },
  { 
    name: "Kerala", 
    emoji: "🛶", 
    image: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2",
    travelers: "1.3K travelers",
    rating: "4.8"
  },
  { 
    name: "Coorg", 
    emoji: "☕", 
    image: "https://images.unsplash.com/photo-1504215680853-026ed2a45def",
    travelers: "640 travelers",
    rating: "4.6"
  },
  { 
    name: "Ladakh", 
    emoji: "⛰️", 
    image: "https://images.unsplash.com/photo-1528127269322-539801943592",
    travelers: "1.2K travelers",
    rating: "4.9"
  },
  { 
    name: "Pondicherry", 
    emoji: "🏝️", 
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220",
    travelers: "890 travelers",
    rating: "4.6"
  },
  { 
    name: "Hampi", 
    emoji: "🗿", 
    image: "https://images.unsplash.com/photo-1616606484004-5ef3cc46e39d",
    travelers: "540 travelers",
    rating: "4.7"
  },
  { 
    name: "Jaipur", 
    emoji: "🏰", 
    image: "https://images.unsplash.com/photo-1599661046289-e31897846e41",
    travelers: "1.1K travelers",
    rating: "4.7"
  },
  { 
    name: "Varanasi", 
    emoji: "🪔", 
    image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc",
    travelers: "1.4K travelers",
    rating: "4.8"
  },
];

export function imageForDestination(destination: string): string {
  const lc = destination.toLowerCase();
  const match = POPULAR_DESTINATIONS.find(d => lc.includes(d.name.toLowerCase()));
  const baseImage = match?.image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828";
  return `${baseImage}?auto=format&fit=crop&w=600&h=400&q=80`;
}
