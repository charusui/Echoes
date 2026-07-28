import { StandardCombat, type ExpeditionCombatProps } from './StandardCombat';
import { WakwakBossCombat } from './WakwakBossCombat';

export type { TurnUpdateInfo } from './useCombatEngine';

export function ExpeditionCombat(props: ExpeditionCombatProps) {
  const isWakwak = props.enemyId === 'wakwak' || (props.enemyGauntlet && props.enemyGauntlet.includes('wakwak'));
  
  if (isWakwak) {
    return <WakwakBossCombat {...props} />;
  }
  return <StandardCombat {...props} />;
}
