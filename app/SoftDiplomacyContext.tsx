/* eslint-disable @next/next/no-img-element -- local game UI icons */

// Aircraft-only supplement. Never rewrite base-game rules in this component.
const airArticles = {
  Airport_SoftDiplomacy: { label: 'Airport', detail: 'Air trade, aircraft support, and rail connections.', icon: 'AirportIconWhite.svg' },
  Passenger_Plane: { label: 'Passenger plane', detail: 'Automatic airport-to-airport trade. Global limit: 800.', icon: 'AirTransportTriangleIconWhite.svg' },
  Fighter_Jet: { label: 'Fighter jet', detail: 'Aircraft combat, hijacking requirements, and airport repair.', icon: 'FighterPentagonIconWhite.svg' },
  Attack_Helicopter: { label: 'Attack helicopter', detail: 'Paid troop transport by air. Active limit: two per player.', icon: 'AirTransportTriangleIconWhite.svg' },
} as const;

type AirArticle = keyof typeof airArticles;
const relatedAirArticles: Record<string, readonly AirArticle[]> = {
  Buildings: ['Airport_SoftDiplomacy', 'Fighter_Jet', 'Attack_Helicopter', 'Passenger_Plane'],
  Controls: ['Airport_SoftDiplomacy', 'Fighter_Jet', 'Attack_Helicopter'],
  Gold: ['Passenger_Plane', 'Airport_SoftDiplomacy'],
  Trade: ['Passenger_Plane', 'Airport_SoftDiplomacy'],
  Port: ['Airport_SoftDiplomacy'],
  Railroad: ['Airport_SoftDiplomacy'],
  Train: ['Airport_SoftDiplomacy'],
  Factory: ['Airport_SoftDiplomacy'],
  Trade_Ship: ['Passenger_Plane'],
  Warship: ['Fighter_Jet'],
  Transport_Ship: ['Attack_Helicopter'],
  Troops: ['Attack_Helicopter'],
  Maps: ['Passenger_Plane', 'Fighter_Jet', 'Attack_Helicopter'],
  SAM_Launcher: ['Fighter_Jet'],
  Missile_Silo: ['Fighter_Jet'],
  Nuke: ['Fighter_Jet'],
  Atom_Bomb: ['Fighter_Jet'],
  Hydrogen_Bomb: ['Fighter_Jet'],
  MIRV: ['Fighter_Jet'],
};

export default function SoftDiplomacyContext({ slug }: { slug: string }) {
  const related = relatedAirArticles[slug];
  if (!related) return null;
  return (
    <section className="sd-context air-supplement" aria-label="Separate SoftDiplomacy air supplement">
      <header>
        <p className="eyebrow">SoftDiplomacy only / air supplement</p>
        <h2>Explore the air additions</h2>
        <p>These aircraft and airports are custom additions, not part of the OpenFront article above. Their documentation lists the air-specific rules and differences.</p>
      </header>
      <div className="sd-context-grid">
        {related.map((slug) => {
          const article = airArticles[slug];
          return <a key={slug} href={`#/article/${slug}`}>
            <img src={`/images/${article.icon}`} alt="" width="32" height="32" />
            <strong>{article.label}</strong>
            <p>{article.detail}</p>
            <i aria-hidden="true">↗</i>
          </a>;
        })}
      </div>
      {slug === 'Buildings' && <p className="air-supplement-note">Airport, Fighter Jet, and Attack Helicopter are purchasable air additions. Passenger planes spawn automatically; they are not purchase-menu items. Original wiki images above show OpenFront, not the mod.</p>}
    </section>
  );
}
