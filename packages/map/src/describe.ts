import type { RouteStep } from './types';

/** English text for a route step, e.g. "Go straight 20 m" or "Take Stairs B up to floor 3". */
export function describeStep(step: RouteStep, arrivalTitle?: string): string {
  switch (step.kind) {
    case 'straight':
      return `Go straight ${step.distanceM} m`;
    case 'turn':
      return step.direction === 'back' ? 'Turn around' : `Turn ${step.direction}`;
    case 'changeFloor': {
      const via = step.label ?? (step.via === 'elevator' ? 'the elevator' : 'the stairs');
      return `Take ${via} ${step.up ? 'up' : 'down'} to floor ${step.toLevel}`;
    }
    case 'arrive':
      return arrivalTitle ? `Arrive at ${arrivalTitle}` : 'Arrive at your destination';
  }
}
