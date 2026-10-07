import type { RefObject } from 'react';
import type { DatasetInfo, Interpretation, InterpretationPart, QueryResponse, Trace } from '../../shared/schema';
import type { AnsweredResponse, ChartData, ChooseResponse, DatasetState, ExecuteInterpretation, ExecuteOffer, QueryRequest, UnsupportedResponse } from './state';

export type IconName = 'arrow' | 'database' | 'chart' | 'table' | 'download' | 'copy';
export type IconProps = { name: IconName };
export type AppHeaderProps = { showDataset: boolean; onToggleDataset: () => void };
export type DatasetPanelProps = { state: DatasetState; retry: () => void };
export type QueryComposerProps = {
  question: string; onChange: (value: string) => void; onEdit: (value: string) => void; onSubmit: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>; loading: boolean; disabled: boolean;
};
export type LoadingStateProps = { request: QueryRequest; onCancel: () => void };
export type QueryErrorProps = { request: QueryRequest; message: string; disabled: boolean; onRetry: (request: QueryRequest) => void };
export type QueryDetailsProps = { response: QueryResponse };
export type TraceListProps = { trace: Trace[] };
export type ResultChartProps = { data: ChartData };
export type ResultTableProps = { response: AnsweredResponse; question: string };
export type ResultsPanelProps = { response: QueryResponse; question: string; dataset?: DatasetInfo; onExecute: ExecuteOffer };
export type ResultCardProps = { response: AnsweredResponse; question: string };
export type InterpretationPartsProps = { parts: InterpretationPart[] };
export type InterpretationPanelProps = { response: AnsweredResponse; dataset?: DatasetInfo; onExecute: ExecuteInterpretation };
export type AlternativeListProps = { alternatives: Interpretation[]; onExecute: ExecuteInterpretation };
export type InterpretationOptionProps = { interpretation: Interpretation; onExecute: ExecuteInterpretation };
export type ChooseCardProps = { response: ChooseResponse; onExecute: ExecuteInterpretation };
export type UnsupportedCardProps = { response: UnsupportedResponse };
