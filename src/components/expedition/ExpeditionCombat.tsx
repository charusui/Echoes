import { StandardCombat, type ExpeditionCombatProps } from './StandardCombat';
import { WakwakBossCombat } from './WakwakBossCombat';
import SantelmoBossBattle from './SantelmoBossBattle';

export type { TurnUpdateInfo } from './useCombatEngine';

export function ExpeditionCombat(props: ExpeditionCombatProps) {
  const isWakwak = props.enemyId === 'wakwak' || (props.enemyGauntlet && props.enemyGauntlet.includes('wakwak'));
  const isSantelmo = props.enemyId === 'santelmo' || (props.enemyGauntlet && props.enemyGauntlet.includes('santelmo'));
  
  if (isSantelmo) {
    return (
      <SantelmoBossBattle 
        party={props.party}
        bossName="Santelmo" 
        dex={props.dex}
        onComplete={(result) => {
          props.onCombatResult(result);
        }} 
        onFlee={props.onFlee}
      />
    );
  }

  if (isWakwak) {
    return <WakwakBossCombat {...props} />;
  }
  return <StandardCombat {...props} />;
}
