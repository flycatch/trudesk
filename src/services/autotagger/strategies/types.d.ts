
export type StrategyTypes = 
  'top-n' |
  'threshold' |
  'top-percent'

export type StrategyResponse = {
    labels: string[]
}

export type Strategy<T extends StrategyOptions = StrategyOptions> = {
    decide: (labels: string[], scores: number[], options?: T) => StrategyResponse
}

export interface StrategyOptions { }

export interface ThresholdStrategyOptions extends StrategyOptions {
    minimumThreshold?: number;
    maximumThreshold?: number;
}

export interface TopPercentStrategyOptions extends StrategyOptions {
    percentage: number
}

export interface TopNearestStrategyOptions extends StrategyOptions {
    delta: number
    selectTop: boolean
}

export interface TopNStrategyOptions extends StrategyOptions {
    count: number
}

