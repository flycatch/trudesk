
export type StrategyTypes = 
  'highest-score' |
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

export interface HighestScoreStrategyOptions extends StrategyOptions {
    /** Defines the no:of higest score entries to select */
    count: number
}

