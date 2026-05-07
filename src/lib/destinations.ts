export const POPULAR_DESTINATIONS = [
  { name: "Goa", emoji: "🏖️", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&h=400&fit=crop" },
  { name: "Manali", emoji: "🏔️", image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&h=400&fit=crop" },
  { name: "Hyderabad", emoji: "🕌", image: "https://images.unsplash.com/photo-1696520180849-30d9b5183c4f?w=600&h=400&fit=crop" },
  { name: "Vizag", emoji: "🌊", image: "https://images.unsplash.com/photo-1623766400166-9c5e1edaa5b1?w=600&h=400&fit=crop" },
  { name: "Ooty", emoji: "🌿", image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&h=400&fit=crop" },
  { name: "Kerala", emoji: "🛶", image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600&h=400&fit=crop" },
  { name: "Coorg", emoji: "☕", image: "https://images.unsplash.com/photo-1605649461784-edc01e9b9a51?w=600&h=400&fit=crop" },
  { name: "Ladakh", emoji: "⛰️", image: "https://images.unsplash.com/photo-1589793463357-5fa6df1f02fa?w=600&h=400&fit=crop" },
  { name: "Pondicherry", emoji: "🏝️", image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&h=400&fit=crop" },
  { name: "Hampi", emoji: "🗿", image: "https://images.unsplash.com/photo-1600100397470-2d1a90910f9e?w=600&h=400&fit=crop" },
  { name: "Jaipur", emoji: "🏰", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600&h=400&fit=crop" },
  { name: "Varanasi", emoji: "🪔", image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&h=400&fit=crop" },
];

export function imageForDestination(destination: string): string {
  const lc = destination.toLowerCase();
  const match = POPULAR_DESTINATIONS.find(d => lc.includes(d.name.toLowerCase()));
  return match?.image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop";
}
