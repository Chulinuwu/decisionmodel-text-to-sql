import type { RefObject } from 'react';
import type { DatasetInfo, Interpretation, InterpretationPart, QueryResponse, Trace } from '../../shared/schema';
import type { AnsweredResponse, ChartData, ChatTurn, ChooseResponse, DatasetState, ExecuteInterpretation, ExecuteTurnOffer, QueryRequest, UnsupportedResponse } from './state';

export type IconName = 'arrow' | 'database' | 'chart' | 'table' | 'download' | 'copy';
export type IconProps = { name: IconName };
export type DatasetPanelProps = { state: DatasetState; retry: () => void };
export type QueryComposerProps = {
  question: string; onChange: (value: string) => void; onSubmit: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>; loading: boolean; disabled: boolean;
};
export type LoadingStateProps = { request: QueryRequest; onCancel: () => void };
export type QueryErrorProps = { request: QueryRequest; message: string; disabled: boolean; onRetry: () => void };
export type QueryDetailsProps = { response: QueryResponse };
export type TraceListProps = { trace: Trace[] };
export type ResultChartProps = { data: ChartData };
export type ResultTableProps = { response: AnsweredResponse; question: string };
export type ChatThreadProps = { turns: ChatTurn[]; dataset?: DatasetInfo; disabled: boolean; onExecute: ExecuteTurnOffer; onCancel: () => void; onRetry: (turn: ChatTurn) => void };
export type ChatTurnItemProps = Omit<ChatThreadProps, 'turns'> & { turn: ChatTurn };
export type AnswerBubbleProps = { response: AnsweredResponse; dataset?: DatasetInfo; disabled: boolean; onExecute: ExecuteInterpretation };
export type ResultCardProps = { response: AnsweredResponse; question: string };
export type InterpretationPartsProps = { parts: InterpretationPart[] };
export type InterpretationPanelProps = { response: AnsweredResponse; dataset?: DatasetInfo };
export type AlternativeListProps = { alternatives: Interpretation[]; disabled: boolean; onExecute: ExecuteInterpretation };
export type InterpretationOptionProps = { interpretation: Interpretation; disabled: boolean; onExecute: ExecuteInterpretation };
export type ChooseCardProps = { response: ChooseResponse; disabled: boolean; onExecute: ExecuteInterpretation };
export type UnsupportedCardProps = { response: UnsupportedResponse };
