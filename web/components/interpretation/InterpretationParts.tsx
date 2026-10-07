import type { InterpretationPartsProps } from '../../types/props';

export function InterpretationParts({ parts }: InterpretationPartsProps) {
  return <dl className="interpretation-parts">{parts.map((part, index) => <div key={`${part.label}-${index}`}><dt>{part.label}</dt><dd>{part.value}</dd></div>)}</dl>;
}
