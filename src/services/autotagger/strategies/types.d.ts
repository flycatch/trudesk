
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
    /** The minimum score labels should have */
    minimumThreshold?: number;
    /** The maximum score labels should have */
    maximumThreshold?: number;
}

export interface TopPercentStrategyOptions extends StrategyOptions {
    /** The percentage of lables to select */
    percentage: number
}

export interface TopNearestStrategyOptions extends StrategyOptions {
    delta: number
    selectTop: boolean
}

export interface TopNStrategyOptions extends StrategyOptions {
    /** The no:of top labels to select */
    count: number
}

